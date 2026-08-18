import type { ExecutionAdapter } from "@/modules/execution/port";
import {
  generatedProblemSchema,
  type GeneratedProblem,
  type ProblemDraft,
} from "./schema";

export const DIFFERENTIAL_TRIALS = 60;

export type RejectionReason =
  | "canonical_failed_tests"
  | "brute_force_failed_tests"
  | "solutions_disagree"
  | "generator_unusable";

export interface ValidationFailure {
  ok: false;
  reason: RejectionReason;
  detail: string;
}
export interface ValidationSuccess {
  ok: true;
  problem: GeneratedProblem;
}
export type ValidationOutcome = ValidationSuccess | ValidationFailure;

export interface GenerationAttempt {
  attempt: number;
  outcome: ValidationOutcome;
}

/**
 * Turns a draft into a trusted problem, or explains why it cannot.
 *
 * Order matters. Differential testing runs first so that expected outputs are
 * only ever derived from a solution that an independent implementation already
 * agreed with across randomized inputs.
 */
export async function realizeDraft(
  adapter: ExecutionAdapter,
  draft: ProblemDraft,
): Promise<ValidationOutcome> {
  const entrypoint = draft.signature.name;

  const differential = await adapter.differential({
    language: "python",
    canonicalCode: draft.canonicalSolution,
    bruteForceCode: draft.bruteForceSolution,
    generatorCode: draft.inputGenerator,
    entrypoint,
    trials: DIFFERENTIAL_TRIALS,
  });
  if (differential.error)
    return {
      ok: false,
      reason: "generator_unusable",
      detail: differential.error,
    };
  if (!differential.agreed) {
    const first = differential.mismatches[0];
    return {
      ok: false,
      reason: "solutions_disagree",
      detail: first
        ? `On ${JSON.stringify(first.input)} the canonical returned ${JSON.stringify(
            first.canonical,
          )} but the brute force returned ${JSON.stringify(first.bruteForce)}.`
        : "The two solutions disagreed on generated input.",
    };
  }

  const derived = await adapter.deriveOutputs({
    language: "python",
    code: draft.canonicalSolution,
    entrypoint,
    inputs: draft.testInputs,
  });
  if (derived.compileError)
    return {
      ok: false,
      reason: "canonical_failed_tests",
      detail: derived.compileError,
    };

  const failed = derived.results.find((item) => item.error);
  if (failed)
    return {
      ok: false,
      reason: "canonical_failed_tests",
      detail: `Input ${JSON.stringify(
        draft.testInputs[failed.index],
      )} raised: ${failed.error?.slice(0, 300)}`,
    };
  if (derived.results.length !== draft.testInputs.length)
    return {
      ok: false,
      reason: "canonical_failed_tests",
      detail: `Only ${derived.results.length} of ${draft.testInputs.length} inputs produced a value.`,
    };

  // A problem whose every input yields the same answer tests nothing.
  const distinct = new Set(
    derived.results.map((item) => JSON.stringify(item.value ?? null)),
  );
  if (distinct.size < 2)
    return {
      ok: false,
      reason: "solutions_disagree",
      detail: `All ${derived.results.length} test inputs produce the same output, so the problem is degenerate.`,
    };

  const cases = derived.results.map((item) => ({
    input: draft.testInputs[item.index] ?? [],
    expected: item.value ?? null,
  }));

  const parsed = generatedProblemSchema.safeParse({
    id: crypto.randomUUID(),
    archetypeId: draft.archetypeId,
    difficulty: draft.difficulty,
    title: draft.title,
    statement: draft.statement,
    constraints: draft.constraints,
    signature: draft.signature,
    tests: cases,
    edgeCases: draft.edgeCases,
    followUps: draft.followUps,
    expectedComplexity: draft.expectedComplexity,
    canonicalSolution: draft.canonicalSolution,
    bruteForceSolution: draft.bruteForceSolution,
    inputGenerator: draft.inputGenerator,
    createdAt: new Date().toISOString(),
    validation: {
      trials: differential.trials,
      validatedAt: new Date().toISOString(),
    },
  });
  if (!parsed.success)
    return {
      ok: false,
      reason: "generator_unusable",
      detail: parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")
        .slice(0, 300),
    };

  return { ok: true, problem: parsed.data };
}
