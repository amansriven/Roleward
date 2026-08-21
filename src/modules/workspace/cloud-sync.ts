"use client";

import {
  emptyWorkspace,
  loadWorkspace,
  saveWorkspaceSnapshot,
  workspaceSnapshotSchema,
  workspaceUpdatedEvent,
  type WorkspaceSnapshot,
} from "./repository";

interface CloudWorkspace {
  workspace: WorkspaceSnapshot;
  version: number;
  updatedAt: string | null;
}

export type WorkspaceSyncFailure =
  | "unconfigured"
  | "table_not_found"
  | "credentials"
  | "access_denied"
  | "storage_error";

export class WorkspaceSyncError extends Error {
  constructor(public code: WorkspaceSyncFailure) {
    super(code);
    this.name = "WorkspaceSyncError";
  }
}

let cloudVersion: number | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncing: Promise<void> | null = null;

function hasData(workspace: WorkspaceSnapshot) {
  return Boolean(
    workspace.profile ||
    workspace.candidateContact ||
    workspace.evidence.length ||
    workspace.resumeVersions.length ||
    workspace.applications.length ||
    workspace.interviewSummaries.length,
  );
}

function dedupeById<T extends { id: string }>(items: T[]) {
  return items.filter(
    (item, index, all) =>
      all.findIndex((other) => other.id === item.id) === index,
  );
}

export function mergeForMigration(
  remote: WorkspaceSnapshot,
  local: WorkspaceSnapshot,
): WorkspaceSnapshot {
  const applications = remote.applications.length
    ? remote.applications
    : local.applications;
  const activeApplicationId =
    remote.activeApplicationId &&
    applications.some((item) => item.id === remote.activeApplicationId)
      ? remote.activeApplicationId
      : local.activeApplicationId &&
          applications.some((item) => item.id === local.activeApplicationId)
        ? local.activeApplicationId
        : (applications[0]?.id ?? null);
  return workspaceSnapshotSchema.parse({
    candidateName: remote.candidateName ?? local.candidateName,
    candidateHeadline: remote.candidateHeadline ?? local.candidateHeadline,
    candidateContact: remote.candidateContact ?? local.candidateContact,
    candidateSkills: remote.candidateSkills.length
      ? remote.candidateSkills
      : local.candidateSkills,
    resumeVersions: remote.resumeVersions.length
      ? remote.resumeVersions
      : local.resumeVersions,
    activeResumeVersionId:
      remote.activeResumeVersionId ?? local.activeResumeVersionId,
    profile: remote.profile ?? local.profile,
    evidence: remote.evidence.length ? remote.evidence : local.evidence,
    applications,
    activeApplicationId,
    interviewSummaries: dedupeById([
      ...remote.interviewSummaries,
      ...local.interviewSummaries,
    ]),
  });
}

async function readCloud(): Promise<CloudWorkspace | null> {
  const response = await fetch("/api/workspace", { cache: "no-store" });
  if (response.status === 503) {
    const body = (await response.json().catch(() => null)) as {
      code?: WorkspaceSyncFailure;
    } | null;
    if (!body?.code) return null;
    throw new WorkspaceSyncError(body.code);
  }
  if (!response.ok) throw new Error("Unable to load the cloud workspace");
  const data = (await response.json()) as CloudWorkspace;
  return {
    ...data,
    workspace: workspaceSnapshotSchema.parse(data.workspace),
  };
}

async function writeCloud(workspace: WorkspaceSnapshot, version: number) {
  return fetch("/api/workspace", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspace, version }),
  });
}

export async function hydrateCloudWorkspace(storage: Storage) {
  const cloud = await readCloud();
  if (!cloud) return "unconfigured" as const;
  cloudVersion = cloud.version;
  const local = loadWorkspace(storage);
  const merged = mergeForMigration(cloud.workspace, local);
  saveWorkspaceSnapshot(storage, merged);
  if (JSON.stringify(merged) !== JSON.stringify(cloud.workspace)) {
    const response = await writeCloud(merged, cloud.version);
    if (response.ok) {
      const result = (await response.json()) as { version: number };
      cloudVersion = result.version;
    }
  }
  window.dispatchEvent(
    new CustomEvent(workspaceUpdatedEvent, { detail: { source: "cloud" } }),
  );
  return "cloud" as const;
}

async function persist(storage: Storage) {
  if (syncing) return syncing;
  syncing = (async () => {
    let version = cloudVersion;
    if (version === null) {
      const cloud = await readCloud();
      if (!cloud) return;
      version = cloud.version;
      cloudVersion = version;
    }
    const local = loadWorkspace(storage);
    let response = await writeCloud(local, version);
    if (response.status === 409) {
      const latest = await readCloud();
      if (!latest) return;
      const merged = workspaceSnapshotSchema.parse({
        ...latest.workspace,
        ...local,
        evidence: dedupeById([...latest.workspace.evidence, ...local.evidence]),
        applications: dedupeById([
          ...latest.workspace.applications,
          ...local.applications,
        ]),
        interviewSummaries: dedupeById([
          ...latest.workspace.interviewSummaries,
          ...local.interviewSummaries,
        ]),
        resumeVersions: dedupeById([
          ...local.resumeVersions,
          ...latest.workspace.resumeVersions,
        ]),
      });
      response = await writeCloud(merged, latest.version);
      if (response.ok) saveWorkspaceSnapshot(storage, merged);
    }
    if (!response.ok) throw new Error("Unable to save the cloud workspace");
    const result = (await response.json()) as { version: number };
    cloudVersion = result.version;
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}

export function scheduleCloudWorkspaceSave(storage: Storage) {
  if (!hasData(loadWorkspace(storage))) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void persist(storage), 350);
}

export { emptyWorkspace };
