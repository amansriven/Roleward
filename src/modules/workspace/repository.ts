import { z } from "zod";
import {
  candidateProfileSchema,
  type CandidateProfile,
} from "@/modules/candidates/schema";
import {
  evidenceItemSchema,
  type EvidenceItem,
} from "@/modules/evidence/schema";
import {
  jobRequirementSchema,
  type JobRequirement,
} from "@/modules/applications/schema";
import {
  matchRequirements,
  targetApplicationSchema,
  type TargetApplication,
} from "@/modules/applications/workflow";
import { assessReadiness } from "@/modules/readiness/model";
import {
  COMPETENCY_LABELS,
  interviewSummarySchema,
  type InterviewSummary,
} from "@/modules/interviews/schema";
import {
  behavioralSignals,
  nextCompetency,
  technicalSignals,
} from "@/modules/interviews/signals";

export interface StoredApplication extends TargetApplication {
  requirements: JobRequirement[];
}
export interface WorkspaceSnapshot {
  profile: CandidateProfile | null;
  evidence: EvidenceItem[];
  applications: StoredApplication[];
  activeApplicationId: string | null;
  interviewSummaries: InterviewSummary[];
}

export const storedApplicationSchema = targetApplicationSchema.extend({
  requirements: z.array(jobRequirementSchema),
});
export const workspaceSnapshotSchema = z.object({
  profile: candidateProfileSchema.nullable(),
  evidence: z.array(evidenceItemSchema),
  applications: z.array(storedApplicationSchema),
  activeApplicationId: z.string().nullable(),
  // Defaulted so workspace items written before interviews existed still parse.
  interviewSummaries: z.array(interviewSummarySchema).default([]),
});

export const emptyWorkspace: WorkspaceSnapshot = {
  profile: null,
  evidence: [],
  applications: [],
  activeApplicationId: null,
  interviewSummaries: [],
};
export interface RecommendedAction {
  id: string;
  title: string;
  detail: string;
  minutes: number;
  href: string;
  area: "resume" | "coding" | "stories";
}

