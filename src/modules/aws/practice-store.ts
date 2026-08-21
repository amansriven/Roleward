import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  practiceAttemptSchema,
  type PracticeAttempt,
} from "@/modules/zed/schema";
import { awsRegion, workspaceTable } from "./config";

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: awsRegion }),
  { marshallOptions: { removeUndefinedValues: true } },
);

const attemptPrefix = "ATTEMPT#";
const key = (userId: string, problemId: string) =>
  ({ pk: `USER#${userId}`, sk: `${attemptPrefix}${problemId}` }) as const;

/** Practice history is the dashboard's only real number; keep it a long time. */
const RETENTION_DAYS = 365;

export async function getAttempt(userId: string, problemId: string) {
  const result = await client.send(
    new GetCommand({ TableName: workspaceTable, Key: key(userId, problemId) }),
  );
  if (!result.Item) return null;
  const parsed = practiceAttemptSchema.safeParse(result.Item.attempt);
  return parsed.success ? parsed.data : null;
}

export async function putAttempt(userId: string, attempt: PracticeAttempt) {
  await client.send(
    new PutCommand({
      TableName: workspaceTable,
      Item: {
        ...key(userId, attempt.problemId),
        attempt,
        updatedAt: new Date().toISOString(),
        expiresAt:
          Math.floor(Date.now() / 1000) + RETENTION_DAYS * 24 * 60 * 60,
      },
    }),
  );
  return attempt;
}

export async function listAttempts(userId: string, limit = 200) {
  const result = await client.send(
    new QueryCommand({
      TableName: workspaceTable,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":prefix": attemptPrefix,
      },
      Limit: limit,
    }),
  );
  return (result.Items ?? []).flatMap((item) => {
    const parsed = practiceAttemptSchema.safeParse(item.attempt);
    return parsed.success ? [parsed.data] : [];
  });
}
