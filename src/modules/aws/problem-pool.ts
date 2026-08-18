import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
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
      ProjectionExpression: "sk",
      Limit: limit,
    }),
  );
  return (result.Items ?? []).map((item) =>
    String(item.sk).slice(problemPrefix.length),
  );
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

/** Drops a pooled problem that no longer parses against the current schema. */
export async function evictPooledProblem(cell: PoolCell, problemId: string) {
  await client.send(
    new DeleteCommand({
      TableName: workspaceTable,
      Key: { pk: poolKey(cell), sk: `${problemPrefix}${problemId}` },
    }),
  );
}

export async function getSeenIds(userId: string, cell: PoolCell) {
  const result = await client.send(
    new GetCommand({
      TableName: workspaceTable,
      Key: { pk: `USER#${userId}`, sk: seenKey(cell) },
    }),
  );
  const ids = result.Item?.problemIds as Set<string> | string[] | undefined;
  if (!ids) return [];
  return Array.isArray(ids) ? ids : [...ids];
}

/**
 * Recorded as a set addition rather than a read-modify-write, so two sessions
 * claiming at once cannot drop each other's history.
 */
export async function markSeen(
  userId: string,
  cell: PoolCell,
  problemId: string,
) {
  await client.send(
    new UpdateCommand({
      TableName: workspaceTable,
      Key: { pk: `USER#${userId}`, sk: seenKey(cell) },
      UpdateExpression:
        "SET updatedAt = :now, expiresAt = :expiresAt ADD problemIds :id",
      ExpressionAttributeValues: {
        ":id": new Set([problemId]),
        ":now": new Date().toISOString(),
        ":expiresAt": epochIn(SEEN_RETENTION_DAYS),
      },
    }),
  );
}

/**
 * One refill per cell at a time.
 *
 * Without this, a burst of requests against a cold cell would each start their
 * own generation and pay for the same problems several times over. The lock
 * carries its own expiry because a serverless invocation can vanish between
 * taking it and releasing it; TTL deletion is too lazy to rely on, so the
 * condition compares the timestamp itself.
 */
export async function acquireRefillLock(cell: PoolCell, holdSeconds = 300) {
  const now = Math.floor(Date.now() / 1000);
  try {
    await client.send(
      new PutCommand({
        TableName: workspaceTable,
        Item: {
          pk: poolKey(cell),
          sk: "LOCK",
          heldUntil: now + holdSeconds,
          expiresAt: now + holdSeconds,
        },
        ConditionExpression: "attribute_not_exists(pk) OR heldUntil < :now",
        ExpressionAttributeValues: { ":now": now },
      }),
    );
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    )
      return false;
    throw error;
  }
}

export async function releaseRefillLock(cell: PoolCell) {
  await client.send(
    new DeleteCommand({
      TableName: workspaceTable,
      Key: { pk: poolKey(cell), sk: "LOCK" },
    }),
  );
}
