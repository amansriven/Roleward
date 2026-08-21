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
import {
  createOriginalResumeVersion,
  forkResumeVersion,
  resumeVersionSchema,
  updateResumeVersion as updateVersionSnapshot,
  type ResumeVersion,
} from "@/modules/resume-kitchen/versions";

export interface StoredApplication extends TargetApplication {
  requirements: JobRequirement[];
}
export interface CandidateSkillGroup {
  category: string;
  skills: string[];
}
export interface WorkspaceSnapshot {
  /** Read from the résumé, and the basis for the portfolio handle. */
  candidateName: string | null;
  candidateHeadline: string | null;
  candidateSkills: CandidateSkillGroup[];
  resumeVersions: ResumeVersion[];
  activeResumeVersionId: string | null;
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
  // Defaulted so workspace items written before the résumé was read still parse.
  candidateName: z.string().nullable().default(null),
  candidateHeadline: z.string().nullable().default(null),
  candidateSkills: z
    .array(
      z.object({
        category: z.string().trim(),
        skills: z.array(z.string().trim().min(1)),
      }),
    )
    .default([]),
  resumeVersions: z.array(resumeVersionSchema).default([]),
  activeResumeVersionId: z.string().nullable().default(null),
  profile: candidateProfileSchema.nullable(),
  evidence: z.array(evidenceItemSchema),
  applications: z.array(storedApplicationSchema),
  activeApplicationId: z.string().nullable(),
  // Defaulted so workspace items written before interviews existed still parse.
  interviewSummaries: z.array(interviewSummarySchema).default([]),
});

export const emptyWorkspace: WorkspaceSnapshot = {
  candidateName: null,
  candidateHeadline: null,
  candidateSkills: [],
  resumeVersions: [],
  activeResumeVersionId: null,
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
  profile: "backstage:candidate-profile",
  evidence: "backstage:evidence-library",
  applications: "backstage:applications",
  active: "backstage:active-application-id",
  interviews: "backstage:interview-summaries",
  candidate: "backstage:candidate-identity",
  resumeVersions: "backstage:resume-versions",
  activeResumeVersion: "backstage:active-resume-version-id",
} as const;
export const workspaceUpdatedEvent = "backstage:workspace-updated";
const priorStoragePrefix = ["sweet", "plus"].join("-");

function announceWorkspaceUpdate() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(workspaceUpdatedEvent));
}

function storedValue(storage: Pick<Storage, "getItem">, key: string) {
  const current = storage.getItem(key);
  if (current !== null) return current;

  const separator = key.indexOf(":");
  const suffix = separator === -1 ? key : key.slice(separator + 1);
  return storage.getItem(`${priorStoragePrefix}:${suffix}`);
}

