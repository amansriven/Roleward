import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  generatedProblemSchema,
  type GeneratedProblem,
} from "@/modules/guru/schema";
import type { PoolCell } from "@/modules/guru/pool-policy";
import { awsRegion, workspaceTable } from "./config";

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: awsRegion }),
  { marshallOptions: { removeUndefinedValues: true } },
);

/**
 * Everything here is Query, GetItem, and PutItem, deliberately.
 *
 * The Vercel IAM user cannot delete or update items, and that is worth keeping:
 * a leaked deploy key that can destroy a candidate's history is a far worse
 * outcome than the small amount of bookkeeping avoiding it costs. So the lock
 * is released by writing an expired one, discarded pool entries are tombstoned
 * for TTL to collect, and the seen set uses the same conditional-write
 * concurrency the workspace store already uses.
 */
const isConditionFailure = (error: unknown) =>
  error instanceof Error && error.name === "ConditionalCheckFailedException";

/**
 * The pool is shared, so its partition is the archetype and difficulty rather
 * than a user. A pooled problem is lent, not consumed: it stays after being
 * served, and the per-user seen set is what stops anyone getting it twice.
 */
const poolKey = (cell: PoolCell) => `POOL#${cell}`;
const problemPrefix = "PROBLEM#";
const seenKey = (cell: PoolCell) => `SEEN#${cell}`;

/** Long enough to be worth pre-generating, short enough to keep rotating. */
const POOL_RETENTION_DAYS = 90;
const SEEN_RETENTION_DAYS = 365;
const epochIn = (days: number) =>
  Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;

interface PooledItem {
  pk: string;
  sk: string;
  problem: GeneratedProblem;
  createdAt: string;
  expiresAt: number;
}

export async function putPooledProblem(
  cell: PoolCell,
  problem: GeneratedProblem,
) {
  await client.send(
    new PutCommand({
      TableName: workspaceTable,
      Item: {
        pk: poolKey(cell),
        sk: `${problemPrefix}${problem.id}`,
        problem,
        createdAt: new Date().toISOString(),
        expiresAt: epochIn(POOL_RETENTION_DAYS),
      } satisfies PooledItem,
    }),
  );
  return problem;
}

/**
 * Ids only. The problems themselves carry solutions and hidden tests, so
 * fetching a whole cell to pick one from it would be several hundred kilobytes
 * read to use one of them.
 */
export async function listPooledIds(cell: PoolCell, limit = 100) {
  const result = await client.send(
    new QueryCommand({
      TableName: workspaceTable,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": poolKey(cell),
        ":prefix": problemPrefix,
      },
      ProjectionExpression: "sk, tombstone",
      Limit: limit,
    }),
  );
  return (result.Items ?? [])
    .filter((item) => !item.tombstone)
    .map((item) => String(item.sk).slice(problemPrefix.length));
}

export async function getPooledProblem(cell: PoolCell, problemId: string) {
  const result = await client.send(
    new GetCommand({
      TableName: workspaceTable,
      Key: { pk: poolKey(cell), sk: `${problemPrefix}${problemId}` },
    }),
  );
  const item = result.Item as PooledItem | undefined;
  if (!item) return null;
  const parsed = generatedProblemSchema.safeParse(item.problem);
  return parsed.success ? parsed.data : null;
}

/**
 * Retires a pooled problem that no longer parses against the current schema.
 *
 * Tombstoned rather than deleted: the marker takes it out of circulation
 * immediately, and TTL collects the row on its own schedule.
 */
export async function evictPooledProblem(cell: PoolCell, problemId: string) {
  await client.send(
    new PutCommand({
      TableName: workspaceTable,
      Item: {
        pk: poolKey(cell),
        sk: `${problemPrefix}${problemId}`,
        tombstone: true,
        expiresAt: epochIn(1),
      },
    }),
  );
}

/** Oldest ids fall off first; a candidate will not remember that far back. */
const SEEN_LIMIT = 500;
/** Concurrent claims in one cell are rare, so a couple of retries is plenty. */
const SEEN_WRITE_ATTEMPTS = 3;

