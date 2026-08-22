import { describe, expect, it } from "vitest";
import { collectMoxieProposals, stripMoxieProposals } from "./proposals";

describe("Moxie proposals", () => {
  it("reads a categorised memory proposal", () => {
    expect(
      collectMoxieProposals("[Remember: preference | Prefers backend roles]"),
    ).toEqual([
      {
        kind: "memory",
        category: "preference",
        statement: "Prefers backend roles",
      },
    ]);
  });

  it("falls back to background for an unknown category", () => {
    const [proposal] = collectMoxieProposals("[Remember: Uses Rust daily]");
    expect(proposal).toEqual({
      kind: "memory",
      category: "background",
      statement: "Uses Rust daily",
    });
  });

  it("reads a goal with and without a target date", () => {
    expect(collectMoxieProposals("[Goal: Land an offer | 2026-06-01]")).toEqual(
      [{ kind: "goal", statement: "Land an offer", targetDate: "2026-06-01" }],
    );
    expect(collectMoxieProposals("[Goal: Land an offer]")).toEqual([
      { kind: "goal", statement: "Land an offer" },
    ]);
  });

  it("ignores a malformed target date rather than storing it", () => {
    const [proposal] = collectMoxieProposals("[Goal: Land an offer | soon]");
    expect(proposal).toEqual({ kind: "goal", statement: "Land an offer" });
  });

  it("dedupes repeated proposals", () => {
    expect(
      collectMoxieProposals(
        "[Remember: target | Stripe] and [Remember: target | Stripe]",
      ),
    ).toHaveLength(1);
  });

  it("strips markers and tidies the leftover whitespace", () => {
    expect(
      stripMoxieProposals(
        "Good plan.\n\n[Remember: target | Stripe]\n[Goal: Offer by June]",
      ),
    ).toBe("Good plan.");
  });

  it("leaves ordinary text untouched", () => {
    expect(collectMoxieProposals("No markers here")).toEqual([]);
    expect(stripMoxieProposals("No markers here")).toBe("No markers here");
  });
});
