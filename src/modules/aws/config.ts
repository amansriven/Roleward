import "server-only";

export const awsRegion = process.env.AWS_REGION || "us-east-2";
export const workspaceTable = process.env.AWS_DYNAMODB_TABLE || "";
export const uploadBucket = process.env.AWS_UPLOAD_BUCKET || "";

export const workspaceStorageConfigured = Boolean(workspaceTable);
export const uploadStorageConfigured = Boolean(uploadBucket);
