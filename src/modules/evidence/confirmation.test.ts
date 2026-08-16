import { describe, expect, it } from "vitest";
import { finalizeConfirmedEvidence } from "./confirmation";

describe("evidence confirmation", () => {
  it("persists only explicitly confirmed or corrected claims", () => {
    const result = finalizeConfirmedEvidence([
      {
        id: "project-1",
        type: "project",
        title: "Campus Cart",
        summary: "A marketplace",
        verificationStatus: "proposed",
        claims: [
          {
            id: "a",
            type: "action",
            content: "Built an API",
            verificationStatus: "confirmed",
          },
          {
            id: "b",
            type: "metric",
            content: "Used by millions",
            verificationStatus: "proposed",
          },
          {
            id: "c",
            type: "outcome",
            content: "Guaranteed revenue",
            verificationStatus: "rejected",
          },
        ],
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.claims.map((claim) => claim.id)).toEqual(["a"]);
    expect(result[0]?.verificationStatus).toBe("confirmed");
  });

  it("drops an evidence item with no verified claims", () => {
    const result = finalizeConfirmedEvidence([
      {
        id: "project-1",
        type: "project",
        title: "Unknown",
        summary: "Unverified",
        verificationStatus: "proposed",
        claims: [
          {
            id: "a",
            type: "metric",
            content: "Unverified metric",
            verificationStatus: "proposed",
          },
        ],
      },
    ]);
    expect(result).toEqual([]);
  });
});
