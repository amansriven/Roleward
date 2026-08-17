import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  interviewSessionSchema,
  type InterviewSession,
} from "@/modules/interviews/schema";
import { awsRegion, workspaceTable } from "./config";

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: awsRegion }),
  { marshallOptions: { removeUndefinedValues: true } },
);

const interviewPrefix = "INTERVIEW#";
const key = (userId: string, interviewId: string) =>
  ({ pk: `USER#${userId}`, sk: `${interviewPrefix}${interviewId}` }) as const;

interface InterviewItem {
  pk: string;
  sk: string;
  session: InterviewSession;
  updatedAt: string;
}

export async function getInterview(userId: string, interviewId: string) {
  const result = await client.send(
    new GetCommand({
      TableName: workspaceTable,
      Key: key(userId, interviewId),
    }),
  );
  const item = result.Item as InterviewItem | undefined;
  if (!item) return null;
  return interviewSessionSchema.parse(item.session);
}

export async function putInterview(userId: string, session: InterviewSession) {
  const item: InterviewItem = {
    ...key(userId, session.id),
    session,
    updatedAt: new Date().toISOString(),
  };
  await client.send(new PutCommand({ TableName: workspaceTable, Item: item }));
  return session;
}

export async function listInterviews(userId: string, limit = 25) {
  const result = await client.send(
    new QueryCommand({
      TableName: workspaceTable,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":prefix": interviewPrefix,
      },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (result.Items ?? []).flatMap((raw) => {
    const parsed = interviewSessionSchema.safeParse(
      (raw as InterviewItem).session,
    );
    return parsed.success ? [parsed.data] : [];
  });
}
