import type { JobRequirement } from "@/modules/applications/schema";

export const READINESS_RULE_VERSION = "readiness-v2" as const;
export type ReadinessLevel =
  "needs_attention" | "developing" | "nearly_ready" | "ready";

export interface ReadinessInput {
  requirements: JobRequirement[];
  /** The candidate has confirmed or corrected what was read from their resume. */
  evidenceConfirmed: boolean;
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
  // Requirements are read from the posting now, so they mean something before
  // anyone ticks a box. Scoring zero because a confirmation step was skipped
  // told the candidate they had no coverage when they had not been asked yet.
  const confirmed = input.requirements.filter((item) => item.confirmed);
  const basis = confirmed.length ? confirmed : input.requirements;
  const unconfirmedBasis = confirmed.length === 0 && basis.length > 0;

  const required = basis.filter((item) => item.importance === "required");
  const strong = required.filter(
    (item) =>
      item.matchStrength === "strong" && item.supportingClaimIds.length > 0,
  );
  const coverage = required.length === 0 ? 0 : strong.length / required.length;
  const applicationScore = clamp(
    coverage * 85 + (input.evidenceConfirmed ? 15 : 0),
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
        ...(unconfirmedBasis
          ? [
              "These requirements have not been confirmed yet, so they are counted as read from the posting.",
            ]
          : []),
        input.evidenceConfirmed
          ? "Your resume evidence has been reviewed and confirmed."
          : "Confirm what was read from your resume to make it usable here.",
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
