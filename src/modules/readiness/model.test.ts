import { describe, expect, it } from "vitest";
import { assessReadiness } from "./model";

const requirement = (
  id: string,
  matchStrength: "none" | "weak" | "strong",
  claims: string[] = [],
  confirmed = true,
) => ({
  id,
  category: "skill" as const,
  importance: "required" as const,
  content: id,
  confirmed,
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
      evidenceConfirmed: false,
      technicalCoverage: 0,
      technicalRecencyDays: null,
      behavioralCompetenciesCovered: 0,
      behavioralRehearsals: 0,
    });
    expect(result.application.score).toBe(43);
    expect(result.application.explanation[0]).toContain("1 of 2");
  });

  it("produces ready only after sufficient deterministic signals", () => {
    const result = assessReadiness({
      requirements: [requirement("api", "strong", ["claim-1"])],
      evidenceConfirmed: true,
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

const base = {
  technicalCoverage: 0,
  technicalRecencyDays: null,
  behavioralCompetenciesCovered: 0,
  behavioralRehearsals: 0,
};

describe("the application dimension", () => {
  it("can reach 100 on evidence alone", () => {
    // It could not before: ten of the points were awarded for exporting a
    // resume, which nothing in the product does, so everyone was capped at 90.
    const result = assessReadiness({
      ...base,
      requirements: [requirement("api", "strong", ["claim-1"])],
      evidenceConfirmed: true,
    });
    expect(result.application.score).toBe(100);
  });

  it("counts requirements that were read but never confirmed", () => {
    // Coverage used to be computed only over confirmed requirements, so a
    // candidate who skipped that step was told they had none.
    const result = assessReadiness({
      ...base,
      requirements: [requirement("api", "strong", ["claim-1"], false)],
      evidenceConfirmed: true,
    });
    expect(result.application.score).toBe(100);
    expect(result.application.explanation.join(" ")).toContain(
      "not been confirmed yet",
    );
  });

  it("prefers confirmed requirements once any exist", () => {
    const result = assessReadiness({
      ...base,
      requirements: [
        requirement("api", "strong", ["claim-1"], true),
        requirement("sql", "none", [], false),
      ],
      evidenceConfirmed: true,
    });
    // The unconfirmed miss is excluded, so coverage stays whole.
    expect(result.application.score).toBe(100);
  });

  it("says what to do when the resume has not been confirmed", () => {
    const result = assessReadiness({
      ...base,
      requirements: [requirement("api", "strong", ["claim-1"])],
      evidenceConfirmed: false,
    });
    expect(result.application.score).toBe(85);
    expect(result.application.explanation.join(" ")).toContain(
      "Confirm what was read from your resume",
    );
  });
});
