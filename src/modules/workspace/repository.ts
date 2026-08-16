import type { CandidateProfile } from "@/modules/candidates/schema";
import type { EvidenceItem } from "@/modules/evidence/schema";
import type { JobRequirement } from "@/modules/applications/schema";
import {
  matchRequirements,
  type TargetApplication,
} from "@/modules/applications/workflow";
import { assessReadiness } from "@/modules/readiness/model";

export interface StoredApplication extends TargetApplication {
  requirements: JobRequirement[];
}
export interface WorkspaceSnapshot {
  profile: CandidateProfile | null;
  evidence: EvidenceItem[];
  applications: StoredApplication[];
  activeApplicationId: string | null;
}
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
} as const;
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
  };
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
}
export function setActiveApplication(
  storage: Pick<Storage, "setItem">,
  id: string,
) {
  storage.setItem(keys.active, id);
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
}
export function getActiveApplication(workspace: WorkspaceSnapshot) {
  return (
    workspace.applications.find(
      (item) => item.id === workspace.activeApplicationId,
    ) ?? null
  );
}

export function applicationReadiness(application: StoredApplication) {
  return assessReadiness({
    requirements: application.requirements,
    resumeReviewed: false,
    resumeExported: false,
    technicalCoverage: 0,
    technicalRecencyDays: null,
    behavioralCompetenciesCovered: 0,
    behavioralRehearsals: 0,
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
  actions.push(
    {
      id: "coding-graph",
      title: "Practice graph traversal",
      detail: "Coding · target-role fundamentals",
      minutes: 30,
      href: "/dashboard/guru",
      area: "coding",
    },
    {
      id: "story-conflict",
      title: "Rehearse a collaboration story",
      detail: "Stories · behavioral coverage",
      minutes: 15,
      href: "/dashboard/stage-fright",
      area: "stories",
    },
  );
  return actions.slice(0, 3);
}
