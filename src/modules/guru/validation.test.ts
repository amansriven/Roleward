import { describe, expect, it } from "vitest";
import type {
  DifferentialResult,
  ExecutionAdapter,
  ExecutionResult,
  OutputsResult,
} from "@/modules/execution/port";
import type { ProblemDraft } from "./generator";
import { realizeDraft } from "./validation";

const draft: ProblemDraft = {
  archetypeId: "sliding-window",
  difficulty: "medium",
  title: "Best window",
  statement:
    "Given a list of readings and a window size, return the largest sum of any contiguous window of that size across the whole series.",
  constraints: ["1 <= k <= len(nums)"],
  signature: {
    name: "max_sum",
    parameters: [
      { name: "nums", type: "int[]", description: "Readings" },
      { name: "k", type: "int", description: "Window size" },
    ],
    returnType: "int",
  },
  testInputs: Array.from({ length: 10 }, (_, i) => [[i, i + 1, i + 2], 2]),
  edgeCases: ["All negatives", "Window equals length"],
  followUps: [{ prompt: "What if it streams?", lookingFor: "O(1) memory" }],
  expectedComplexity: { time: "O(n)", space: "O(1)" },
  canonicalSolution: "def max_sum(nums, k):\n    return 0",
  bruteForceSolution: "def max_sum(nums, k):\n    return 0",
  inputGenerator: "def generate_input(seed):\n    return [[1], 1]",
};

const agreed: DifferentialResult = { agreed: true, trials: 60, mismatches: [] };
const distinctOutputs: OutputsResult = {
  results: draft.testInputs.map((_, index) => ({
    index,
    value: index * 2,
    timeMs: 1,
  })),
};

function adapter(
  differential: DifferentialResult,
  outputs: OutputsResult,
): ExecutionAdapter {
  return {
    configured: true,
    execute: async () => ({}) as ExecutionResult,
    differential: async () => differential,
    deriveOutputs: async () => outputs,
  };
}

describe("realizeDraft", () => {
  it("derives expected outputs from the canonical rather than trusting the model", async () => {
    const outcome = await realizeDraft(adapter(agreed, distinctOutputs), draft);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.problem.publicTests).toHaveLength(3);
    expect(outcome.problem.hiddenTests).toHaveLength(7);
    // Expected values come from execution, not from the draft.
    expect(outcome.problem.publicTests[1]?.expected).toBe(2);
    expect(outcome.problem.validation?.trials).toBe(60);
  });

  it("rejects before deriving anything when the two solutions disagree", async () => {
    let derived = false;
    const spy: ExecutionAdapter = {
      ...adapter(
        {
          agreed: false,
          trials: 9,
          mismatches: [
            { seed: 2, input: [[1, 2], 2], canonical: 3, bruteForce: 4 },
          ],
        },
        distinctOutputs,
      ),
      deriveOutputs: async () => {
        derived = true;
        return distinctOutputs;
      },
    };
    const outcome = await realizeDraft(spy, draft);
    expect(outcome).toMatchObject({ ok: false, reason: "solutions_disagree" });
    // Outputs must never be derived from a solution that failed agreement.
    expect(derived).toBe(false);
  });

  it("rejects when the canonical raises on one of its own inputs", async () => {
    const outcome = await realizeDraft(
      adapter(agreed, {
        results: [
          { index: 0, value: 1, timeMs: 1 },
          { index: 1, error: "TypeError: unsupported operand", timeMs: 1 },
        ],
      }),
      draft,
    );
    expect(outcome).toMatchObject({
      ok: false,
      reason: "canonical_failed_tests",
    });
  });

  it("rejects a degenerate problem where every input yields the same answer", async () => {
    const outcome = await realizeDraft(
      adapter(agreed, {
        results: draft.testInputs.map((_, index) => ({
          index,
          value: 7,
          timeMs: 1,
        })),
      }),
      draft,
    );
    expect(outcome).toMatchObject({ ok: false });
    if (!outcome.ok) expect(outcome.detail).toContain("degenerate");
  });

  it("surfaces an unusable input generator without blaming the solutions", async () => {
    const outcome = await realizeDraft(
      adapter(
        {
          agreed: false,
          trials: 0,
          mismatches: [],
          error: "generate_input(0) failed",
        },
        distinctOutputs,
      ),
      draft,
    );
    expect(outcome).toMatchObject({ ok: false, reason: "generator_unusable" });
  });
});
