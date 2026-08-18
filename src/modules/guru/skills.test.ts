import { describe, expect, it } from "vitest";
import {
  aggregateSkills,
  observeAttempt,
  recommendNext,
  type ArchetypeStanding,
  type AttemptSkillInput,
  type SkillScore,
} from "./skills";

const attempt = (
  patch: Partial<AttemptSkillInput> = {},
): AttemptSkillInput => ({
  archetypeId: "sliding-window",
  difficulty: "medium",
  classificationCorrect: true,
  complexityCorrect: true,
  edgeCasesScore: 8,
  solved: true,
  hintsUsed: 0,
  runs: 1,
  completedAt: "2026-08-18T00:00:00.000Z",
  ...patch,
});

describe("observeAttempt", () => {
  it("scores recognizing the pattern from the classification gate", () => {
    const wrong = observeAttempt(attempt({ classificationCorrect: false }));
    expect(wrong.find((i) => i.skill === "pattern_recognition")?.score).toBe(0);
  });

  it("separates recognizing the pattern from implementing it", () => {
    // The candidate this exists for: writes correct code, misreads the problem.
    const observations = observeAttempt(
      attempt({ classificationCorrect: false, solved: true, runs: 1 }),
    );
    expect(
      observations.find((i) => i.skill === "pattern_recognition")?.score,
    ).toBe(0);
    expect(
      observations.find((i) => i.skill === "implementation_accuracy")?.score,
    ).toBeGreaterThan(8);
  });

  it("marks down an implementation that needed many runs", () => {
    const few = observeAttempt(attempt({ runs: 1 }));
    const many = observeAttempt(attempt({ runs: 6 }));
    expect(
      many.find((i) => i.skill === "implementation_accuracy")!.score,
    ).toBeLessThan(
      few.find((i) => i.skill === "implementation_accuracy")!.score,
    );
  });

  it("refuses to judge deriving the optimization once the target was given away", () => {
    // Hint two states the complexity. After that there is nothing to derive.
    const hinted = observeAttempt(attempt({ hintsUsed: 2 }));
    expect(hinted.some((i) => i.skill === "optimization_derivation")).toBe(
      false,
    );
    expect(
      observeAttempt(attempt({ hintsUsed: 1 })).some(
        (i) => i.skill === "optimization_derivation",
      ),
    ).toBe(true);
  });

  it("never invents a score for a skill that was not exercised", () => {
    const observations = observeAttempt(attempt({ edgeCasesScore: null }));
    expect(
      observations.some((i) => i.skill === "edge_case_identification"),
    ).toBe(false);
  });

  it("never scores the speaking skills from a silent editor", () => {
    const skills = observeAttempt(attempt()).map((i) => i.skill);
    expect(skills).not.toContain("communication");
    expect(skills).not.toContain("brute_force_articulation");
  });
});

describe("aggregateSkills", () => {
  it("reports every skill, with nulls where nothing has measured one", () => {
    const scores = aggregateSkills([attempt()]);
    expect(scores).toHaveLength(7);
    const communication = scores.find((i) => i.skill === "communication")!;
    expect(communication.score).toBeNull();
    expect(communication.measuredBy).toBe("stage_fright");
  });

  it("weights recent attempts above old ones", () => {
    const old = Array.from({ length: 10 }, (_, index) =>
      attempt({
        classificationCorrect: false,
        completedAt: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      }),
    );
    const recovered = [
      ...old,
      ...Array.from({ length: 5 }, (_, index) =>
        attempt({
          classificationCorrect: true,
          completedAt: `2026-08-${String(index + 10).padStart(2, "0")}T00:00:00.000Z`,
        }),
      ),
    ];
    const score = aggregateSkills(recovered).find(
      (i) => i.skill === "pattern_recognition",
    )!.score;
    // A flat mean would sit near 3.3; recency should pull it well past that.
    expect(score).toBeGreaterThan(5);
  });

  it("counts samples so a single attempt is not read as a verdict", () => {
    expect(
      aggregateSkills([attempt()]).find(
        (i) => i.skill === "pattern_recognition",
      )?.samples,
    ).toBe(1);
  });
});

describe("recommendNext", () => {
  const standing = (patch: Partial<ArchetypeStanding>): ArchetypeStanding => ({
    archetypeId: "sliding-window",
    name: "Sliding window",
    attempts: 4,
    solvedUnaided: 0,
    recognized: 0,
    strength: 20,
    lastDifficulty: "medium",
    ...patch,
  });
  const skills = (patch: Partial<Record<string, number>>): SkillScore[] =>
    aggregateSkills([]).map((item) => ({
      ...item,
      score: patch[item.skill] ?? null,
      samples: patch[item.skill] === undefined ? 0 : 3,
    }));

  it("points at the weakest archetype, not the last one played", () => {
    const next = recommendNext(
      [
        standing({ strength: 80 }),
        standing({
          archetypeId: "graph-bfs",
          name: "Breadth-first shortest path",
          strength: 12,
        }),
      ],
      skills({ pattern_recognition: 3, implementation_accuracy: 9 }),
      [],
    );
    expect(next?.archetypeId).toBe("graph-bfs");
  });

  it("names the strength and the weakness rather than saying pick another medium", () => {
    const next = recommendNext(
      [standing({})],
      skills({ implementation_accuracy: 9, pattern_recognition: 3 }),
      [],
    );
    expect(next?.reason).toContain("implementation accuracy is strong");
    expect(next?.reason.toLowerCase()).toContain("recognizing the pattern");
  });

  it("steps up when the archetype is being solved unaided", () => {
    const next = recommendNext(
      [standing({ attempts: 4, solvedUnaided: 4, strength: 95 })],
      skills({ pattern_recognition: 9 }),
      [],
    );
    expect(next?.difficulty).toBe("hard");
  });

  it("steps down when the archetype is going badly", () => {
    const next = recommendNext(
      [standing({ strength: 10, lastDifficulty: "hard" })],
      skills({ pattern_recognition: 2 }),
      [],
    );
    expect(next?.difficulty).toBe("medium");
  });

  it("falls back to an unpractised archetype with an honest reason", () => {
    const next = recommendNext([], skills({}), [
      { id: "hash-map", name: "Hash map" },
    ]);
    expect(next?.archetypeId).toBe("hash-map");
    expect(next?.reason).toContain("Nothing practised yet");
  });
});
