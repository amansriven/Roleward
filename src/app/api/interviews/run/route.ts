import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getInterview, putInterview } from "@/modules/aws/interview-store";
import { getProblem } from "@/modules/aws/problem-store";
import {
  executionConfigured,
  lambdaExecutionAdapter,
} from "@/modules/execution/lambda-adapter";
import {
  ExecutionUnavailableError,
  isExecutable,
  LANGUAGES,
} from "@/modules/execution/port";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  sessionId: z.string().min(1),
  language: z.enum(LANGUAGES),
  code: z.string().min(1).max(60_000),
});

/**
 * Runs the candidate's code against the problem's real tests, mid-interview.
 *
 * Separate from /api/zed/run because the verdict is not only shown to the
 * candidate: it is recorded on the session, which is how the interviewer comes
 * to know whether the code works instead of inferring it from an edit log.
 */
export async function POST(request: Request) {
  const auth_ = await auth();
  if (!auth_?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!executionConfigured || !workspaceStorageConfigured)
    return NextResponse.json(
      { error: "The judge is not configured.", code: "unconfigured" },
      { status: 503 },
    );

  const parsed = requestSchema.safeParse(
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

  const session = await getInterview(auth_.user.id, parsed.data.sessionId);
  if (!session)
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  if (session.status !== "in_progress")
    return NextResponse.json(
      { error: "This interview is already finished." },
      { status: 409 },
    );

  const execution = session.codingProblem?.execution;
  if (!execution)
    return NextResponse.json(
      {
        error: "This interview's problem has no tests to run.",
        code: "not_runnable",
      },
      { status: 400 },
    );

  // Scoped to the caller, so one candidate cannot read another's hidden tests.
  const problem = await getProblem(auth_.user.id, execution.problemId);
  if (!problem)
    return NextResponse.json({ error: "Unknown problem" }, { status: 404 });

  try {
    const result = await lambdaExecutionAdapter.execute({
      language: parsed.data.language,
      code: parsed.data.code,
      entrypoint: problem.signature.name,
      tests: problem.tests,
    });

    session.codingRuns.push({
      id: randomUUID(),
      language: parsed.data.language,
      verdict: result.verdict,
      passed: result.passed,
      total: result.total,
      failedTests: result.outcomes
        .filter((outcome) => !outcome.passed)
        .map((outcome) => outcome.index),
      createdAt: new Date().toISOString(),
    });
    await putInterview(auth_.user.id, session);

    return NextResponse.json({
      result,
      testCount: problem.tests.length,
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
