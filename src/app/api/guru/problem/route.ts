import { after, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import {
  executionConfigured,
  lambdaExecutionAdapter,
} from "@/modules/execution/lambda-adapter";
import { ExecutionUnavailableError } from "@/modules/execution/port";
import { ARCHETYPE_IDS } from "@/modules/guru/archetypes";
import { claimProblem, refillCell } from "@/modules/guru/pool";
import { toClientProblem } from "@/modules/guru/schema";
import { interviewsConfigured } from "@/modules/interviews/openai";

export const runtime = "nodejs";
// A pool hit answers in well under a second, but a cold cell still generates
// inline, and the background refill runs inside whatever budget is left.
export const maxDuration = 120;

/** Leaves the refill enough room to finish and store what it starts. */
const REFILL_RESERVE_MS = 10_000;

const requestSchema = z.object({
  archetypeId: z.enum(ARCHETYPE_IDS as [string, ...string[]]),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!interviewsConfigured)
    return NextResponse.json(
      { error: "Problem generation is not configured", code: "unconfigured" },
      { status: 503 },
    );
  if (!executionConfigured)
    return NextResponse.json(
      {
        error:
          "The judge is not configured, so problems cannot be validated before use.",
        code: "unconfigured",
      },
      { status: 503 },
    );
  if (!workspaceStorageConfigured)
    return NextResponse.json(
      { error: "Storage is not configured", code: "unconfigured" },
      { status: 503 },
    );

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const startedAt = Date.now();
  const { archetypeId, difficulty } = parsed.data;

  try {
    const { claim, attempts } = await claimProblem(
      lambdaExecutionAdapter,
      session.user.id,
      archetypeId,
      difficulty,
    );
    if (!claim)
      return NextResponse.json(
        {
          error: "No generated problem passed validation.",
          code: "validation_failed",
          // Safe to surface: these describe the model's output, not user data.
          rejections: attempts.map((item) =>
            item.outcome.ok
              ? null
              : { reason: item.outcome.reason, detail: item.outcome.detail },
          ),
        },
        { status: 502 },
      );

    // Refilling after the response is the whole point of the pool: this
    // candidate already has their problem, and the next one should not wait
    // either. Failures here are the pool's problem, not the request's.
    if (claim.refill > 0)
      after(async () => {
        const deadline = startedAt + maxDuration * 1000 - REFILL_RESERVE_MS;
        try {
          await refillCell(
            lambdaExecutionAdapter,
            archetypeId,
            difficulty,
            claim.refill,
            deadline,
          );
        } catch (error) {
          console.error("guru pool refill failed", error);
        }
      });

    return NextResponse.json({
      problem: toClientProblem(claim.problem),
      source: claim.source,
    });
  } catch (error) {
    if (error instanceof ExecutionUnavailableError)
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 503 },
      );
    return NextResponse.json(
      { error: "Problem generation failed", code: "generation_error" },
      { status: 502 },
    );
  }
}
