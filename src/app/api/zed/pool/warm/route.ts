import { NextResponse } from "next/server";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import {
  executionConfigured,
  lambdaExecutionAdapter,
} from "@/modules/execution/lambda-adapter";
import { refillCell, warmShallowestCell } from "@/modules/zed/pool";
import { findArchetype } from "@/modules/zed/archetypes";
import { POOL_TARGET } from "@/modules/zed/pool-policy";
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

  // A named cell can be filled directly, which is how a newly added archetype
  // gets proven without waiting for the rotation to reach it.
  const url = new URL(request.url);
  const archetypeId = url.searchParams.get("archetype");
  const difficulty = url.searchParams.get("difficulty") ?? "medium";

  try {
    if (archetypeId) {
      if (!findArchetype(archetypeId))
        return NextResponse.json(
          { error: `Unknown archetype: ${archetypeId}` },
          { status: 400 },
        );
      if (
        difficulty !== "easy" &&
        difficulty !== "medium" &&
        difficulty !== "hard"
      )
        return NextResponse.json(
          { error: `Unknown difficulty: ${difficulty}` },
          { status: 400 },
        );
      const report = await refillCell(
        lambdaExecutionAdapter,
        archetypeId,
        difficulty,
        POOL_TARGET,
        deadline,
      );
      return NextResponse.json({ archetypeId, difficulty, ...report });
    }
    const result = await warmShallowestCell(lambdaExecutionAdapter, deadline);
    return NextResponse.json(result);
  } catch (error) {
    console.error("zed pool warm failed", error);
    return NextResponse.json(
      { error: "Warming failed", code: "warm_failed", detail: String(error) },
      { status: 502 },
    );
  }
}
