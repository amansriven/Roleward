import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import type { WorkspaceSnapshot } from "@/modules/workspace/repository";
import { awsRegion, workspaceTable } from "./config";

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: awsRegion }),
  { marshallOptions: { removeUndefinedValues: true } },
);

interface WorkspaceItem {
  pk: string;
  sk: "WORKSPACE";
  version: number;
  workspace: WorkspaceSnapshot;
  updatedAt: string;
}

const key = (userId: string) =>
  ({ pk: `USER#${userId}`, sk: "WORKSPACE" }) as const;

export async function getWorkspace(userId: string) {
  const result = await client.send(
    new GetCommand({ TableName: workspaceTable, Key: key(userId) }),
  );
  return (result.Item as WorkspaceItem | undefined) ?? null;
}

export async function putWorkspace(
  userId: string,
  workspace: WorkspaceSnapshot,
  expectedVersion: number,
) {
  const item: WorkspaceItem = {
    ...key(userId),
    version: expectedVersion + 1,
    workspace,
    updatedAt: new Date().toISOString(),
  };
  await client.send(
    new PutCommand({
      TableName: workspaceTable,
      Item: item,
      ConditionExpression:
        expectedVersion === 0
          ? "attribute_not_exists(#version)"
          : "#version = :expectedVersion",
      ExpressionAttributeNames: { "#version": "version" },
      ExpressionAttributeValues:
        expectedVersion === 0
          ? undefined
          : { ":expectedVersion": expectedVersion },
    }),
  );
  return item;
}
