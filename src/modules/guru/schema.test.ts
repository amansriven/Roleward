import { describe, expect, it } from "vitest";
import { generatedProblemSchema, toClientProblem } from "./schema";

const base = {
  id: "p1",
  archetypeId: "sliding-window",
  difficulty: "medium",
  title: "Steady stretch",
  statement:
    "A statement written out at enough length to clear the minimum the schema asks of a real problem.",
  constraints: ["1 <= n <= 40"],
  signature: {
    name: "solve",
    parameters: [{ name: "nums", type: "int[]", description: "readings" }],
    returnType: "int",
  },
  edgeCases: ["an empty array", "all equal"],
  followUps: [{ prompt: "Streaming?", lookingFor: "constant space" }],
  expectedComplexity: { time: "O(n)", space: "O(1)" },
  canonicalSolution: "def solve(nums): return len(nums)",
  bruteForceSolution: "def solve(nums): return len(nums)",
  inputGenerator: "def generate_input(seed): return [[1, 2, 3]]",
  createdAt: "2026-08-18T00:00:00.000Z",
  validation: { trials: 60, validatedAt: "2026-08-18T00:00:00.000Z" },
};

const cases = Array.from({ length: 8 }, (_, index) => ({
  input: [[index]],
  expected: index,
}));

describe("generatedProblemSchema", () => {
  it("accepts a problem written as one list of tests", () => {
    const parsed = generatedProblemSchema.safeParse({ ...base, tests: cases });
    expect(parsed.success).toBe(true);
  });

  it("folds already-pooled problems into the single list", () => {
    // Problems were pooled under a public/hidden split. They must keep parsing,
    // or every one of them is evicted the first time it is claimed.
    const parsed = generatedProblemSchema.safeParse({
      ...base,
      publicTests: cases.slice(0, 3),
      hiddenTests: cases.slice(3),
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.tests).toHaveLength(8);
    expect(parsed.data.tests[0]?.expected).toBe(0);
    expect(parsed.data.tests[7]?.expected).toBe(7);
  });

  it("rejects a problem with too few tests to be worth solving", () => {
    const parsed = generatedProblemSchema.safeParse({
      ...base,
      tests: cases.slice(0, 2),
    });
    expect(parsed.success).toBe(false);
  });
});

describe("toClientProblem", () => {
  const problem = generatedProblemSchema.parse({ ...base, tests: cases });

  it("sends every test to the browser", () => {
    expect(toClientProblem(problem).tests).toHaveLength(8);
  });

  it("never sends the solutions or the generator", () => {
    const serialized = JSON.stringify(toClientProblem(problem));
    expect(serialized).not.toContain("canonicalSolution");
    expect(serialized).not.toContain("bruteForceSolution");
    expect(serialized).not.toContain("generate_input");
  });

  it("withholds the archetype, which is the practice gate's answer", () => {
    expect(JSON.stringify(toClientProblem(problem))).not.toContain(
      "sliding-window",
    );
  });
});
