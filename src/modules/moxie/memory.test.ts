import { describe, expect, it } from "vitest";
import {
  activeMoxieMemories,
  createMoxieMemory,
  isActiveMoxieMemory,
  summarizeMoxieMemories,
  withdrawMoxieMemory,
  type MoxieMemory,
} from "./memory";

const memory = (over: Partial<MoxieMemory> = {}): MoxieMemory => ({
  id: "one",
  category: "preference",
  statement: "Prefers backend roles",
  createdAt: "2026-01-01T00:00:00.000Z",
  approvedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("Moxie memory", () => {
  it("approves a memory at creation, since saving it is the approval", () => {
    const created = createMoxieMemory(
      { category: "target", statement: "Wants a Stripe offer by June" },
      "2026-02-01T00:00:00.000Z",
      "abc",
    );
    expect(created.approvedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(isActiveMoxieMemory(created)).toBe(true);
  });

  it("treats an unapproved memory as unusable", () => {
    expect(isActiveMoxieMemory(memory({ approvedAt: undefined }))).toBe(false);
  });

  it("soft-deletes rather than dropping the record", () => {
    const withdrawn = withdrawMoxieMemory(memory(), "2026-03-01T00:00:00.000Z");
    expect(withdrawn.deletedAt).toBe("2026-03-01T00:00:00.000Z");
    expect(withdrawn.statement).toBe("Prefers backend roles");
    expect(isActiveMoxieMemory(withdrawn)).toBe(false);
  });

  it("excludes withdrawn and unapproved memories from the active set", () => {
    const active = activeMoxieMemories([
      memory({ id: "a" }),
      memory({ id: "b", deletedAt: "2026-03-01T00:00:00.000Z" }),
      memory({ id: "c", approvedAt: undefined }),
    ]);
    expect(active.map((item) => item.id)).toEqual(["a"]);
  });

  it("groups the active set by category for the prompt", () => {
    const summary = summarizeMoxieMemories([
      memory({ id: "a", category: "preference", statement: "Backend" }),
      memory({ id: "b", category: "target", statement: "Stripe" }),
      memory({
        id: "c",
        category: "target",
        statement: "Hidden",
        deletedAt: "2026-03-01T00:00:00.000Z",
      }),
    ]);
    expect(summary).toEqual([
      { category: "preference", statements: ["Backend"] },
      { category: "target", statements: ["Stripe"] },
    ]);
  });
});
