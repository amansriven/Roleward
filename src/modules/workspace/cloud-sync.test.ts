import { describe, expect, it } from "vitest";
import { mergeForMigration } from "./cloud-sync";
import { emptyWorkspace, type WorkspaceSnapshot } from "./repository";

function workspace(patch: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  return { ...emptyWorkspace, ...patch };
}

describe("mergeForMigration", () => {
  it("keeps identity already stored in the cloud", () => {
    const merged = mergeForMigration(
      workspace({ candidateName: "Remote Name", candidateHeadline: "Remote" }),
      workspace({ candidateName: "Local Name", candidateHeadline: "Local" }),
    );

    expect(merged.candidateName).toBe("Remote Name");
    expect(merged.candidateHeadline).toBe("Remote");
  });

  it("migrates local identity when the cloud has none", () => {
    const merged = mergeForMigration(
      workspace(),
      workspace({ candidateName: "Local Name", candidateHeadline: "Builder" }),
    );

    expect(merged.candidateName).toBe("Local Name");
    expect(merged.candidateHeadline).toBe("Builder");
  });

  it("migrates locally extracted skills when the cloud has none", () => {
    const skills = [{ category: "Languages", skills: ["TypeScript", "SQL"] }];
    const merged = mergeForMigration(
      workspace(),
      workspace({ candidateSkills: skills }),
    );

    expect(merged.candidateSkills).toEqual(skills);
  });
});
