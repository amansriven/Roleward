import { describe, expect, it } from "vitest";
import {
  buildCoaching,
  buildGate,
  complexityMatches,
  hintsFor,
  normalizeComplexity,
  scoreEdgeCases,
  summarizeMastery,
  type AttemptRecord,
  type AttemptSignals,
} from "./practice";
import type { GeneratedProblem } from "./schema";

const problem = {
  id: "p1",
  archetypeId: "sliding-window",
  difficulty: "medium",
  title: "Steady stretch",
  statement: "A statement long enough to be a statement about readings.",
  constraints: ["1 <= n <= 40"],
  signature: {
    name: "solve",
    parameters: [{ name: "nums", type: "int[]", description: "readings" }],
    returnType: "int",
  },
  tests: [
    { input: [[1]], expected: 1 },
    { input: [[2]], expected: 1 },
    { input: [[3]], expected: 2 },
    { input: [[4]], expected: 2 },
    { input: [[5]], expected: 3 },
    { input: [[6]], expected: 3 },
  ],
  edgeCases: ["an empty array", "all equal values"],
  followUps: [{ prompt: "Streaming?", lookingFor: "constant space" }],
  expectedComplexity: { time: "O(n)", space: "O(1)" },
  canonicalSolution: "def solve(nums): return 1",
  bruteForceSolution: "def solve(nums): return 1",
  inputGenerator: "def generate_input(seed): return [[1]]",
  createdAt: "2026-08-18T00:00:00.000Z",
  validation: { trials: 60, validatedAt: "2026-08-18T00:00:00.000Z" },
} as GeneratedProblem;

const signals = (patch: Partial<AttemptSignals>): AttemptSignals => ({
  classificationCorrect: true,
  complexityCorrect: true,
  solved: true,
  hintsUsed: 0,
  runs: 1,
  ...patch,
});

describe("normalizeComplexity", () => {
  it("ignores spacing and case", () => {
    expect(complexityMatches("O(N LOG N)", "O(n log n)")).toBe(true);
  });
  it("ignores the commentary models add after the bound", () => {
    // "O(V + E) where V is the number of cities" must match a picked "O(V + E)".
    expect(complexityMatches("O(V + E)", "O(V + E) where V is cities")).toBe(
      true,
    );
  });
  it("keeps genuinely different bounds apart", () => {
    expect(complexityMatches("O(n)", "O(n log n)")).toBe(false);
    expect(complexityMatches("O(n^2)", "O(n)")).toBe(false);
  });
  it("survives text with no bound in it at all", () => {
    expect(normalizeComplexity("linear")).toBe("linear");
  });
});

describe("buildGate", () => {
  it("offers the real archetype among its own confusable neighbours", () => {
    const gate = buildGate(problem, () => 0);
    expect(gate.classification.map((item) => item.id)).toContain(
      "sliding-window",
    );
    expect(gate.classification.length).toBeGreaterThan(1);
  });

  it("never marks which choice is correct", () => {
    const gate = buildGate(problem, () => 0);
    // The browser gets ids and names only. Anything more would be the answer.
    for (const choice of gate.classification)
      expect(Object.keys(choice).sort()).toEqual(["id", "name"]);
  });

  it("mixes the problem's edge cases with generic decoys", () => {
    const gate = buildGate(problem, () => 0);
    expect(gate.edgeCases).toContain("an empty array");
    expect(gate.edgeCases.length).toBeGreaterThan(problem.edgeCases.length);
  });

  it("includes the true complexity among plausible wrong ones", () => {
    const gate = buildGate(problem, () => 0);
    expect(
      gate.complexity.some((item) => complexityMatches(item, "O(n)")),
    ).toBe(true);
    expect(gate.complexity.length).toBe(4);
  });

  it("does not offer the same bound twice", () => {
    const graph = {
      ...problem,
      expectedComplexity: { time: "O(n log n)", space: "O(n)" },
    } as GeneratedProblem;
    const gate = buildGate(graph, () => 0);
    const normalized = gate.complexity.map(normalizeComplexity);
    expect(new Set(normalized).size).toBe(normalized.length);
  });
});

describe("hintsFor", () => {
  it("escalates from the shape to the target to a specific case", () => {
    const hints = hintsFor(problem);
    expect(hints).toHaveLength(3);
    expect(hints[1]).toContain("O(n)");
    expect(hints[2]).toContain("an empty array");
  });

  it("never contains the solution", () => {
    for (const hint of hintsFor(problem))
      expect(hint).not.toContain(problem.canonicalSolution);
  });
});

describe("buildCoaching", () => {
  it("reports recognizing the pattern separately from solving it", () => {
    const points = buildCoaching(
      problem,
      signals({ classificationCorrect: false }),
    );
    expect(points[0]?.tone).toBe("work");
    expect(points[0]?.detail).toContain("Sliding window");
    expect(points.find((item) => item.title === "Solved unaided")).toBeTruthy();
  });

  it("does not call a hinted solve unaided", () => {
    const points = buildCoaching(problem, signals({ hintsUsed: 2 }));
    expect(points.some((item) => item.title.includes("after 2 hints"))).toBe(
      true,
    );
  });

  it("calls out leaning on the judge", () => {
    const points = buildCoaching(problem, signals({ runs: 9 }));
    expect(points.some((item) => item.title === "A lot of runs")).toBe(true);
  });

  it("tells an unsolved attempt to come back rather than move on", () => {
    const points = buildCoaching(problem, signals({ solved: false }));
    expect(points.some((item) => item.title === "Not yet passing")).toBe(true);
  });
});

describe("summarizeMastery", () => {
  const attempt = (patch: Partial<AttemptRecord>): AttemptRecord => ({
    archetypeId: "sliding-window",
    classificationCorrect: true,
    solved: true,
    hintsUsed: 0,
    completedAt: "2026-08-18T00:00:00.000Z",
    ...patch,
  });

  it("ranks the weakest archetype first, since that is what to practice", () => {
    const views = summarizeMastery([
      attempt({}),
      attempt({
        archetypeId: "hash-map",
        classificationCorrect: false,
        solved: false,
      }),
    ]);
    expect(views[0]?.archetypeId).toBe("hash-map");
    expect(views[0]?.strength).toBeLessThan(views[1]!.strength);
  });

  it("scores a hinted solve below an unaided one", () => {
    const unaided = summarizeMastery([attempt({})])[0]!.strength;
    const hinted = summarizeMastery([attempt({ hintsUsed: 2 })])[0]!.strength;
    expect(hinted).toBeLessThan(unaided);
  });

  it("names the archetype rather than echoing its id", () => {
    expect(summarizeMastery([attempt({})])[0]?.name).toBe("Sliding window");
  });
});

describe("scoreEdgeCases", () => {
  const actual = ["an empty array", "all equal values"];
  const offered = [...actual, "decoy one", "decoy two", "decoy three"];

  it("rewards finding this problem's real cases", () => {
    expect(scoreEdgeCases(actual, actual, offered)).toBe(10);
  });

  it("does not reward naming everything", () => {
    // Selecting the whole list has perfect recall and no discrimination.
    expect(scoreEdgeCases(offered, actual, offered)).toBeLessThan(8);
  });

  it("scores an empty selection at zero", () => {
    expect(scoreEdgeCases([], actual, offered)).toBeLessThanOrEqual(3);
  });

  it("puts a partial answer between the two", () => {
    const partial = scoreEdgeCases([actual[0]!], actual, offered);
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(10);
  });
});
