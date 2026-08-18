import { describe, expect, it } from "vitest";
import { describeRuns, toStoredCodingProblem } from "./from-pool";
import type { CodingRun } from "../schema";
import type { GeneratedProblem } from "@/modules/guru/schema";

const problem = {
  id: "problem-1",
  archetypeId: "sliding-window",
  difficulty: "medium",
  title: "Longest steady stretch",
  statement: "A long statement about a contiguous run of readings.",
  constraints: ["1 <= n <= 40"],
  signature: {
    name: "longest_steady",
    parameters: [
      { name: "readings", type: "int[]", description: "the readings" },
    ],
    returnType: "int",
  },
  tests: [
    { input: [[1, 2, 3]], expected: 3 },
    { input: [[1]], expected: 1 },
    { input: [[2, 2]], expected: 2 },
    { input: [[3, 3, 3]], expected: 3 },
    { input: [[4]], expected: 1 },
    { input: [[5, 5]], expected: 2 },
  ],
  edgeCases: ["a single reading"],
  followUps: [{ prompt: "What if it streams?", lookingFor: "constant space" }],
  expectedComplexity: { time: "O(n)", space: "O(1)" },
  canonicalSolution: "def longest_steady(readings): return len(readings)",
  bruteForceSolution: "def longest_steady(readings): return len(readings)",
  inputGenerator: "def generate_input(seed): return [[1, 2]]",
  createdAt: "2026-08-18T00:00:00.000Z",
  validation: { trials: 60, validatedAt: "2026-08-18T00:00:00.000Z" },
} as GeneratedProblem;

const run = (patch: Partial<CodingRun>): CodingRun => ({
  id: "run-1",
  language: "python",
  verdict: "wrong_answer",
  passed: 1,
  total: 10,
  failedTests: [],
  createdAt: "2026-08-18T00:00:00.000Z",
  ...patch,
});

describe("toStoredCodingProblem", () => {
  it("names the topic from the archetype rather than its id", () => {
    expect(toStoredCodingProblem(problem).topic).toBe("Sliding window");
  });

  it("carries what the judge needs to run a submission", () => {
    const stored = toStoredCodingProblem(problem);
    expect(stored.execution?.problemId).toBe("problem-1");
    expect(stored.execution?.signature.name).toBe("longest_steady");
  });

  it("never puts the solutions in the stored problem", () => {
    // Tests are all visible now; the solutions and the generator are not.
    const serialized = JSON.stringify(toStoredCodingProblem(problem));
    expect(serialized).not.toContain("canonicalSolution");
    expect(serialized).not.toContain("inputGenerator");
  });

  it("shows the candidate the constraints alongside the statement", () => {
    expect(toStoredCodingProblem(problem).prompt).toContain("1 <= n <= 40");
  });
});

describe("describeRuns", () => {
  it("tells the interviewer to ask for a run when there has been none", () => {
    expect(describeRuns([])).toContain("not run their code yet");
  });

  it("reports a clean pass as correct", () => {
    const text = describeRuns([run({ verdict: "accepted", passed: 10 })]);
    expect(text).toContain("Every test passes");
  });

  it("names failing cases in one-based terms", () => {
    expect(describeRuns([run({ failedTests: [0, 2] })])).toContain(
      "cases 1, 3",
    );
  });

  it("prompts rather than hands over the fix", () => {
    const text = describeRuns([run({ failedTests: [1] })]);
    expect(text).toContain("what those inputs have in common");
    expect(text).not.toContain('naming the fix." ');
  });

  it("notices when the candidate is converging", () => {
    const text = describeRuns([run({ passed: 2 }), run({ passed: 6 })]);
    expect(text).toContain("converging");
  });
});
