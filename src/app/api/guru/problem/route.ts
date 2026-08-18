import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { putProblem } from "@/modules/aws/problem-store";
import {
  executionConfigured,
  lambdaExecutionAdapter,
} from "@/modules/execution/lambda-adapter";
import { ExecutionUnavailableError } from "@/modules/execution/port";
import { ARCHETYPE_IDS } from "@/modules/guru/archetypes";
import { generateValidatedProblem } from "@/modules/guru/pipeline";
import { toClientProblem } from "@/modules/guru/schema";
import { interviewsConfigured } from "@/modules/interviews/openai";

export const runtime = "nodejs";
// Generation plus three validation round trips runs well past the default.
export const maxDuration = 120;

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

  try {
    const { problem, attempts } = await generateValidatedProblem(
      lambdaExecutionAdapter,
      parsed.data.archetypeId,
      parsed.data.difficulty,
    );
    if (!problem)
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

    await putProblem(session.user.id, problem);
    return NextResponse.json({
      problem: toClientProblem(problem),
      attempts: attempts.length,
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
