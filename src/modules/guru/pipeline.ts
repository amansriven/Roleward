import "server-only";

import type { ExecutionAdapter } from "@/modules/execution/port";
import type { Difficulty } from "./archetypes";
import {
  generateProblemDraft,
  ProblemGenerationError,
  type ProblemDraft,
} from "./generator";
import type { GeneratedProblem } from "./schema";
import { realizeDraft, type GenerationAttempt } from "./validation";

const MAX_ATTEMPTS = 3;

/**
 * Generates until a problem survives. Rejections come back alongside the result
 * rather than being swallowed: a model that keeps failing one archetype is a
 * signal about that archetype's constraints, not just a retry to absorb.
 */
export async function generateValidatedProblem(
  adapter: ExecutionAdapter,
  archetypeId: string,
  difficulty: Difficulty,
  maxAttempts = MAX_ATTEMPTS,
): Promise<{
  problem: GeneratedProblem | null;
  attempts: GenerationAttempt[];
}> {
  const attempts: GenerationAttempt[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let draft: ProblemDraft;
    try {
      draft = await generateProblemDraft(archetypeId, difficulty);
    } catch (error) {
      if (!(error instanceof ProblemGenerationError)) throw error;
      attempts.push({
        attempt,
        outcome: {
          ok: false,
          reason: "generator_unusable",
          detail: error.message,
        },
      });
      continue;
    }

    const outcome = await realizeDraft(adapter, draft);
    attempts.push({ attempt, outcome });
    if (outcome.ok) return { problem: outcome.problem, attempts };
  }

  return { problem: null, attempts };
}
