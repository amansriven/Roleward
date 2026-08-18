import "server-only";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { portfolioSchema, type Portfolio } from "@/modules/portfolio/schema";
import { awsRegion, workspaceTable } from "./config";

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: awsRegion }),
  { marshallOptions: { removeUndefinedValues: true } },
);

/**
 * Handles are their own partition so the public page is a single read by URL,
 * with no index and no scan.
 */
const handleKey = (handle: string) =>
  ({ pk: `PORTFOLIO#${handle}`, sk: "PROFILE" }) as const;

/** A pointer back, so the owner's dashboard knows which handle is theirs. */
const ownerKey = (userId: string) =>
  ({ pk: `USER#${userId}`, sk: "PORTFOLIO" }) as const;

export async function getPortfolioByHandle(handle: string) {
  const result = await client.send(
    new GetCommand({ TableName: workspaceTable, Key: handleKey(handle) }),
  );
  if (!result.Item) return null;
  const parsed = portfolioSchema.safeParse(result.Item.portfolio);
  return parsed.success ? parsed.data : null;
}

export async function getPortfolioForUser(userId: string) {
  const result = await client.send(
    new GetCommand({ TableName: workspaceTable, Key: ownerKey(userId) }),
  );
  const handle = result.Item?.handle as string | undefined;
  if (!handle) return null;
  return getPortfolioByHandle(handle);
}

/**
 * Takes a handle for this user, or fails if someone else already holds it.
 *
 * The condition is what makes handle derivation safe: two people called Jane
 * Okonkwo both resolve to the same slug, and the second write loses rather than
 * silently taking over the first one's page.
 */
export async function claimHandle(handle: string, userId: string) {
  try {
    await client.send(
      new PutCommand({
        TableName: workspaceTable,
        Item: { ...handleKey(handle), reservedBy: userId },
        ConditionExpression:
          "attribute_not_exists(pk) OR reservedBy = :userId OR portfolio.userId = :userId",
        ExpressionAttributeValues: { ":userId": userId },
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

export async function putPortfolio(portfolio: Portfolio) {
  await client.send(
    new PutCommand({
      TableName: workspaceTable,
      Item: { ...handleKey(portfolio.handle), portfolio },
    }),
  );
  await client.send(
    new PutCommand({
      TableName: workspaceTable,
      Item: { ...ownerKey(portfolio.userId), handle: portfolio.handle },
    }),
  );
  return portfolio;
}
