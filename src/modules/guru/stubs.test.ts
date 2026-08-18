import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@/modules/execution/port";
import { renderStub } from "./stubs";
import { signatureSchema } from "./schema";

const signature = signatureSchema.parse({
  name: "max_sum",
  parameters: [
    { name: "nums", type: "int[]", description: "Readings" },
    { name: "window_size", type: "int", description: "Window size" },
  ],
  returnType: "int",
});

describe("renderStub", () => {
  it("produces a stub for every editor language", () => {
    for (const language of LANGUAGES) {
      const stub = renderStub(signature, language);
      expect(stub.length, language).toBeGreaterThan(20);
      expect(stub, language).toContain("nums");
    }
  });

  it("applies each language's own naming convention", () => {
    expect(renderStub(signature, "python")).toContain(
      "def max_sum(nums: list[int], window_size: int) -> int",
    );
    expect(renderStub(signature, "typescript")).toContain(
      "function maxSum(nums: number[], windowSize: number): number",
    );
    expect(renderStub(signature, "go")).toContain(
      "func MaxSum(nums []int, windowSize int) int",
    );
    expect(renderStub(signature, "rust")).toContain(
      "fn max_sum(nums: Vec<i64>, window_size: i64) -> i64",
    );
  });

  it("wraps in the class shape those languages actually expect", () => {
    expect(renderStub(signature, "java")).toContain("class Solution");
    expect(renderStub(signature, "cpp")).toContain("class Solution");
    expect(renderStub(signature, "kotlin")).not.toContain("class Solution");
  });
});
