import { describe, expect, it } from "vitest";
import { ArityError, normalizeTestInputs } from "./test-inputs";
import type { Signature } from "./schema";

const signature = (count: number): Signature => ({
  name: "solve",
  parameters: Array.from({ length: count }, (_, index) => ({
    name: `arg${index}`,
    type: "int[]" as const,
    description: "an argument",
  })),
  returnType: "int",
});

describe("normalizeTestInputs", () => {
  it("leaves correctly shaped inputs alone", () => {
    const { inputs, fixes } = normalizeTestInputs(signature(2), [[[1], 2]]);
    expect(inputs).toEqual([[[1], 2]]);
    expect(fixes).toEqual(["exact"]);
  });

  it("wraps a bare list handed to a single-parameter function", () => {
    // `[1,3,5]` for solve(nums) can only have meant one argument, and calling
    // it with three is the TypeError that rejected valid drafts.
    const { inputs, fixes } = normalizeTestInputs(signature(1), [[1, 3, 5]]);
    expect(inputs).toEqual([[[1, 3, 5]]]);
    expect(fixes).toEqual(["wrapped"]);
  });

  it("keeps an already-wrapped single argument as it is", () => {
    expect(normalizeTestInputs(signature(1), [[[1, 3, 5]]]).inputs).toEqual([
      [[1, 3, 5]],
    ]);
  });

  it("refuses to guess when a multi-parameter count does not line up", () => {
    expect(() => normalizeTestInputs(signature(3), [[1, 2]])).toThrow(
      ArityError,
    );
  });
});
