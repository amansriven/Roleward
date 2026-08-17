import "server-only";

import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY ?? "";

export const interviewsConfigured = Boolean(apiKey);
export const INTERVIEW_MODEL =
  process.env.OPENAI_INTERVIEW_MODEL || "gpt-4.1-mini";
export const REALTIME_MODEL =
  process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1";

let client: OpenAI | null = null;
export function openai() {
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  client ??= new OpenAI({ apiKey });
  return client;
}

/** Raw key access, only for the Realtime client-secret mint. */
export function openaiApiKey() {
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return apiKey;
}
