import { describe, expect, it } from "vitest";
import { applySmartEnter, applyTab } from "./editor";

describe("Zed editor indentation", () => {
  it("indents after a Python colon", () => {
    expect(
      applySmartEnter("if ready:", { start: 9, end: 9 }, "python"),
    ).toEqual({
      value: "if ready:\n    ",
      selection: { start: 14, end: 14 },
    });
  });

  it("dedents Python clause keywords before opening their block", () => {
    const edit = applySmartEnter("    else:", { start: 9, end: 9 }, "python");
    expect(edit.value).toBe("else:\n    ");
    expect(edit.selection.start).toBe(10);
  });

  it("dedents after a terminal Python statement", () => {
    const edit = applySmartEnter(
      "    return answer",
      { start: 17, end: 17 },
      "python",
    );
    expect(edit.value).toBe("    return answer\n");
  });

  it("creates an indented line between braces", () => {
    const edit = applySmartEnter(
      "function run() {}",
      { start: 16, end: 16 },
      "typescript",
    );
    expect(edit.value).toBe("function run() {\n    \n}");
    expect(edit.selection.start).toBe(21);
  });

  it("indents and unindents a multiline selection", () => {
    const indented = applyTab("one\ntwo", { start: 0, end: 7 }, false);
    expect(indented.value).toBe("    one\n    two");
    const restored = applyTab(indented.value, { start: 4, end: 15 }, true);
    expect(restored.value).toBe("one\ntwo");
  });
});
