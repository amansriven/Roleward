import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getProblem } from "@/modules/aws/problem-store";
import {
  executionConfigured,
  lambdaExecutionAdapter,
} from "@/modules/execution/lambda-adapter";
import {
  ExecutionUnavailableError,
  isExecutable,
  redactForClient,
} from "@/modules/execution/port";
import { submissionSchema } from "@/modules/guru/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!executionConfigured || !workspaceStorageConfigured)
    return NextResponse.json(
      { error: "The judge is not configured", code: "unconfigured" },
      { status: 503 },
    );

  const parsed = submissionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });

  if (!isExecutable(parsed.data.language))
    return NextResponse.json(
      {
        error: `${parsed.data.language} can be written in the editor but cannot be run yet.`,
        code: "unsupported_language",
      },
      { status: 400 },
    );

  const problem = await getProblem(session.user.id, parsed.data.problemId);
  if (!problem)
    return NextResponse.json({ error: "Unknown problem" }, { status: 404 });

  // Public tests first so their index range is what redaction keeps visible.
  const tests = [...problem.publicTests, ...problem.hiddenTests];

  try {
    const result = await lambdaExecutionAdapter.execute({
      language: parsed.data.language,
      code: parsed.data.code,
      entrypoint: problem.signature.name,
      tests,
    });
    return NextResponse.json({
      result: redactForClient(result, problem.publicTests.length),
      publicTestCount: problem.publicTests.length,
      hiddenTestCount: problem.hiddenTests.length,
    });
  } catch (error) {
    if (error instanceof ExecutionUnavailableError)
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 503 },
      );
    return NextResponse.json(
      { error: "The judge failed", code: "judge_error" },
      { status: 502 },
    );
  }
}
