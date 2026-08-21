import "server-only";

import { z } from "zod";

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(
  blankToUndefined,
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(blankToUndefined, z.url().optional());

const serverEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  OPENAI_API_KEY: optionalString,
  AWS_REGION: z.preprocess(
    blankToUndefined,
    z.string().min(1).default("us-east-1"),
  ),
  AWS_S3_BUCKET: optionalString,
  AWS_SQS_QUEUE_URL: optionalUrl,
  DATABASE_URL: optionalUrl,
  COGNITO_USER_POOL_ID: optionalString,
  COGNITO_CLIENT_ID: optionalString,
  E2B_API_KEY: optionalString,
  RESEND_API_KEY: optionalString,
  FEEDBACK_TO_EMAIL: z.preprocess(blankToUndefined, z.email().optional()),
  FEEDBACK_FROM_EMAIL: z.preprocess(
    blankToUndefined,
    z.string().min(1).default("Roleward Feedback <feedback@roleward.org>"),
  ),
  NEXT_PUBLIC_APP_URL: z.preprocess(
    blankToUndefined,
    z.url().default("http://localhost:3000"),
  ),
});

export const env = serverEnvironmentSchema.parse(process.env);