function read<T>(
  storage: Pick<Storage, "getItem">,
  key: string,
  fallback: T,
): T {
  try {
    return JSON.parse(storedValue(storage, key) ?? "") as T;
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
  const activeId = storedValue(storage, keys.active);
  const identity = read<{
    name: string | null;
    headline: string | null;
    skills?: CandidateSkillGroup[];
  }>(storage, keys.candidate, { name: null, headline: null });
  const evidence = read<EvidenceItem[]>(storage, keys.evidence, []);
  let resumeVersions = read<unknown[]>(
    storage,
    keys.resumeVersions,
    [],
  ).flatMap((value) => {
    const parsed = resumeVersionSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
  // Workspaces created before version history use the current confirmed
  // evidence as the only original snapshot still available.
  if (!resumeVersions.length && evidence.length)
    resumeVersions = [
      createOriginalResumeVersion({
        id: "legacy-original",
        name: "Original résumé",
        evidence,
        headline: identity.headline ?? "",
        skills: identity.skills ?? [],
        now: "2000-01-01T00:00:00.000Z",
      }),
    ];
  const requestedResumeVersion = storedValue(storage, keys.activeResumeVersion);
  return {
    candidateName: identity.name,
    candidateHeadline: identity.headline,
    candidateSkills: identity.skills ?? [],
    resumeVersions,
    activeResumeVersionId:
      requestedResumeVersion &&
      resumeVersions.some((version) => version.id === requestedResumeVersion)
        ? requestedResumeVersion
        : (resumeVersions[0]?.id ?? null),
    profile: read<CandidateProfile | null>(storage, keys.profile, null),
    evidence,
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
  storage.setItem(
    keys.candidate,
    JSON.stringify({
      name: parsed.candidateName,
      headline: parsed.candidateHeadline,
      skills: parsed.candidateSkills,
    }),
  );
  storage.setItem(keys.evidence, JSON.stringify(parsed.evidence));
  storage.setItem(keys.resumeVersions, JSON.stringify(parsed.resumeVersions));
  storage.setItem(keys.activeResumeVersion, parsed.activeResumeVersionId ?? "");
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
/**
 * Updates one application in place.
 *
 * Status and dates are the only things a candidate edits after intake, and both
 * were previously unreachable: status was fixed at "preparing" and the deadline
 * was collected once and never shown again.
 */
export function updateApplication(
  storage: Pick<Storage, "getItem" | "setItem">,
  id: string,
  patch: Partial<
    Pick<StoredApplication, "status" | "deadline" | "interviewDate">
  >,
) {
  const workspace = loadWorkspace(storage);
  const applications = workspace.applications.map((item) =>
    item.id === id ? { ...item, ...patch } : item,
  );
  storage.setItem(keys.applications, JSON.stringify(applications));
  announceWorkspaceUpdate();
  return applications.find((item) => item.id === id) ?? null;
}

/** Recorded when a résumé is read, since nothing else in the product asks. */
export function saveCandidateIdentity(
  storage: Pick<Storage, "getItem" | "setItem">,
  name: string,
  headline: string,
  skills?: CandidateSkillGroup[],
) {
  const current = loadWorkspace(storage);
  storage.setItem(
    keys.candidate,
    JSON.stringify({
      name: name || current.candidateName,
      headline: headline || current.candidateHeadline,
      skills: skills ?? current.candidateSkills,
    }),
  );
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

export function saveOriginalResumeVersion(
  storage: Pick<Storage, "getItem" | "setItem">,
  name: string,
  evidence: EvidenceItem[],
) {
  const workspace = loadWorkspace(storage);
  const version = createOriginalResumeVersion({
    id: crypto.randomUUID(),
    name,
    evidence,
    headline: workspace.candidateHeadline ?? "",
    skills: workspace.candidateSkills,
    now: new Date().toISOString(),
  });
  storage.setItem(
    keys.resumeVersions,
    JSON.stringify([version, ...workspace.resumeVersions]),
  );
  storage.setItem(keys.activeResumeVersion, version.id);
  announceWorkspaceUpdate();
  return version;
}

export function createResumeRevision(
  storage: Pick<Storage, "getItem" | "setItem">,
  sourceVersionId: string,
  name: string,
  applicationId?: string,
) {
  const workspace = loadWorkspace(storage);
  const source = workspace.resumeVersions.find(
    (version) => version.id === sourceVersionId,
  );
  if (!source) throw new Error("Source résumé version was not found");
  const revision = forkResumeVersion({
    source,
    id: crypto.randomUUID(),
    name,
    applicationId,
    now: new Date().toISOString(),
  });
  storage.setItem(
    keys.resumeVersions,
    JSON.stringify([revision, ...workspace.resumeVersions]),
  );
  storage.setItem(keys.activeResumeVersion, revision.id);
  announceWorkspaceUpdate();
  return revision;
}

export function updateResumeVersion(
  storage: Pick<Storage, "getItem" | "setItem">,
  versionId: string,
  patch: {
    name?: string;
    headline?: string;
    skills?: ResumeVersion["skills"];
    items?: ResumeVersion["items"];
  },
) {
  const workspace = loadWorkspace(storage);
  const current = workspace.resumeVersions.find(
    (version) => version.id === versionId,
  );
  if (!current) throw new Error("Résumé version was not found");
  const updated = updateVersionSnapshot(
    current,
    patch,
    new Date().toISOString(),
  );
  storage.setItem(
    keys.resumeVersions,
    JSON.stringify(
      workspace.resumeVersions.map((version) =>
        version.id === versionId ? updated : version,
      ),
    ),
  );
  announceWorkspaceUpdate();
  return updated;
}

export function setActiveResumeVersion(
  storage: Pick<Storage, "setItem">,
  versionId: string,
) {
  storage.setItem(keys.activeResumeVersion, versionId);
  announceWorkspaceUpdate();
}

export function getActiveResumeVersion(workspace: WorkspaceSnapshot) {
  return (
    workspace.resumeVersions.find(
      (version) => version.id === workspace.activeResumeVersionId,
    ) ??
    workspace.resumeVersions[0] ??
    null
  );
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
        detail: "Build the trusted evidence used across Backstage",
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
      href: "/dashboard/resume-kitchen/tailor",
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
