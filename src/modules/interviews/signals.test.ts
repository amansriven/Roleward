import { describe, expect, it } from "vitest";
import { COMPETENCIES, type InterviewSummary } from "./schema";
import { behavioralSignals, nextCompetency, technicalSignals } from "./signals";

const summary = (
  overrides: Partial<InterviewSummary> & Pick<InterviewSummary, "type">,
): InterviewSummary => ({
  id: crypto.randomUUID(),
  modality: "text",
  roleLabel: "Software Engineering role",
  overallScore: 70,
  competenciesCovered: [],
  topicsCovered: [],
  completedAt: new Date("2026-08-01T00:00:00.000Z").toISOString(),
  ...overrides,
});

describe("behavioral signals", () => {
  it("counts distinct competencies across behavioral interviews", () => {
    const signals = behavioralSignals([
      summary({
        type: "behavioral",
        competenciesCovered: ["teamwork", "impact"],
      }),
      summary({ type: "recruiter_screen", competenciesCovered: ["impact"] }),
    ]);
    expect(signals.rehearsals).toBe(2);
    expect(signals.competenciesCovered).toBe(2);
    expect(signals.uncovered).toHaveLength(COMPETENCIES.length - 2);
  });

  it("ignores technical interviews", () => {
    const signals = behavioralSignals([
      summary({ type: "coding", competenciesCovered: ["teamwork"] }),
    ]);
    expect(signals.rehearsals).toBe(0);
    expect(signals.competenciesCovered).toBe(0);
  });
});

describe("technical signals", () => {
  it("reports no coverage without a technical interview", () => {
    expect(technicalSignals([summary({ type: "behavioral" })])).toEqual({
      coverage: 0,
      recencyDays: null,
      attempts: 0,
    });
  });

  it("averages scores and measures recency from the latest attempt", () => {
    const signals = technicalSignals(
      [
        summary({
          type: "coding",
          overallScore: 60,
          completedAt: new Date("2026-08-01T00:00:00.000Z").toISOString(),
        }),
        summary({
          type: "system_design",
          overallScore: 80,
          completedAt: new Date("2026-08-09T00:00:00.000Z").toISOString(),
        }),
      ],
      new Date("2026-08-11T00:00:00.000Z"),
    );
    expect(signals).toEqual({ coverage: 70, recencyDays: 2, attempts: 2 });
  });
});

describe("nextCompetency", () => {
  it("targets a competency that has never been covered", () => {
    const chosen = nextCompetency([
      summary({ type: "behavioral", competenciesCovered: ["leadership"] }),
    ]);
    expect(chosen).not.toBe("leadership");
  });

  it("is stable for an empty history", () => {
    expect(nextCompetency([])).toBe(COMPETENCIES[0]);
  });
});
