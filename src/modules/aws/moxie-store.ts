import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { moxieMemorySchema, type MoxieMemory } from "@/modules/moxie/memory";
import { moxieGoalSchema, type MoxieGoal } from "@/modules/moxie/goal";
import { awsRegion, workspaceTable } from "./config";

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: awsRegion }),
  { marshallOptions: { removeUndefinedValues: true } },
);

const memoryPrefix = "MOXIEMEM#";
const key = (userId: string, memoryId: string) =>
  ({ pk: `USER#${userId}`, sk: `${memoryPrefix}${memoryId}` }) as const;

export async function putMemory(userId: string, memory: MoxieMemory) {
  await client.send(
    new PutCommand({
      TableName: workspaceTable,
      Item: {
        ...key(userId, memory.id),
        memory,
        updatedAt: new Date().toISOString(),
      },
    }),
  );
  return memory;
}

/** Returns every stored record, withdrawn ones included, newest last. */
export async function listMemories(userId: string, limit = 200) {
  const result = await client.send(
    new QueryCommand({
      TableName: workspaceTable,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":prefix": memoryPrefix,
      },
      Limit: limit,
    }),
  );
  return (result.Items ?? [])
    .flatMap((item) => {
      const parsed = moxieMemorySchema.safeParse(item.memory);
      return parsed.success ? [parsed.data] : [];
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getMemory(userId: string, memoryId: string) {
  const memories = await listMemories(userId);
  return memories.find((memory) => memory.id === memoryId) ?? null;
}

const goalPrefix = "MOXIEGOAL#";
const goalKey = (userId: string, goalId: string) =>
  ({ pk: `USER#${userId}`, sk: `${goalPrefix}${goalId}` }) as const;

export async function putGoal(userId: string, goal: MoxieGoal) {
  await client.send(
    new PutCommand({
      TableName: workspaceTable,
      Item: {
        ...goalKey(userId, goal.id),
        goal,
        updatedAt: new Date().toISOString(),
      },
    }),
  );
  return goal;
}

export async function listGoals(userId: string, limit = 100) {
  const result = await client.send(
    new QueryCommand({
      TableName: workspaceTable,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":prefix": goalPrefix,
      },
      Limit: limit,
    }),
  );
  return (result.Items ?? []).flatMap((item) => {
    const parsed = moxieGoalSchema.safeParse(item.goal);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function getGoal(userId: string, goalId: string) {
  const goals = await listGoals(userId);
  return goals.find((goal) => goal.id === goalId) ?? null;
}

export async function deleteGoal(userId: string, goalId: string) {
  await client.send(
    new DeleteCommand({
      TableName: workspaceTable,
      Key: goalKey(userId, goalId),
    }),
  );
}
