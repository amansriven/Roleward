/**
 * Milestone 8 response blocks. Moxie composes these as fenced sections so the
 * renderer can lay them out for scanning instead of leaving prose to carry the
 * structure:
 *
 *   ```moxie-plan
 *   Title: Two weeks to Stripe
 *   - 2026-03-01 | Finish graph drills
 *   - Rewrite the summary line
 *   ```
 *
 *   ```moxie-coach
 *   Observation: You sounded rushed in the closing answer
 *   Evidence: 162 words per minute
 *   Drill: Re-record the close at 130 wpm
 *   ```
 *
 *   ```moxie-draft
 *   Kind: Resume bullet
 *   Bullet: <bullet id from context>
 *   Rewrote the ledger service to cut p99 latency to 120ms.
 *   ```
 *
 * All stay plain text, so a response that misses the format still reads fine.
 */

export interface MoxiePlanStep {
  text: string;
  date?: string;
}

export interface MoxiePlanBlock {
  kind: "plan";
  title?: string;
  steps: MoxiePlanStep[];
}

export interface MoxieCoachBlock {
  kind: "coach";
  /** The interpretation. */
  observation: string;
  /** The measurement it rests on, kept visually distinct from the reading. */
  evidence?: string;
  /** The next rep to run. */
  drill?: string;
}

export interface MoxieDraftBlock {
  kind: "draft";
  /** What the draft is, e.g. "Resume bullet" or "STAR story". */
  label: string;
  text: string;
  /** Where it would go, shown to the user before they confirm. */
  target?: string;
  /**
   * The bullet this draft would replace. Present only when Moxie is rewriting
   * an existing, already-grounded bullet, which is the sole applyable target.
   */
  bulletId?: string;
}

export type MoxieBlock = MoxiePlanBlock | MoxieCoachBlock | MoxieDraftBlock;

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export function parseMoxiePlan(body: string): MoxiePlanBlock | null {
  let title: string | undefined;
  const steps: MoxiePlanStep[] = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const titleMatch = trimmed.match(/^title:\s*(.+)$/i);
    if (titleMatch && !title) {
      title = titleMatch[1]?.trim();
      continue;
    }
    const stepMatch = trimmed.match(/^(?:[-*]|\d+\.)\s+(.+)$/);
    if (!stepMatch) continue;
    const [first = "", ...rest] = (stepMatch[1] ?? "")
      .split("|")
      .map((part) => part.trim());
    if (rest.length > 0 && isDate(first)) {
      steps.push({ text: rest.join(" | "), date: first });
      continue;
    }
    steps.push({
      text: rest.length > 0 ? [first, ...rest].join(" | ") : first,
    });
  }
  if (steps.length === 0) return null;
  return { kind: "plan", steps, ...(title ? { title } : {}) };
}

export function parseMoxieCoach(body: string): MoxieCoachBlock | null {
  const field = (name: string) =>
    body
      .split("\n")
      .map((line) => line.trim())
      .find((line) => new RegExp(`^${name}:`, "i").test(line))
      ?.replace(new RegExp(`^${name}:\\s*`, "i"), "")
      .trim();
  const observation = field("observation");
  if (!observation) return null;
  const evidence = field("evidence");
  const drill = field("drill");
  return {
    kind: "coach",
    observation,
    ...(evidence ? { evidence } : {}),
    ...(drill ? { drill } : {}),
  };
}

export function parseMoxieDraft(body: string): MoxieDraftBlock | null {
  const fields = new Map<string, string>();
  const text: string[] = [];
  for (const line of body.split("\n")) {
    const match = line.trim().match(/^(kind|target|bullet):\s*(.*)$/i);
    if (match && match[1]) {
      fields.set(match[1].toLowerCase(), (match[2] ?? "").trim());
      continue;
    }
    text.push(line);
  }
  const content = text.join("\n").trim();
  if (!content) return null;
  const target = fields.get("target");
  const bulletId = fields.get("bullet");
  return {
    kind: "draft",
    label: fields.get("kind") || "Draft",
    text: content,
    ...(target ? { target } : {}),
    ...(bulletId ? { bulletId } : {}),
  };
}

export function parseMoxieBlock(
  language: string,
  body: string,
): MoxieBlock | null {
  if (language === "moxie-plan") return parseMoxiePlan(body);
  if (language === "moxie-coach") return parseMoxieCoach(body);
  if (language === "moxie-draft") return parseMoxieDraft(body);
  return null;
}

export interface MoxieTable {
  headers: string[];
  rows: string[][];
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());

const isDivider = (line: string) =>
  /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());

/** Reads a GitHub-style pipe table starting at `start`, if one is there. */
export function parseMoxieTable(
  lines: string[],
  start: number,
): { table: MoxieTable; next: number } | null {
  const header = lines[start]?.trim() ?? "";
  const divider = lines[start + 1]?.trim() ?? "";
  if (!header.includes("|") || !isDivider(divider)) return null;
  const headers = cells(header);
  const rows: string[][] = [];
  let index = start + 2;
  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";
    if (!line.includes("|")) break;
    rows.push(cells(line));
    index += 1;
  }
  if (rows.length === 0) return null;
  return { table: { headers, rows }, next: index };
}
