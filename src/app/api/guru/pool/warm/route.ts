import { NextResponse } from "next/server";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import {
  executionConfigured,
  lambdaExecutionAdapter,
} from "@/modules/execution/lambda-adapter";
import { warmShallowestCell } from "@/modules/guru/pool";
import { interviewsConfigured } from "@/modules/interviews/openai";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Left free so the generation in flight can store what it produced. */
const RESERVE_MS = 10_000;

const cronSecret = process.env.CRON_SECRET || "";

/**
 * Fills the shallowest pool cell. Invoked on a schedule (see vercel.json), not
 * by anything a candidate does — this is the pre-generation that keeps the
 * first request into a cell from paying for it.
 */
export async function GET(request: Request) {
  // Vercel Cron presents the secret as a bearer token. Without one configured
  // the endpoint stays shut rather than falling open.
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (
    !interviewsConfigured ||
    !executionConfigured ||
    !workspaceStorageConfigured
  )
    return NextResponse.json(
      { error: "The pool is not configured", code: "unconfigured" },
      { status: 503 },
    );

  const deadline = Date.now() + maxDuration * 1000 - RESERVE_MS;
  try {
    const result = await warmShallowestCell(lambdaExecutionAdapter, deadline);
    return NextResponse.json(result);
  } catch (error) {
    console.error("guru pool warm failed", error);
    return NextResponse.json(
      { error: "Warming failed", code: "warm_failed" },
      { status: 502 },
    );
  }
}
