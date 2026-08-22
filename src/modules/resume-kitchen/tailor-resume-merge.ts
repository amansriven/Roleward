import { z } from "zod";
import type { ResumeVersion } from "./versions";
import { bulletIsSupported, normalizeForMatch } from "./grounding";

/**
 * Puts a tailored rewrite back into the resume it came from.
 *
 * Split out from the model call so the guarantee this file exists to make —
 * that the document keeps its own entries, order, and bullet count no matter
 * what comes back — can be tested without one.
 */

export type TailorableResume = Pick<
  ResumeVersion,
  "headline" | "skills" | "items"
>;

export interface BulletChange {
  itemId: string;
  itemTitle: string;
  bulletId: string;
  before: string;
  after: string;
}

export interface RejectedRewrite {
  itemTitle: string;
  before: string;
  attempted: string;
  inventedNumbers: string[];
}

export interface TailoredResume {
  resume: TailorableResume;
  /** Bullets whose wording actually moved, for the review screen. */
  changes: BulletChange[];
  /** Rewrites thrown away for asserting a figure nothing supports. */
  rejected: RejectedRewrite[];
  /** Skills the model tried to add that appear nowhere the candidate wrote. */
  droppedSkills: string[];
}

export const tailoredDraftSchema = z.object({
  headline: z.string().trim(),
  skills: z.array(
    z.object({
      category: z.string().trim(),
      skills: z.array(z.string().trim()),
    }),
  ),
  items: z.array(
    z.object({
      id: z.string(),
      bullets: z.array(
        z.object({ id: z.string(), content: z.string().trim() }),
      ),
    }),
  ),
});

export type TailoredDraft = z.infer<typeof tailoredDraftSchema>;

/**
 * Puts the model's wording back into the candidate's resume.
 *
 * Pure, and the actual guarantee behind "the same resume, tailored": the
 * result is built by walking the original, so anything the model returned that
 * does not correspond to something already there is simply never read.
 */
export function applyTailoredResume(
  resume: TailorableResume,
  draft: TailoredDraft,
  extraContext: string,
): TailoredResume {
  const changes: BulletChange[] = [];
  const rejected: RejectedRewrite[] = [];
  const droppedSkills: string[] = [];

  const draftItems = new Map(draft.items.map((item) => [item.id, item]));

  const items = resume.items.map((item) => {
    const drafted = draftItems.get(item.id);
    const draftBullets = new Map(
      (drafted?.bullets ?? []).map((bullet) => [bullet.id, bullet.content]),
    );
    return {
      ...item,
      bullets: item.bullets.map((bullet) => {
        const rewritten = draftBullets.get(bullet.id)?.trim() ?? "";
        if (!rewritten || rewritten === bullet.content) return bullet;

        const check = bulletIsSupported(rewritten, [
          bullet.content,
          extraContext,
        ]);
        if (!check.ok) {
          rejected.push({
            itemTitle: item.title,
            before: bullet.content,
            attempted: rewritten,
            inventedNumbers: check.inventedNumbers,
          });
          return bullet;
        }

        changes.push({
          itemId: item.id,
          itemTitle: item.title,
          bulletId: bullet.id,
          before: bullet.content,
          after: rewritten,
        });
        // sourceClaimIds is what ties this wording back to confirmed evidence,
        // and a reworded bullet still rests on the same claim it always did.
        return { ...bullet, content: rewritten };
      }),
    };
  });

  // A skill has to be one the candidate already listed, or one they just told
  // us about. Everything else is the model agreeing with the job posting.
  const allowed = new Map<string, string>();
  for (const group of resume.skills)
    for (const skill of group.skills)
      allowed.set(normalizeForMatch(skill), skill);
  const context = normalizeForMatch(extraContext);

  const skills = draft.skills.length
    ? draft.skills
        .map((group) => ({
          category: group.category,
          skills: group.skills.filter((skill) => {
            const key = normalizeForMatch(skill);
            if (allowed.has(key)) return true;
            if (key.length >= 2 && context.includes(key)) return true;
            droppedSkills.push(skill);
            return false;
          }),
        }))
        .filter((group) => group.skills.length > 0)
    : resume.skills.map((group) => ({ ...group }));

  // Reordering may not lose a skill. If the model returned fewer than it was
  // given, the missing ones are appended rather than quietly deleted.
  const kept = new Set(
    skills.flatMap((group) => group.skills.map(normalizeForMatch)),
  );
  const missing = resume.skills
    .map((group) => ({
      category: group.category,
      skills: group.skills.filter(
        (skill) => !kept.has(normalizeForMatch(skill)),
      ),
    }))
    .filter((group) => group.skills.length > 0);
  for (const group of missing) {
    const existing = skills.find((entry) => entry.category === group.category);
    if (existing) existing.skills = [...existing.skills, ...group.skills];
    else skills.push(group);
  }

  const headlineCheck = bulletIsSupported(draft.headline, [
    resume.headline,
    extraContext,
  ]);
  const headline =
    draft.headline && headlineCheck.ok ? draft.headline : resume.headline;

  return {
    resume: { headline, skills, items },
    changes,
    rejected,
    droppedSkills,
  };
}
