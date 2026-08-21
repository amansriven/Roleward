import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getAttempt, putAttempt } from "@/modules/aws/practice-store";
import { getProblem } from "@/modules/aws/problem-store";
import { findArchetype } from "@/modules/zed/archetypes";
import {
  buildCoaching,
  complexityMatches,
  hintsFor,
  MAX_HINTS,
  offeredEdgeCases,
  scoreEdgeCases,
} from "@/modules/zed/practice";
import { practiceAttemptSchema } from "@/modules/zed/schema";
import { observeAttempt } from "@/modules/zed/skills";

export const runtime = "nodejs";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("commit"),
    problemId: z.string().min(1),
    classification: z.string().min(1),
    complexity: z.string().min(1),
    edgeCases: z.array(z.string()).max(20).default([]),
  }),
  z.object({ action: z.literal("hint"), problemId: z.string().min(1) }),
  z.object({ action: z.literal("finish"), problemId: z.string().min(1) }),
]);

/**
 * The practice loop's server side.
 *
 * Every judgement lives here rather than in the browser: whether they named the
 * pattern, whether they predicted the cost, how many hints they opened. A gate
 * graded on the client is not a gate, and a hint counter the client owns makes
 * "solved unaided" meaningless.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const problem = await getProblem(session.user.id, parsed.data.problemId);
  if (!problem)
    return NextResponse.json({ error: "Unknown problem" }, { status: 404 });

  const existing = await getAttempt(session.user.id, parsed.data.problemId);
  const attempt =
    existing ??
    practiceAttemptSchema.parse({
      problemId: problem.id,
      archetypeId: problem.archetypeId,
      difficulty: problem.difficulty,
      startedAt: new Date().toISOString(),
    });

  if (parsed.data.action === "commit") {
    // Correctness is withheld until the end. Learning you guessed wrong before
    // writing a line turns the gate into a hint.
    if (attempt.committedAt)
      return NextResponse.json({ committed: true, alreadyCommitted: true });
    attempt.classification = parsed.data.classification;
    attempt.classificationCorrect =
      parsed.data.classification === problem.archetypeId;
    attempt.complexity = parsed.data.complexity;
    attempt.complexityCorrect = complexityMatches(
      parsed.data.complexity,
      problem.expectedComplexity.time,
    );
    attempt.edgeCasesChosen = parsed.data.edgeCases;
    // The offered set is rebuilt here rather than taken from the request, so a
    // browser cannot widen the decoys and score itself well.
    attempt.edgeCasesScore = scoreEdgeCases(
      parsed.data.edgeCases,
      problem.edgeCases,
      offeredEdgeCases(problem),
    );
    attempt.committedAt = new Date().toISOString();
    await putAttempt(session.user.id, attempt);
    return NextResponse.json({ committed: true });
  }

  if (parsed.data.action === "hint") {
    const hints = hintsFor(problem);
    const index = attempt.hintsUsed;
    if (index >= Math.min(MAX_HINTS, hints.length))
      return NextResponse.json({ hint: null, exhausted: true });
    attempt.hintsUsed = index + 1;
    await putAttempt(session.user.id, attempt);
    return NextResponse.json({
      hint: hints[index],
      remaining: Math.min(MAX_HINTS, hints.length) - attempt.hintsUsed,
    });
  }

  attempt.completedAt = attempt.completedAt ?? new Date().toISOString();
  await putAttempt(session.user.id, attempt);
  const archetype = findArchetype(problem.archetypeId);
  return NextResponse.json({
    skills: observeAttempt({
      archetypeId: problem.archetypeId,
      difficulty: problem.difficulty,
      classificationCorrect: attempt.classificationCorrect,
      complexityCorrect: attempt.complexityCorrect,
      edgeCasesScore: attempt.edgeCasesScore,
      solved: attempt.solved,
      hintsUsed: attempt.hintsUsed,
      runs: attempt.runs,
      completedAt: attempt.completedAt,
    }),
    coaching: buildCoaching(problem, {
      classificationCorrect: attempt.classificationCorrect,
      complexityCorrect: attempt.complexityCorrect,
      solved: attempt.solved,
      hintsUsed: attempt.hintsUsed,
      runs: attempt.runs,
    }),
    reveal: {
      archetype: archetype
        ? { id: archetype.id, name: archetype.name, tell: archetype.tell }
        : null,
      expectedComplexity: problem.expectedComplexity,
      edgeCases: problem.edgeCases,
      followUps: problem.followUps,
      chosenClassification: attempt.classification,
      classificationCorrect: attempt.classificationCorrect,
      chosenComplexity: attempt.complexity,
      complexityCorrect: attempt.complexityCorrect,
      chosenEdgeCases: attempt.edgeCasesChosen,
      edgeCasesScore: attempt.edgeCasesScore,
      solved: attempt.solved,
      hintsUsed: attempt.hintsUsed,
      runs: attempt.runs,
    },
  });
}
