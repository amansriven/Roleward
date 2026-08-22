import { describe, expect, it } from "vitest";
import {
  parseMoxieBlock,
  parseMoxieDraft,
  parseMoxieCoach,
  parseMoxiePlan,
  parseMoxieTable,
} from "./blocks";

describe("Moxie plan blocks", () => {
  it("reads a title and dated steps", () => {
    const plan = parseMoxiePlan(
      "Title: Two weeks to Stripe\n- 2026-03-01 | Finish graph drills\n- Rewrite the summary line",
    );
    expect(plan).toEqual({
      kind: "plan",
      title: "Two weeks to Stripe",
      steps: [
        { text: "Finish graph drills", date: "2026-03-01" },
        { text: "Rewrite the summary line" },
      ],
    });
  });

  it("accepts numbered steps and needs no title", () => {
    const plan = parseMoxiePlan("1. First thing\n2. Second thing");
    expect(plan?.title).toBeUndefined();
    expect(plan?.steps).toHaveLength(2);
  });

  it("keeps a pipe that is not a date as part of the text", () => {
    const plan = parseMoxiePlan("- soon | Finish drills");
    expect(plan?.steps[0]).toEqual({ text: "soon | Finish drills" });
  });

  it("returns null when there are no steps", () => {
    expect(parseMoxiePlan("Title: Empty")).toBeNull();
  });
});

describe("Moxie coach blocks", () => {
  it("separates the reading from the measurement", () => {
    expect(
      parseMoxieCoach(
        "Observation: You sounded rushed\nEvidence: 162 words per minute\nDrill: Re-record at 130 wpm",
      ),
    ).toEqual({
      kind: "coach",
      observation: "You sounded rushed",
      evidence: "162 words per minute",
      drill: "Re-record at 130 wpm",
    });
  });

  it("needs only an observation", () => {
    expect(parseMoxieCoach("Observation: Solid close")).toEqual({
      kind: "coach",
      observation: "Solid close",
    });
  });

  it("returns null without an observation", () => {
    expect(parseMoxieCoach("Evidence: 162 wpm")).toBeNull();
  });
});

describe("Moxie block dispatch", () => {
  it("only claims its own fences", () => {
    expect(parseMoxieBlock("moxie-plan", "- Step")).not.toBeNull();
    expect(parseMoxieBlock("python", "- Step")).toBeNull();
    expect(parseMoxieBlock("", "- Step")).toBeNull();
  });
});

describe("Moxie tables", () => {
  it("reads a pipe table and reports where it ends", () => {
    const lines = [
      "| Role | Fit |",
      "| --- | --- |",
      "| Stripe | Strong |",
      "| Figma | Partial |",
      "",
      "After.",
    ];
    const result = parseMoxieTable(lines, 0);
    expect(result?.table.headers).toEqual(["Role", "Fit"]);
    expect(result?.table.rows).toEqual([
      ["Stripe", "Strong"],
      ["Figma", "Partial"],
    ]);
    expect(result?.next).toBe(4);
  });

  it("accepts alignment markers in the divider", () => {
    expect(
      parseMoxieTable(["| A | B |", "|:---|---:|", "| 1 | 2 |"], 0),
    ).not.toBeNull();
  });

  it("ignores a table with no body rows", () => {
    expect(parseMoxieTable(["| A | B |", "| --- | --- |"], 0)).toBeNull();
  });

  it("ignores ordinary prose containing a pipe", () => {
    expect(parseMoxieTable(["a | b", "plain text"], 0)).toBeNull();
  });
});

describe("Moxie draft blocks", () => {
  it("reads the label, target, bullet id, and body", () => {
    expect(
      parseMoxieDraft(
        "Kind: Resume bullet\nTarget: Stripe · Backend\nBullet: b1\nRewrote the ledger service to cut p99 latency to 120ms.",
      ),
    ).toEqual({
      kind: "draft",
      label: "Resume bullet",
      target: "Stripe · Backend",
      bulletId: "b1",
      text: "Rewrote the ledger service to cut p99 latency to 120ms.",
    });
  });

  it("keeps a multi-line body intact", () => {
    const draft = parseMoxieDraft(
      "Kind: STAR story\nFirst line.\nSecond line.",
    );
    expect(draft?.text).toBe("First line.\nSecond line.");
    expect(draft?.bulletId).toBeUndefined();
  });

  it("defaults the label and omits an absent target", () => {
    const draft = parseMoxieDraft("Some text");
    expect(draft?.label).toBe("Draft");
    expect(draft?.target).toBeUndefined();
  });

  it("returns null when only fields are given", () => {
    expect(parseMoxieDraft("Kind: Resume bullet\nBullet: b1")).toBeNull();
  });

  it("dispatches its own fence", () => {
    expect(parseMoxieBlock("moxie-draft", "Kind: X\nBody")).not.toBeNull();
  });
});
