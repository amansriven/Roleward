/**
 * Moxie is instructed to end grounded sentences with a compact marker such as
 * `[Source: Evidence · Payments rewrite]`. These helpers turn those markers into
 * chips that link back to the workspace surface the claim came from.
 */

export interface MoxieCitation {
  /** Text shown on the chip. */
  label: string;
  /** Workspace route the chip opens. */
  href: string;
  /** Stable key for deduping repeated citations. */
  key: string;
}

export const moxieCitationPattern = /\[Source:\s*([^\]]+)\]/g;

const evidenceSections = [
  "projects",
  "experience",
  "education",
  "skills",
  "activities",
] as const;

/**
 * Matched by keyword rather than exact phrase: live responses cite sources
 * using whatever the context calls them, including raw JSON keys such as
 * `activeApplication`, so anchored patterns miss. Order is priority.
 */
const routes: { keyword: string; href: string; label: string }[] = [
  { keyword: "evidence", href: "/dashboard/evidence", label: "Evidence" },
  {
    keyword: "resume",
    href: "/dashboard/resume-kitchen",
    label: "Resumes",
  },
  { keyword: "zed", href: "/dashboard/zed", label: "Zed" },
  {
    keyword: "stage fright",
    href: "/dashboard/stage-fright",
    label: "Stage Fright",
  },
  {
    keyword: "interview",
    href: "/dashboard/stage-fright",
    label: "Stage Fright",
  },
  {
    keyword: "application",
    href: "/dashboard/applications",
    label: "Applications",
  },
  { keyword: "goal", href: "/dashboard", label: "Goals" },
];

/** `activeApplication` → `active application`, for matching. */
function normalize(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Key-like tokens get prettified; text a human would write is left alone. */
function displayLabel(head: string) {
  const keyLike =
    !/\s/.test(head) &&
    (/[a-z0-9][A-Z]/.test(head) || head === head.toLowerCase());
  if (!keyLike) return head;
  const spaced = normalize(head);
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Maps one raw marker body onto a labelled workspace link. */
export function resolveMoxieCitation(raw: string): MoxieCitation {
  const [head = "", ...rest] = raw.split("·").map((part) => part.trim());
  const detail = rest.join(" · ");
  const category = normalize(head);
  const route = routes.find((item) => category.includes(item.keyword));
  let href = route?.href ?? "/dashboard";

  // Evidence names its own sub-surface often enough to deep-link it.
  if (route?.href === "/dashboard/evidence") {
    const section = evidenceSections.find((item) =>
      detail.toLowerCase().startsWith(item),
    );
    if (section) href = `/dashboard/evidence/${section}`;
  }

  const label = detail || displayLabel(head) || route?.label || "Workspace";
  return { label, href, key: `${href}:${label.toLowerCase()}` };
}

export type MoxieTextSegment =
  | { type: "text"; value: string }
  | { type: "citation"; citation: MoxieCitation };

/** Splits a string into plain runs and the citation chips between them. */
export function splitMoxieCitations(text: string): MoxieTextSegment[] {
  const segments: MoxieTextSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(moxieCitationPattern)) {
    const start = match.index ?? 0;
    if (start > cursor)
      segments.push({ type: "text", value: text.slice(cursor, start) });
    segments.push({
      type: "citation",
      citation: resolveMoxieCitation(match[1] ?? ""),
    });
    cursor = start + match[0].length;
  }
  if (cursor < text.length)
    segments.push({ type: "text", value: text.slice(cursor) });
  return segments;
}

/** Every distinct source a response leaned on, in first-mention order. */
export function collectMoxieCitations(content: string): MoxieCitation[] {
  const seen = new Map<string, MoxieCitation>();
  for (const match of content.matchAll(moxieCitationPattern)) {
    const citation = resolveMoxieCitation(match[1] ?? "");
    if (!seen.has(citation.key)) seen.set(citation.key, citation);
  }
  return [...seen.values()];
}