const keys = {
  profile: "sweet-plus:candidate-profile",
  evidence: "sweet-plus:evidence-library",
  applications: "sweet-plus:applications",
  active: "sweet-plus:active-application-id",
  interviews: "sweet-plus:interview-summaries",
} as const;
export const workspaceUpdatedEvent = "sweet-plus:workspace-updated";
function announceWorkspaceUpdate() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(workspaceUpdatedEvent));
}
function read<T>(
  storage: Pick<Storage, "getItem">,
  key: string,
  fallback: T,
): T {
  try {
    return JSON.parse(storage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

export function loadWorkspace(
  storage: Pick<Storage, "getItem">,
): WorkspaceSnapshot {
  const applications = read<StoredApplication[]>(
    storage,
    keys.applications,
    [],
  );
  const activeId = storage.getItem(keys.active);
  return {
    profile: read<CandidateProfile | null>(storage, keys.profile, null),
    evidence: read<EvidenceItem[]>(storage, keys.evidence, []),
    applications,
    activeApplicationId:
      activeId && applications.some((item) => item.id === activeId)
        ? activeId
        : (applications[0]?.id ?? null),
    interviewSummaries: read<InterviewSummary[]>(storage, keys.interviews, []),
  };
}

export function saveWorkspaceSnapshot(
  storage: Pick<Storage, "setItem">,
  workspace: WorkspaceSnapshot,
) {
  const parsed = workspaceSnapshotSchema.parse(workspace);
  if (parsed.profile)
    storage.setItem(keys.profile, JSON.stringify(parsed.profile));
  else storage.setItem(keys.profile, "null");
  storage.setItem(keys.evidence, JSON.stringify(parsed.evidence));
  storage.setItem(keys.applications, JSON.stringify(parsed.applications));
  storage.setItem(keys.interviews, JSON.stringify(parsed.interviewSummaries));
  if (parsed.activeApplicationId)
    storage.setItem(keys.active, parsed.activeApplicationId);
  else storage.setItem(keys.active, "");
}
export function saveApplication(
  storage: Pick<Storage, "getItem" | "setItem">,
  application: StoredApplication,
) {
  const workspace = loadWorkspace(storage);
  const applications = [
    application,
    ...workspace.applications.filter((item) => item.id !== application.id),
  ];
  storage.setItem(keys.applications, JSON.stringify(applications));
  storage.setItem(keys.active, application.id);
  announceWorkspaceUpdate();
}
export function setActiveApplication(
  storage: Pick<Storage, "setItem">,
  id: string,
) {
  storage.setItem(keys.active, id);
  announceWorkspaceUpdate();
}
export function saveEvidenceAndRefresh(
  storage: Pick<Storage, "getItem" | "setItem">,
  evidence: EvidenceItem[],
) {
  storage.setItem(keys.evidence, JSON.stringify(evidence));
  const workspace = loadWorkspace(storage);
  const applications = workspace.applications.map((application) => ({
    ...application,
    requirements: matchRequirements(application.requirements, evidence),
  }));
  storage.setItem(keys.applications, JSON.stringify(applications));
  announceWorkspaceUpdate();
}
export function saveInterviewSummary(
  storage: Pick<Storage, "getItem" | "setItem">,
  summary: InterviewSummary,
) {
  const workspace = loadWorkspace(storage);
  const summaries = [
    summary,
    ...workspace.interviewSummaries.filter((item) => item.id !== summary.id),
  ];
  storage.setItem(keys.interviews, JSON.stringify(summaries));
  announceWorkspaceUpdate();
}
export function getActiveApplication(workspace: WorkspaceSnapshot) {
  return (
    workspace.applications.find(
      (item) => item.id === workspace.activeApplicationId,
    ) ?? null
  );
}

export function applicationReadiness(
  application: StoredApplication,
  workspace: WorkspaceSnapshot,
) {
  const behavioral = behavioralSignals(workspace.interviewSummaries);
  const technical = technicalSignals(workspace.interviewSummaries);
  return assessReadiness({
    requirements: application.requirements,
    // Real, rather than the hardcoded false this used to pass. Confirming what
    // was read from the résumé is what makes a claim usable anywhere else in
    // the product, so it is the signal worth scoring.
    evidenceConfirmed: workspace.evidence.some((item) =>
      item.claims.some(
        (claim) =>
          claim.verificationStatus === "confirmed" ||
          claim.verificationStatus === "corrected",
      ),
    ),
    technicalCoverage: technical.coverage,
    technicalRecencyDays: technical.recencyDays,
    behavioralCompetenciesCovered: behavioral.competenciesCovered,
    behavioralRehearsals: behavioral.rehearsals,
  });
}
export function recommendActions(
  workspace: WorkspaceSnapshot,
): RecommendedAction[] {
  const app = getActiveApplication(workspace);
  if (!workspace.evidence.length)
    return [
      {
        id: "confirm-evidence",
        title: "Confirm the experience from your résumé",
        detail: "Build the trusted evidence used across Sweet+",
        minutes: 5,
        href: "/dashboard/resume-kitchen/intake",
        area: "resume",
      },
    ];
  if (!app)
    return [
      {
        id: "add-application",
        title: "Add the role you want",
        detail: "Turn a job description into a focused preparation plan",
        minutes: 4,
        href: "/dashboard/applications/new",
        area: "resume",
      },
    ];
  const gap = app.requirements.find(
    (item) => item.importance === "required" && item.matchStrength !== "strong",
  );
  const actions: RecommendedAction[] = [];
  if (gap)
    actions.push({
      id: `gap-${gap.id}`,
      title: `Strengthen: ${gap.content}`,
      detail: "Resume · required evidence gap",
      minutes: 10,
      href: "/dashboard/resume-kitchen",
      area: "resume",
    });
  const technical = technicalSignals(workspace.interviewSummaries);
  actions.push({
    id: "coding-practice",
    title: technical.attempts
      ? "Run another coding interview"
      : "Try your first coding interview",
    detail: technical.attempts
      ? `Coding · last scored ${technical.coverage}%`
      : "Coding · establishes your technical baseline",
    minutes: 30,
    href: "/dashboard/stage-fright/new?type=coding",
    area: "coding",
  });
  const competency = nextCompetency(workspace.interviewSummaries);
  actions.push({
    id: `story-${competency}`,
    title: `Practice a ${COMPETENCY_LABELS[competency].toLowerCase()} question`,
    detail: "Stories · your least-covered competency",
    minutes: 15,
    href: "/dashboard/stage-fright/new?type=behavioral",
    area: "stories",
  });
  return actions.slice(0, 3);
}
