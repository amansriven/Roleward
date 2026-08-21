import { z } from "zod";
import {
  workspaceSnapshotSchema,
  type WorkspaceSnapshot,
} from "@/modules/workspace/repository";
import type { PracticeAttempt } from "@/modules/zed/schema";

export const moxieMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(6_000),
});

export const moxieRequestSchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  pathname: z.string().trim().max(500).default("/dashboard"),
  history: z.array(moxieMessageSchema).max(12).default([]),
  workspace: workspaceSnapshotSchema,
});

function clip(value: string, length = 3_000) {
  return value.length <= length ? value : `${value.slice(0, length)}…`;
}

export function buildMoxieContext({
  workspace,
  pathname,
  attempts,
}: {
  workspace: WorkspaceSnapshot;
  pathname: string;
  attempts: PracticeAttempt[];
}) {
  const activeApplication = workspace.applications.find(
    (item) => item.id === workspace.activeApplicationId,
  );
  const activeResume = workspace.resumeVersions.find(
    (item) => item.id === workspace.activeResumeVersionId,
  );
  const confirmedEvidence = workspace.evidence.flatMap((item) =>
    item.claims
      .filter((claim) =>
        ["confirmed", "corrected"].includes(claim.verificationStatus),
      )
      .map((claim) => ({ source: item.title, claim: claim.content })),
  );
  const zed = [...attempts]
    .filter((attempt) => attempt.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 12)
    .map((attempt) => ({
      archetype: attempt.archetypeId,
      difficulty: attempt.difficulty,
      patternCorrect: attempt.classificationCorrect,
      complexityCorrect: attempt.complexityCorrect,
      edgeCasesScore: attempt.edgeCasesScore,
      solved: attempt.solved,
      hints: attempt.hintsUsed,
      runs: attempt.runs,
      completedAt: attempt.completedAt,
    }));

  return JSON.stringify({
    currentPage: pathname,
    candidate: {
      name: workspace.candidateName,
      headline: workspace.candidateHeadline,
      skills: workspace.candidateSkills,
    },
    activeApplication: activeApplication
      ? {
          id: activeApplication.id,
          company: activeApplication.companyName,
          role: activeApplication.roleTitle,
          status: activeApplication.status,
          deadline: activeApplication.deadline,
          interviewDate: activeApplication.interviewDate,
          requirements: activeApplication.requirements,
          jobDescription: clip(activeApplication.jobDescription),
        }
      : null,
    otherApplications: workspace.applications
      .filter((item) => item.id !== activeApplication?.id)
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        company: item.companyName,
        role: item.roleTitle,
        status: item.status,
      })),
    evidence: confirmedEvidence.slice(0, 40),
    evidenceSummary: {
      entries: workspace.evidence.length,
      confirmedClaims: confirmedEvidence.length,
    },
    activeResume: activeResume
      ? {
          id: activeResume.id,
          name: activeResume.name,
          kind: activeResume.kind,
          headline: activeResume.headline,
          bullets: activeResume.items
            .flatMap((item) =>
              item.bullets.map((bullet) => ({
                section: item.title,
                content: bullet.content,
                sourceClaimIds: bullet.sourceClaimIds,
              })),
            )
            .slice(0, 40),
        }
      : null,
    resumeVersions: workspace.resumeVersions.map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      applicationId: item.applicationId,
      updatedAt: item.updatedAt,
    })),
    stageFright: workspace.interviewSummaries.slice(0, 20),
    zed,
  });
}
