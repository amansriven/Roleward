import type { JobRequirement } from "@/modules/applications/schema";

export const READINESS_RULE_VERSION = "readiness-v1" as const;
export type ReadinessLevel =
  "needs_attention" | "developing" | "nearly_ready" | "ready";

export interface ReadinessInput {
  requirements: JobRequirement[];
  resumeReviewed: boolean;
  resumeExported: boolean;
  technicalCoverage: number;
  technicalRecencyDays: number | null;
  behavioralCompetenciesCovered: number;
  behavioralRehearsals: number;
}

export interface ReadinessDimension {
  score: number;
  level: ReadinessLevel;
  explanation: string[];
}

export interface ReadinessAssessment {
  ruleVersion: typeof READINESS_RULE_VERSION;
  application: ReadinessDimension;
  technical: ReadinessDimension;
  behavioral: ReadinessDimension;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
function levelFor(score: number): ReadinessLevel {
  if (score >= 85) return "ready";
  if (score >= 70) return "nearly_ready";
  if (score >= 45) return "developing";
  return "needs_attention";
}

export function assessReadiness(input: ReadinessInput): ReadinessAssessment {
  const confirmed = input.requirements.filter((item) => item.confirmed);
  const required = confirmed.filter((item) => item.importance === "required");
  const strong = required.filter(
    (item) =>
      item.matchStrength === "strong" && item.supportingClaimIds.length > 0,
  );
  const coverage = required.length === 0 ? 0 : strong.length / required.length;
  const applicationScore = clamp(
    coverage * 75 +
      (input.resumeReviewed ? 15 : 0) +
      (input.resumeExported ? 10 : 0),
  );
  const technicalScore = clamp(
    input.technicalCoverage * 0.85 +
      (input.technicalRecencyDays !== null && input.technicalRecencyDays <= 7
        ? 15
        : 0),
  );
  const behavioralScore = clamp(
    Math.min(input.behavioralCompetenciesCovered / 9, 1) * 70 +
      Math.min(input.behavioralRehearsals / 3, 1) * 30,
  );

  return {
    ruleVersion: READINESS_RULE_VERSION,
    application: {
      score: applicationScore,
      level: levelFor(applicationScore),
      explanation: [
        `${strong.length} of ${required.length} required requirements have strong, confirmed evidence.`,
        input.resumeReviewed
          ? "The tailored resume has been reviewed."
          : "The tailored resume still needs review.",
        input.resumeExported
          ? "A final export is ready."
          : "A final export has not been created.",
      ],
    },
    technical: {
      score: technicalScore,
      level: levelFor(technicalScore),
      explanation: [
        `Topic coverage contributes ${clamp(input.technicalCoverage * 0.85)} points.`,
        input.technicalRecencyDays !== null && input.technicalRecencyDays <= 7
          ? "Recent practice adds 15 points."
          : "Complete practice this week to restore the recency signal.",
      ],
    },
    behavioral: {
      score: behavioralScore,
      level: levelFor(behavioralScore),
      explanation: [
        `${input.behavioralCompetenciesCovered} of 9 competencies are covered by verified stories.`,
        `${Math.min(input.behavioralRehearsals, 3)} of 3 foundational rehearsals are complete.`,
      ],
    },
  };
}