interface SeenRecord {
  problemIds: string[];
  version: number;
}

async function readSeen(userId: string, cell: PoolCell): Promise<SeenRecord> {
  const result = await client.send(
    new GetCommand({
      TableName: workspaceTable,
      Key: { pk: `USER#${userId}`, sk: seenKey(cell) },
    }),
  );
  const item = result.Item as Partial<SeenRecord> | undefined;
  return {
    problemIds: Array.isArray(item?.problemIds) ? item.problemIds : [],
    version: typeof item?.version === "number" ? item.version : 0,
  };
}

export async function getSeenIds(userId: string, cell: PoolCell) {
  return (await readSeen(userId, cell)).problemIds;
}

/**
 * Records that a candidate has been given a problem.
 *
 * Version-guarded, so two sessions claiming from the same cell at once cannot
 * drop each other's history — the loser re-reads and rewrites rather than
 * overwriting a record it never saw.
 */
export async function markSeen(
  userId: string,
  cell: PoolCell,
  problemId: string,
) {
  for (let attempt = 0; attempt < SEEN_WRITE_ATTEMPTS; attempt += 1) {
    const current = await readSeen(userId, cell);
    if (current.problemIds.includes(problemId)) return;
    try {
      await client.send(
        new PutCommand({
          TableName: workspaceTable,
          Item: {
            pk: `USER#${userId}`,
            sk: seenKey(cell),
            problemIds: [...current.problemIds, problemId].slice(-SEEN_LIMIT),
            version: current.version + 1,
            updatedAt: new Date().toISOString(),
            expiresAt: epochIn(SEEN_RETENTION_DAYS),
          },
          ConditionExpression:
            current.version === 0
              ? "attribute_not_exists(pk)"
              : "version = :expected",
          ExpressionAttributeValues:
            current.version === 0
              ? undefined
              : { ":expected": current.version },
        }),
      );
      return;
    } catch (error) {
      if (!isConditionFailure(error)) throw error;
    }
  }
  // Losing the race three times means the id may go unrecorded and the problem
  // could be offered again. A repeat is a far smaller cost than a failed claim.
  console.warn("guru pool: seen record contended", { cell });
}

/**
 * One refill per cell at a time.
 *
 * Without this, a burst of requests against a cold cell would each start their
 * own generation and pay for the same problems several times over. The lock
 * carries its own expiry because a serverless invocation can vanish between
 * taking it and releasing it; TTL deletion is too lazy to rely on, so the
 * condition compares the timestamp itself.
 *
 * Returns the holder token needed to release it.
 */
export async function acquireRefillLock(cell: PoolCell, holdSeconds = 300) {
  const now = Math.floor(Date.now() / 1000);
  const holder = crypto.randomUUID();
  try {
    await client.send(
      new PutCommand({
        TableName: workspaceTable,
        Item: {
          pk: poolKey(cell),
          sk: "LOCK",
          holder,
          heldUntil: now + holdSeconds,
          expiresAt: now + holdSeconds + 24 * 60 * 60,
        },
        ConditionExpression: "attribute_not_exists(pk) OR heldUntil < :now",
        ExpressionAttributeValues: { ":now": now },
      }),
    );
    return holder;
  } catch (error) {
    if (isConditionFailure(error)) return null;
    throw error;
  }
}

/**
 * Releases by writing an already-expired lock rather than deleting one, since
 * the deploy key has no delete permission and should not acquire one.
 *
 * Conditional on still being the holder: a refill that overran its hold has
 * already lost the lock, and clearing whoever took it next would let two
 * refills generate the same cell at once.
 */
export async function releaseRefillLock(cell: PoolCell, holder: string) {
  try {
    await client.send(
      new PutCommand({
        TableName: workspaceTable,
        Item: {
          pk: poolKey(cell),
          sk: "LOCK",
          holder: null,
          heldUntil: 0,
          expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        },
        ConditionExpression: "holder = :holder",
        ExpressionAttributeValues: { ":holder": holder },
      }),
    );
  } catch (error) {
    if (!isConditionFailure(error)) throw error;
  }
}
