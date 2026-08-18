import { z } from "zod";
import { signatureSchema, testCaseSchema } from "@/modules/guru/schema";

export const competencySchema = z.enum([
  "leadership",
  "teamwork",
  "conflict",
  "failure_learning",
  "initiative",
  "technical_decision",
  "communication",
  "ambiguity",
  "impact",
]);
export type Competency = z.infer<typeof competencySchema>;

export const COMPETENCIES = competencySchema.options;
export const COMPETENCY_LABELS: Record<Competency, string> = {
  leadership: "Leadership",
  teamwork: "Teamwork",
  conflict: "Conflict",
  failure_learning: "Failure & learning",
  initiative: "Initiative",
  technical_decision: "Technical decisions",
  communication: "Communication",
  ambiguity: "Ambiguity",
  impact: "Impact",
};

export const interviewTypeSchema = z.enum([
  "behavioral",
  "recruiter_screen",
  "coding",
  "system_design",
  "pm_case",
  "resume_deep_dive",
]);
export type InterviewType = z.infer<typeof interviewTypeSchema>;

export const interviewModalitySchema = z.enum(["text", "voice"]);
export type InterviewModality = z.infer<typeof interviewModalitySchema>;

export const interviewIntensitySchema = z.enum([
  "gentle",
  "realistic",
  "demanding",
]);
export type InterviewIntensity = z.infer<typeof interviewIntensitySchema>;

export const interviewLengthSchema = z.enum(["quick", "standard", "full"]);
export type InterviewLength = z.infer<typeof interviewLengthSchema>;

export const codingDifficultySchema = z.enum(["easy", "medium", "hard"]);
export type CodingDifficulty = z.infer<typeof codingDifficultySchema>;

export const roleTargetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("application"),
    applicationId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("pasted"),
    jobDescription: z.string().trim().min(40),
  }),
  z.object({
    kind: z.literal("url"),
    url: z.url(),
    resolvedDescription: z.string().trim().min(40),
  }),
  z.object({ kind: z.literal("generic"), label: z.string().trim().min(2) }),
]);
export type RoleTarget = z.infer<typeof roleTargetSchema>;

export const interviewConfigSchema = z.object({
  type: interviewTypeSchema,
  modality: interviewModalitySchema,
  intensity: interviewIntensitySchema,
  length: interviewLengthSchema,
  roleTarget: roleTargetSchema,
  difficulty: codingDifficultySchema.optional(),
  language: z.string().trim().min(1).optional(),
});
export type InterviewConfig = z.infer<typeof interviewConfigSchema>;

export const interviewTurnSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["interviewer", "candidate"]),
  content: z.string(),
  competency: competencySchema.nullable().default(null),
  createdAt: z.string().datetime(),
});
export type InterviewTurn = z.infer<typeof interviewTurnSchema>;

export const reportDimensionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  score: z.number().int().min(0).max(100),
  rationale: z.string().min(1),
});
export type ReportDimension = z.infer<typeof reportDimensionSchema>;

export const improvementSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  actionLabel: z.string().min(1),
  href: z.string().min(1),
});
export type Improvement = z.infer<typeof improvementSchema>;

export const interviewReportSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  rationale: z.string().min(1),
  dimensions: z.array(reportDimensionSchema),
  strengths: z.array(z.string().min(1)),
  improvements: z.array(improvementSchema),
  competenciesCovered: z.array(competencySchema).default([]),
  topicsCovered: z.array(z.string().min(1)).default([]),
});
export type InterviewReport = z.infer<typeof interviewReportSchema>;

/**
 * What the interview needs in order to actually run the candidate's code.
 *
 * Present only on problems drawn from the Guru pool. Sessions created before
 * the pool existed, and any created while the judge is unconfigured, carry null
 * here and fall back to the interviewer inferring correctness from an edit log.
 */
export const codingExecutionSchema = z.object({
  /** The problem in the candidate's own namespace, where hidden tests live. */
  problemId: z.string().min(1),
  archetypeId: z.string().min(1),
  signature: signatureSchema,
  tests: z.array(testCaseSchema),
  constraints: z.array(z.string()).default([]),
  expectedComplexity: z.object({ time: z.string(), space: z.string() }),
});
export type CodingExecution = z.infer<typeof codingExecutionSchema>;

export const codingProblemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  topic: z.string().min(1),
  prompt: z.string().min(1),
  edgeCases: z.array(z.string().min(1)).default([]),
  execution: codingExecutionSchema.nullable().default(null),
});
export type StoredCodingProblem = z.infer<typeof codingProblemSchema>;

/**
 * One judged submission during the interview.
 *
 * This is the point of pointing the interview at the pool: the interviewer used
 * to infer correctness from how the candidate typed. Now it is told.
 */
export const codingRunSchema = z.object({
  id: z.string().min(1),
  language: z.string().min(1),
  verdict: z.string().min(1),
  passed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  failedTests: z.array(z.number().int().nonnegative()).default([]),
  createdAt: z.string().datetime(),
});
export type CodingRun = z.infer<typeof codingRunSchema>;

export const interviewSessionSchema = z.object({
  id: z.string().min(1),
  config: interviewConfigSchema,
  status: z.enum(["in_progress", "complete", "abandoned"]),
  roleLabel: z.string().min(1),
  roleDescription: z.string().default(""),
  codingProblem: codingProblemSchema.nullable().default(null),
  codingRuns: z.array(codingRunSchema).default([]),
  turns: z.array(interviewTurnSchema).default([]),
  report: interviewReportSchema.nullable().default(null),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable().default(null),
});
export type InterviewSession = z.infer<typeof interviewSessionSchema>;

/**
 * Kept on the workspace snapshot so the dashboard and readiness can read scores
 * without loading full transcripts, which do not fit in the workspace item.
 */
export const interviewSummarySchema = z.object({
  id: z.string().min(1),
  type: interviewTypeSchema,
  modality: interviewModalitySchema,
  roleLabel: z.string().min(1),
  overallScore: z.number().int().min(0).max(100),
  competenciesCovered: z.array(competencySchema).default([]),
  topicsCovered: z.array(z.string().min(1)).default([]),
  completedAt: z.string().datetime(),
});
export type InterviewSummary = z.infer<typeof interviewSummarySchema>;

export function summarizeSession(
  session: InterviewSession,
): InterviewSummary | null {
  if (!session.report || !session.completedAt) return null;
  return interviewSummarySchema.parse({
    id: session.id,
    type: session.config.type,
    modality: session.config.modality,
    roleLabel: session.roleLabel,
    overallScore: session.report.overallScore,
    competenciesCovered: session.report.competenciesCovered,
    topicsCovered: session.codingProblem
      ? [session.codingProblem.topic]
      : session.report.topicsCovered,
    completedAt: session.completedAt,
  });
}
