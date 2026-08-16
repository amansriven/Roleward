import { describe, expect, it } from "vitest";
import {
  getActiveApplication,
  loadWorkspace,
  recommendActions,
  saveApplication,
  saveWorkspaceSnapshot,
  setActiveApplication,
  workspaceSnapshotSchema,
} from "./repository";

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
describe("workspace repository", () => {
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
});
