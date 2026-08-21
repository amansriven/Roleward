import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  generatedProblemSchema,
  type GeneratedProblem,
} from "@/modules/zed/schema";
import { awsRegion, workspaceTable } from "./config";

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: awsRegion }),
  { marshallOptions: { removeUndefinedValues: true } },
);

const problemPrefix = "PROBLEM#";
const key = (userId: string, problemId: string) =>
  ({ pk: `USER#${userId}`, sk: `${problemPrefix}${problemId}` }) as const;

interface ProblemItem {
  pk: string;
  sk: string;
  problem: GeneratedProblem;
  createdAt: string;
  /** Generated problems are disposable; expiry keeps the table from growing. */
  expiresAt: number;
}

const RETENTION_DAYS = 30;

export async function putProblem(userId: string, problem: GeneratedProblem) {
  const createdAt = new Date().toISOString();
  await client.send(
    new PutCommand({
      TableName: workspaceTable,
      Item: {
        ...key(userId, problem.id),
        problem,
        createdAt,
        expiresAt:
          Math.floor(Date.now() / 1000) + RETENTION_DAYS * 24 * 60 * 60,
      } satisfies ProblemItem,
    }),
  );
  return problem;
}

/** Scoped to the caller, so one user cannot fetch another's hidden tests. */
export async function getProblem(userId: string, problemId: string) {
  const result = await client.send(
    new GetCommand({
      TableName: workspaceTable,
      Key: key(userId, problemId),
    }),
  );
  const item = result.Item as ProblemItem | undefined;
  if (!item) return null;
  const parsed = generatedProblemSchema.safeParse(item.problem);
  return parsed.success ? parsed.data : null;
}
