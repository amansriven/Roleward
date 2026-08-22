import { moxieMemoryCategories, type MoxieMemoryCategory } from "./memory";

/**
 * Moxie can propose something worth keeping by ending a response with a marker:
 *
 *   [Remember: preference | Prefers backend-leaning roles]
 *   [Goal: Land a backend internship offer | 2026-06-01]
 *
 * Proposals are inert until the user confirms them, which keeps the spec's rule
 * that nothing durable is captured without explicit approval.
 */
export const moxieProposalPattern = /\[(Remember|Goal):\s*([^\]]+)\]/g;

export interface MoxieMemoryProposal {
  kind: "memory";
  category: MoxieMemoryCategory;
  statement: string;
}

export interface MoxieGoalProposal {
  kind: "goal";
  statement: string;
  targetDate?: string;
}

export type MoxieProposal = MoxieMemoryProposal | MoxieGoalProposal;

const isCategory = (value: string): value is MoxieMemoryCategory =>
  (moxieMemoryCategories as readonly string[]).includes(value);

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

function parseProposal(kind: string, body: string): MoxieProposal | null {
  const parts = body.split("|").map((part) => part.trim());
  if (kind === "Goal") {
    const [statement = "", targetDate] = parts;
    if (!statement) return null;
    return {
      kind: "goal",
      statement,
      ...(targetDate && isDate(targetDate) ? { targetDate } : {}),
    };
  }
  // Memory proposals lead with a category; anything else falls back to background.
  const [head = "", ...rest] = parts;
  const lowered = head.toLowerCase();
  const category = isCategory(lowered) ? lowered : "background";
  const statement = (isCategory(lowered) ? rest.join(" | ") : body).trim();
  if (!statement) return null;
  return { kind: "memory", category, statement };
}

/** Proposals found in a response, deduped by their statement. */
export function collectMoxieProposals(content: string): MoxieProposal[] {
  const seen = new Map<string, MoxieProposal>();
  for (const match of content.matchAll(moxieProposalPattern)) {
    const proposal = parseProposal(match[1] ?? "", match[2] ?? "");
    if (!proposal) continue;
    const key = `${proposal.kind}:${proposal.statement.toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, proposal);
  }
  return [...seen.values()];
}

/** Markers are rendered as cards, so they are stripped from the prose. */
export function stripMoxieProposals(content: string) {
  return content
    .replace(moxieProposalPattern, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
