import { describe, expect, it } from "vitest";
import { claimLocalWorkspace, clearLocalWorkspace } from "./owner";

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
  } as Storage;
}

describe("workspace ownership", () => {
  it("clears another account's data when a new owner signs in", () => {
    const storage = memoryStorage({
      "roleward:workspace-owner": "google-user",
      "roleward:resume-versions": "[{}]",
      "roleward:evidence-library": "[{}]",
      "roleward:workspace-sidebar-collapsed": "true",
      "unrelated:key": "kept",
    });
    expect(
      claimLocalWorkspace(storage, "github-user", { hasCloudWorkspace: false }),
    ).toBe(true);
    expect(storage.getItem("roleward:resume-versions")).toBeNull();
    expect(storage.getItem("roleward:evidence-library")).toBeNull();
    expect(storage.getItem("roleward:workspace-owner")).toBe("github-user");
    expect(storage.getItem("roleward:workspace-sidebar-collapsed")).toBe("true");
    expect(storage.getItem("unrelated:key")).toBe("kept");
  });

  it("keeps the same account's data across sessions", () => {
    const storage = memoryStorage({
      "roleward:workspace-owner": "google-user",
      "roleward:resume-versions": "[{}]",
    });
    expect(
      claimLocalWorkspace(storage, "google-user", { hasCloudWorkspace: true }),
    ).toBe(false);
    expect(storage.getItem("roleward:resume-versions")).toBe("[{}]");
  });

  it("keeps unstamped data when the account has nothing in the cloud yet", () => {
    const storage = memoryStorage({ "roleward:resume-versions": "[{}]" });
    expect(
      claimLocalWorkspace(storage, "google-user", { hasCloudWorkspace: false }),
    ).toBe(false);
    expect(storage.getItem("roleward:resume-versions")).toBe("[{}]");
  });

  it("clears unstamped data when the account already has a cloud workspace", () => {
    const storage = memoryStorage({ "roleward:resume-versions": "[{}]" });
    expect(
      claimLocalWorkspace(storage, "google-user", { hasCloudWorkspace: true }),
    ).toBe(true);
    expect(storage.getItem("roleward:resume-versions")).toBeNull();
  });

  it("clears every workspace key on sign out", () => {
    const storage = memoryStorage({
      "roleward:moxie-conversation": "{}",
      "roleward:company-research:one": "{}",
      "roleward:moxie-history-open": "true",
    });
    clearLocalWorkspace(storage);
    expect(storage.getItem("roleward:moxie-conversation")).toBeNull();
    expect(storage.getItem("roleward:company-research:one")).toBeNull();
    expect(storage.getItem("roleward:moxie-history-open")).toBe("true");
  });
});
