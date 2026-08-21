import "server-only";

import { ARCHETYPES } from "@/modules/zed/archetypes";
import {
  executionConfigured,
  lambdaExecutionAdapter,
} from "@/modules/execution/lambda-adapter";
import { claimProblem } from "@/modules/zed/pool";
import type { CodingDifficulty, StoredCodingProblem } from "../schema";
import { toStoredCodingProblem } from "./from-pool";
import { selectProblem } from "./problems";

/**
 * Where a coding interview's problem comes from.
 *
 * The pool is the real source: its problems carry hidden tests a judge can run,
 * so the interviewer is told whether the code works instead of guessing from an
 * edit log. The static list survives only as a fallback for environments with
 * no judge configured, and a problem drawn from it cannot be run.
 */
export async function selectInterviewProblem(
  userId: string,
  difficulty: CodingDifficulty,
): Promise<StoredCodingProblem> {
  if (!executionConfigured) return fallback(difficulty);

  const archetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
  if (!archetype) return fallback(difficulty);

  try {
    const { claim } = await claimProblem(
      lambdaExecutionAdapter,
      userId,
      archetype.id,
      difficulty,
    );
    if (!claim) return fallback(difficulty);
    return toStoredCodingProblem(claim.problem);
  } catch (error) {
    // An interview that cannot start is worse than one whose code cannot be
    // run, so a pool failure degrades rather than propagates.
    console.error("interview problem claim failed", error);
    return fallback(difficulty);
  }
}

function fallback(difficulty: CodingDifficulty): StoredCodingProblem {
  const problem = selectProblem(difficulty);
  return {
    id: problem.id,
    title: problem.title,
    topic: problem.topic,
    prompt: problem.prompt,
    edgeCases: problem.edgeCases,
    execution: null,
  };
}
