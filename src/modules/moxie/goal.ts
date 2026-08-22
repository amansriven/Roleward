import { z } from "zod";

/**
 * Goals are Moxie's own artifacts rather than workspace records, so they stay
 * inside the read-only boundary: nothing here edits an application, resume, or
 * evidence entry. A goal only exists once the user has approved it.
 */
export const moxieGoalStatuses = ["active", "achieved", "archived"] as const;
export type MoxieGoalStatus = (typeof moxieGoalStatuses)[number];

export const moxieGoalStatusLabels: Record<MoxieGoalStatus, string> = {
  active: "Active",
  achieved: "Achieved",
  archived: "Archived",
};

export const moxieMilestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  dueDate: z.string().date().optional(),
  completedAt: z.string().datetime().optional(),
});
export type MoxieMilestone = z.infer<typeof moxieMilestoneSchema>;

export const moxieGoalSchema = z.object({
  id: z.string().min(1),
  statement: z.string().trim().min(1).max(400),
  targetDate: z.string().date().optional(),
  status: z.enum(moxieGoalStatuses),
  sourceConversationId: z.string().max(200).optional(),
  milestones: z.array(moxieMilestoneSchema).max(20).default([]),
  /** Workspace records this goal is about, as references rather than copies. */
  linkedEntityIds: z.array(z.string().max(200)).max(20).default([]),
  createdAt: z.string().datetime(),
  approvedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  /**
   * Soft delete, matching memory. The deployed IAM role has no
   * dynamodb:DeleteItem permission, so removal is a write, not a delete.
   */
  deletedAt: z.string().datetime().optional(),
});
export type MoxieGoal = z.infer<typeof moxieGoalSchema>;

export const moxieGoalDraftSchema = z.object({
  statement: z.string().trim().min(1).max(400),
  targetDate: z.string().date().optional(),
  sourceConversationId: z.string().max(200).optional(),
  milestones: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  linkedEntityIds: z.array(z.string().max(200)).max(20).default([]),
});
export type MoxieGoalDraft = z.infer<typeof moxieGoalDraftSchema>;

/** Saving a goal is the approval, so the timestamp is set at creation. */
export function createMoxieGoal(
  draft: MoxieGoalDraft,
  now = new Date().toISOString(),
  id = crypto.randomUUID(),
): MoxieGoal {
  return moxieGoalSchema.parse({
    id,
    statement: draft.statement,
    targetDate: draft.targetDate,
    sourceConversationId: draft.sourceConversationId,
    status: "active",
    milestones: draft.milestones.map((title) => ({
      id: crypto.randomUUID(),
      title,
    })),
    linkedEntityIds: draft.linkedEntityIds,
    createdAt: now,
    approvedAt: now,
    updatedAt: now,
  });
}

export function withdrawMoxieGoal(
  goal: MoxieGoal,
  now = new Date().toISOString(),
): MoxieGoal {
  return { ...goal, deletedAt: now, updatedAt: now };
}

export function setMoxieGoalStatus(
  goal: MoxieGoal,
  status: MoxieGoalStatus,
  now = new Date().toISOString(),
): MoxieGoal {
  return { ...goal, status, updatedAt: now };
}

export function toggleMoxieMilestone(
  goal: MoxieGoal,
  milestoneId: string,
  now = new Date().toISOString(),
): MoxieGoal {
  return {
    ...goal,
    milestones: goal.milestones.map((milestone) =>
      milestone.id === milestoneId
        ? {
            ...milestone,
            completedAt: milestone.completedAt ? undefined : now,
          }
        : milestone,
    ),
    updatedAt: now,
  };
}

export function addMoxieMilestone(
  goal: MoxieGoal,
  title: string,
  dueDate?: string,
  now = new Date().toISOString(),
  id = crypto.randomUUID(),
): MoxieGoal {
  const milestone = moxieMilestoneSchema.parse({
    id,
    title: title.trim().slice(0, 200),
    ...(dueDate ? { dueDate } : {}),
  });
  return {
    ...goal,
    milestones: [...goal.milestones, milestone],
    updatedAt: now,
  };
}

export function removeMoxieMilestone(
  goal: MoxieGoal,
  milestoneId: string,
  now = new Date().toISOString(),
): MoxieGoal {
  return {
    ...goal,
    milestones: goal.milestones.filter((m) => m.id !== milestoneId),
    updatedAt: now,
  };
}

export function moxieGoalProgress(goal: MoxieGoal) {
  const total = goal.milestones.length;
  if (total === 0) return { done: 0, total: 0, ratio: 0 };
  const done = goal.milestones.filter((item) => item.completedAt).length;
  return { done, total, ratio: done / total };
}

/** Active goals first, then by nearest target date. */
export function sortMoxieGoals(goals: MoxieGoal[]) {
  const rank = (goal: MoxieGoal) => moxieGoalStatuses.indexOf(goal.status);
  return [...goals]
    .filter((goal) => !goal.deletedAt)
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.targetDate ?? "9999-12-31").localeCompare(
          b.targetDate ?? "9999-12-31",
        ),
    );
}

/** Compact form the context broker embeds so answers respect stated goals. */
export function summarizeMoxieGoals(goals: MoxieGoal[]) {
  return sortMoxieGoals(goals)
    .filter((goal) => goal.status === "active")
    .map((goal) => ({
      statement: goal.statement,
      targetDate: goal.targetDate,
      milestones: goal.milestones.map((milestone) => ({
        title: milestone.title,
        done: Boolean(milestone.completedAt),
      })),
    }));
}
