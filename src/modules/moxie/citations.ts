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

const routes: { match: RegExp; href: string; label: string }[] = [
  {
    match: /^(active )?application/,
    href: "/dashboard/applications",
    label: "Applications",
  },
  { match: /^evidence/, href: "/dashboard/evidence", label: "Evidence" },
  {
    match: /^(active )?resume|^resume kitchen/,
    href: "/dashboard/resume-kitchen",
    label: "Resumes",
  },
  { match: /^zed/, href: "/dashboard/zed", label: "Zed" },
  {
    match: /^stage ?fright|^interview/,
    href: "/dashboard/stage-fright",
    label: "Stage Fright",
  },
  { match: /^goal/, href: "/dashboard", label: "Goals" },
];

/** Maps one raw marker body onto a labelled workspace link. */
export function resolveMoxieCitation(raw: string): MoxieCitation {
  const [head = "", ...rest] = raw.split("·").map((part) => part.trim());
  const detail = rest.join(" · ");
  const category = head.toLowerCase();
  const route = routes.find((item) => item.match.test(category));
  let href = route?.href ?? "/dashboard";

  // Evidence names its own sub-surface often enough to deep-link it.
  if (route?.href === "/dashboard/evidence") {
    const section = evidenceSections.find((item) =>
      detail.toLowerCase().startsWith(item),
    );
    if (section) href = `/dashboard/evidence/${section}`;
  }

  const label = detail || head || route?.label || "Workspace";
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
