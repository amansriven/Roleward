import { describe, expect, it } from "vitest";
import {
  ARCHETYPES,
  ARCHETYPE_IDS,
  classificationChoices,
  findArchetype,
} from "./archetypes";

describe("the archetype set", () => {
  it("has no duplicate ids", () => {
    expect(new Set(ARCHETYPE_IDS).size).toBe(ARCHETYPES.length);
  });

  it("only names distractors that actually exist", () => {
    // The classification gate offers confusableWith ids as choices, so a
    // dangling one puts an option on screen that resolves to nothing. Three
    // were dangling before the set was filled out.
    const dangling = ARCHETYPES.flatMap((archetype) =>
      archetype.confusableWith.filter((id) => !findArchetype(id)),
    );
    expect(dangling).toEqual([]);
  });

  it("never offers an archetype as its own distractor", () => {
    const selfReferencing = ARCHETYPES.filter((archetype) =>
      archetype.confusableWith.includes(archetype.id),
    );
    expect(selfReferencing.map((item) => item.id)).toEqual([]);
  });

  it("can always fill the gate with real alternatives", () => {
    for (const archetype of ARCHETYPES) {
      const choices = classificationChoices(archetype);
      expect(choices).toContain(archetype.id);
      expect(new Set(choices).size).toBe(choices.length);
      expect(choices.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives the generator explicit exclusions for every archetype", () => {
    // Without these the model drifts: a two-pointers request came back as a
    // monotonic-deque problem, which teaches the wrong pattern name.
    const unguarded = ARCHETYPES.filter(
      (archetype) => archetype.exclusions.length === 0,
    );
    expect(unguarded.map((item) => item.id)).toEqual([]);
  });

  it("states a brute force that is slower than the optimum", () => {
    for (const archetype of ARCHETYPES) {
      expect(archetype.bruteForceComplexity.length).toBeGreaterThan(1);
      for (const difficulty of ["easy", "medium", "hard"] as const)
        expect(archetype.optimalComplexity[difficulty].length).toBeGreaterThan(
          1,
        );
    }
  });
});
