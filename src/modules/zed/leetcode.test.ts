import { describe, expect, it } from "vitest";
import { leetCodeHtmlToText, parseLeetCodeUrl } from "./leetcode";

describe("LeetCode companion parsing", () => {
  it("normalizes a problem link and drops query tracking", () => {
    expect(
      parseLeetCodeUrl(
        "https://leetcode.com/problems/two-sum/description/?envType=study-plan",
      ),
    ).toEqual({
      slug: "two-sum",
      url: "https://leetcode.com/problems/two-sum/",
    });
  });

  it("rejects lookalike hosts and non-problem pages", () => {
    expect(() =>
      parseLeetCodeUrl("https://leetcode.com.example.test/problems/two-sum"),
    ).toThrow();
    expect(() => parseLeetCodeUrl("https://leetcode.com/explore/")).toThrow();
  });

  it("turns the statement HTML into coaching context", () => {
    expect(
      leetCodeHtmlToText("<p>Find &lt;x&gt;.</p><pre>nums = [1, 2]</pre>"),
    ).toBe("Find <x>.\nnums = [1, 2]");
  });
});
