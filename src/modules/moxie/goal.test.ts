import { describe, expect, it } from "vitest";
import {
  addMoxieMilestone,
  createMoxieGoal,
  moxieGoalProgress,
  removeMoxieMilestone,
  setMoxieGoalStatus,
  sortMoxieGoals,
  summarizeMoxieGoals,
  toggleMoxieMilestone,
  type MoxieGoal,
} from "./goal";

const base = (over: Partial<MoxieGoal> = {}): MoxieGoal => ({
  id: "g1",
  statement: "Land a backend internship",
  status: "active",
  milestones: [],
  linkedEntityIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  approvedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("Moxie goals", () => {
  it("records approval at creation and starts active", () => {
    const goal = createMoxieGoal(
      {
        statement: "Ship the ledger rewrite",
        milestones: [],
        linkedEntityIds: [],
      },
      "2026-02-01T00:00:00.000Z",
      "abc",
    );
    expect(goal.approvedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(goal.status).toBe("active");
  });

  it("expands milestone titles into records", () => {
    const goal = createMoxieGoal({
      statement: "Prep for Stripe",
      milestones: ["Finish graph drills", "Rewrite summary"],
      linkedEntityIds: [],
    });
    expect(goal.milestones).toHaveLength(2);
    expect(goal.milestones[0]?.title).toBe("Finish graph drills");
    expect(goal.milestones[0]?.completedAt).toBeUndefined();
  });

  it("toggles a milestone both ways", () => {
    const goal = base({
      milestones: [{ id: "m1", title: "Drills" }],
    });
    const done = toggleMoxieMilestone(goal, "m1", "2026-03-01T00:00:00.000Z");
    expect(done.milestones[0]?.completedAt).toBe("2026-03-01T00:00:00.000Z");
    expect(
      toggleMoxieMilestone(done, "m1").milestones[0]?.completedAt,
    ).toBeUndefined();
  });

  it("reports milestone progress", () => {
    expect(moxieGoalProgress(base())).toEqual({ done: 0, total: 0, ratio: 0 });
    const goal = base({
      milestones: [
        { id: "m1", title: "A", completedAt: "2026-03-01T00:00:00.000Z" },
        { id: "m2", title: "B" },
      ],
    });
    expect(moxieGoalProgress(goal)).toEqual({ done: 1, total: 2, ratio: 0.5 });
  });

  it("orders active goals first, then by nearest target", () => {
    const ordered = sortMoxieGoals([
      base({ id: "archived", status: "archived" }),
      base({ id: "later", targetDate: "2026-09-01" }),
      base({ id: "sooner", targetDate: "2026-04-01" }),
      base({ id: "undated" }),
    ]);
    expect(ordered.map((goal) => goal.id)).toEqual([
      "sooner",
      "later",
      "undated",
      "archived",
    ]);
  });

  it("summarizes only active goals for the prompt", () => {
    const summary = summarizeMoxieGoals([
      base({ id: "a", targetDate: "2026-06-01" }),
      base({ id: "b", status: "achieved", statement: "Done thing" }),
    ]);
    expect(summary).toEqual([
      {
        statement: "Land a backend internship",
        targetDate: "2026-06-01",
        milestones: [],
      },
    ]);
  });

  it("adds a milestone to an existing goal", () => {
    const goal = base();
    const updated = addMoxieMilestone(
      goal,
      "Submit all applications",
      "2026-09-01",
      "2026-08-01T00:00:00.000Z",
      "m-new",
    );
    expect(updated.milestones).toHaveLength(1);
    expect(updated.milestones[0]).toMatchObject({
      id: "m-new",
      title: "Submit all applications",
      dueDate: "2026-09-01",
    });
    expect(updated.milestones[0]?.completedAt).toBeUndefined();
    expect(updated.updatedAt).toBe("2026-08-01T00:00:00.000Z");
  });

  it("removes a milestone by id", () => {
    const goal = base({
      milestones: [
        { id: "m1", title: "Keep" },
        { id: "m2", title: "Remove me" },
      ],
    });
    const updated = removeMoxieMilestone(goal, "m2", "2026-08-01T00:00:00.000Z");
    expect(updated.milestones).toHaveLength(1);
    expect(updated.milestones[0]?.id).toBe("m1");
    expect(updated.updatedAt).toBe("2026-08-01T00:00:00.000Z");
  });

  it("removing a non-existent milestone id is a no-op", () => {
    const goal = base({ milestones: [{ id: "m1", title: "Only" }] });
    const updated = removeMoxieMilestone(goal, "not-here");
    expect(updated.milestones).toHaveLength(1);
  });

  it("stamps a status change", () => {
    const changed = setMoxieGoalStatus(
      base(),
      "achieved",
      "2026-05-01T00:00:00.000Z",
    );
    expect(changed.status).toBe("achieved");
    expect(changed.updatedAt).toBe("2026-05-01T00:00:00.000Z");
  });
});
