import { describe, expect, it } from "vitest";
import { assessReadiness } from "./model";

const requirement = (
  id: string,
  matchStrength: "none" | "weak" | "strong",
  claims: string[] = [],
) => ({
  id,
  category: "skill" as const,
  importance: "required" as const,
  content: id,
  confirmed: true,
  matchStrength,
  supportingClaimIds: claims,
});

describe("assessReadiness", () => {
  it("does not count unsupported requirement matches", () => {
    const result = assessReadiness({
      requirements: [
        requirement("api", "strong"),
        requirement("sql", "strong", ["claim-1"]),
      ],
      resumeReviewed: false,
      resumeExported: false,
      technicalCoverage: 0,
      technicalRecencyDays: null,
      behavioralCompetenciesCovered: 0,
      behavioralRehearsals: 0,
    });
    expect(result.application.score).toBe(38);
    expect(result.application.explanation[0]).toContain("1 of 2");
  });

  it("produces ready only after sufficient deterministic signals", () => {
    const result = assessReadiness({
      requirements: [requirement("api", "strong", ["claim-1"])],
      resumeReviewed: true,
      resumeExported: true,
      technicalCoverage: 90,
      technicalRecencyDays: 2,
      behavioralCompetenciesCovered: 9,
      behavioralRehearsals: 3,
    });
    expect(result.application.level).toBe("ready");
    expect(result.technical.level).toBe("ready");
    expect(result.behavioral.level).toBe("ready");
  });
});
