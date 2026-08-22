import { z } from "zod";

/**
 * Durable facts Moxie may rely on in later conversations. The spec is explicit
 * that nothing here is captured silently: a memory only counts once the user
 * has approved it, and removal is a soft delete so the record stays auditable.
 */
export const moxieMemoryCategories = [
  "preference",
  "constraint",
  "target",
  "background",
] as const;
export type MoxieMemoryCategory = (typeof moxieMemoryCategories)[number];

export const moxieMemoryCategoryLabels: Record<MoxieMemoryCategory, string> = {
  preference: "Preference",
  constraint: "Constraint",
  target: "Target",
  background: "Background",
};

export const moxieMemorySchema = z.object({
  id: z.string().min(1),
  category: z.enum(moxieMemoryCategories),
  statement: z.string().trim().min(1).max(400),
  sourceMessageId: z.string().max(200).optional(),
  createdAt: z.string().datetime(),
  approvedAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().optional(),
});
export type MoxieMemory = z.infer<typeof moxieMemorySchema>;

export const moxieMemoryDraftSchema = z.object({
  category: z.enum(moxieMemoryCategories),
  statement: z.string().trim().min(1).max(400),
  sourceMessageId: z.string().max(200).optional(),
});
export type MoxieMemoryDraft = z.infer<typeof moxieMemoryDraftSchema>;

/** A memory is only usable while approved and not withdrawn. */
export function isActiveMoxieMemory(memory: MoxieMemory) {
  return Boolean(memory.approvedAt) && !memory.deletedAt;
}

export function activeMoxieMemories(memories: MoxieMemory[]) {
  return memories
    .filter(isActiveMoxieMemory)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Memories arrive already approved: the user creating one in the panel, or
 * confirming one Moxie proposed, is the approval.
 */
export function createMoxieMemory(
  draft: MoxieMemoryDraft,
  now = new Date().toISOString(),
  id = crypto.randomUUID(),
): MoxieMemory {
  return moxieMemorySchema.parse({
    id,
    ...draft,
    createdAt: now,
    approvedAt: now,
  });
}

export function withdrawMoxieMemory(
  memory: MoxieMemory,
  now = new Date().toISOString(),
): MoxieMemory {
  return { ...memory, deletedAt: now };
}

/** Compact grouped form the context broker embeds in the prompt. */
export function summarizeMoxieMemories(memories: MoxieMemory[]) {
  const active = activeMoxieMemories(memories);
  return moxieMemoryCategories
    .map((category) => ({
      category,
      statements: active
        .filter((memory) => memory.category === category)
        .map((memory) => memory.statement),
    }))
    .filter((group) => group.statements.length > 0);
}
