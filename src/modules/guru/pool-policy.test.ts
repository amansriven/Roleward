import { describe, expect, it } from "vitest";
import {
  chooseUnseen,
  countUnseen,
  planRefill,
  POOL_CEILING,
  POOL_TARGET,
  REFILL_BATCH,
} from "./pool-policy";

describe("planRefill", () => {
  it("fills an empty cell a batch at a time", () => {
    expect(planRefill(0, 0)).toBe(REFILL_BATCH);
  });
  it("stops once the cell holds its target and nobody is running short", () => {
    expect(planRefill(POOL_TARGET, POOL_TARGET)).toBe(0);
  });
  it("tops up for a candidate who has worked through a full cell", () => {
    // The cell is at target, so only the seen count justifies generating more.
    expect(planRefill(POOL_TARGET, 1)).toBeGreaterThan(0);
  });
  it("refuses to grow a cell past the ceiling", () => {
    expect(planRefill(POOL_CEILING, 0)).toBe(0);
    expect(planRefill(POOL_CEILING - 1, 0)).toBe(1);
  });
});

describe("chooseUnseen", () => {
  it("never returns a problem the candidate has already been given", () => {
    expect(chooseUnseen(["a", "b", "c"], ["a", "b"], () => 0)).toBe("c");
  });
  it("returns null when everything in the cell has been seen", () => {
    expect(chooseUnseen(["a"], ["a"])).toBeNull();
  });
  it("spreads across the unseen set rather than always serving the first", () => {
    const ids = ["a", "b", "c", "d"];
    expect(chooseUnseen(ids, [], () => 0)).toBe("a");
    expect(chooseUnseen(ids, [], () => 0.99)).toBe("d");
  });
});

describe("countUnseen", () => {
  it("counts only what is left for this candidate", () => {
    expect(countUnseen(["a", "b", "c"], ["b"])).toBe(2);
  });
});
