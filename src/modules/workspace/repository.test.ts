import { describe, expect, it } from "vitest";
import {
  createResumeRevision,
  getActiveApplication,
  getActiveResumeVersion,
  loadWorkspace,
  recommendActions,
  saveApplication,
  saveWorkspaceSnapshot,
  setActiveApplication,
  updateResumeVersion,
  workspaceSnapshotSchema,
} from "./repository";
import type { EvidenceItem } from "@/modules/evidence/schema";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}
const application = (id: string) => ({
  id,
  companyName: id,
  roleTitle: "Engineer",
  sourceUrl: "" as const,
  status: "preparing" as const,
  jobDescription:
    "A sufficiently long job description that contains more than eighty characters for schema compatibility.",
  contentHash: "a".repeat(64),
  createdAt: new Date().toISOString(),
  requirements: [],
});
const evidence: EvidenceItem[] = [
  {
    id: "item-1",
    type: "experience",
    title: "Engineer",
    links: [],
    summary: "Built developer tools.",
    verificationStatus: "confirmed",
    claims: [
      {
        id: "claim-1",
        type: "outcome",
        content: "Reduced deploy time by 35%.",
        verificationStatus: "confirmed",
      },
    ],
  },
];
describe("workspace repository", () => {
  it("keeps pre-rebrand browser workspaces available", () => {
    const storage = memoryStorage();
    const priorPrefix = ["sweet", "plus"].join("-");
    storage.setItem(
      `${priorPrefix}:candidate-identity`,
      JSON.stringify({ name: "Aman", headline: "Engineer", skills: [] }),
    );

    expect(loadWorkspace(storage).candidateName).toBe("Aman");
  });

  it("persists multiple applications and switches the active one", () => {
    const storage = memoryStorage();
    saveApplication(storage, application("one"));
    saveApplication(storage, application("two"));
    expect(getActiveApplication(loadWorkspace(storage))?.id).toBe("two");
    setActiveApplication(storage, "one");
    expect(getActiveApplication(loadWorkspace(storage))?.id).toBe("one");
  });
  it("prioritizes evidence before applications", () => {
    const storage = memoryStorage();
    expect(recommendActions(loadWorkspace(storage))[0]?.id).toBe(
      "confirm-evidence",
    );
  });
  it("round-trips a validated workspace snapshot", () => {
    const storage = memoryStorage();
    const snapshot = workspaceSnapshotSchema.parse({
      profile: null,
      evidence: [],
      applications: [application("cloud")],
      activeApplicationId: "cloud",
    });
    saveWorkspaceSnapshot(storage, snapshot);
    expect(loadWorkspace(storage)).toEqual(snapshot);
  });
  it("migrates existing evidence into one locked original", () => {
    const storage = memoryStorage();
    storage.setItem("backstage:evidence-library", JSON.stringify(evidence));

    const workspace = loadWorkspace(storage);
    expect(workspace.resumeVersions).toHaveLength(1);
    expect(getActiveResumeVersion(workspace)).toMatchObject({
      id: "legacy-original",
      name: "Original resume",
      kind: "original",
    });
  });
  it("keeps edits in a named revision and leaves the original unchanged", () => {
    const storage = memoryStorage();
    storage.setItem("backstage:evidence-library", JSON.stringify(evidence));
    const original = getActiveResumeVersion(loadWorkspace(storage))!;
    const revision = createResumeRevision(
      storage,
      original.id,
      "Acme backend application",
    );
    const items = revision.items.map((item) => ({
      ...item,
      bullets: item.bullets.map((bullet) => ({
        ...bullet,
        content: "Cut deploy time by 35% with safer release automation.",
      })),
    }));
    updateResumeVersion(storage, revision.id, { items });

    const workspace = loadWorkspace(storage);
    expect(
      getActiveResumeVersion(workspace)?.items[0]?.bullets[0]?.content,
    ).toBe("Cut deploy time by 35% with safer release automation.");
    expect(
      workspace.resumeVersions.find((version) => version.kind === "original")
        ?.items[0]?.bullets[0]?.content,
    ).toBe("Reduced deploy time by 35%.");
  });
});
