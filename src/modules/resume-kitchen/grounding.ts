/**
 * Keeps extracted claims tied to the document they came from.
 *
 * The intake screen asks the candidate to confirm claims about themselves, and
 * a confirmed claim becomes "verified background" — it feeds interview
 * questions and tailored résumé bullets. So a model that embellishes here does
 * not produce a bad suggestion, it produces a fabricated credential the
 * candidate has personally signed off on.
 *
 * The defence is the same one Zed uses for expected outputs: do not trust the
 * model's word for anything checkable. Every claim must quote the résumé, the
 * quote is checked against the extracted text, and a claim whose quote is not
 * there is dropped rather than shown.
 *
 * Pure, so it is testable without a model or a PDF.
 */

/**
 * Trailing punctuation is not part of a number. Without stripping it,
 * "graduated in 2026." is dropped against a quote that plainly says 2026.
 */

/** Collapses case, quote glyphs, and dash variants so a quote survives a PDF. */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2022\u25aa\u25cf\u00b7]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The same, with every space removed.
 *
 * PDF text extraction breaks words across lines — a real résumé came back with
 * "Machine Lea\nrning" — and wraps long bullets mid-sentence. Matching on
 * whitespace at all threw away half of a good résumé: on one test document,
 * eight of seventeen claims were discarded and an entire job disappeared, every
 * one of them on the quote check and none on the number check.
 *
 * Ignoring whitespace entirely still requires the words to be genuinely present
 * and in order, so an invented sentence fails exactly as before.
 */
function compact(text: string): string {
  return normalizeForMatch(text).replace(/\s+/g, "");
}

/** Roughly a line of text: far enough to span a wrap, not a whole document. */
const PROXIMITY_LIMIT = 160;

/**
 * Whether a quote genuinely appears in the document.
 *
 * Whitespace-insensitive containment first, which is what survives PDF
 * artefacts. The fallback tolerates a quote whose punctuation the model tidied,
 * by requiring its words to appear in order and close together.
 */
export function quoteAppearsIn(quote: string, document: string): boolean {
  const needle = compact(quote);
  if (needle.length < 12) return false;
  const haystack = compact(document);
  if (haystack.includes(needle)) return true;

  const words = normalizeForMatch(quote)
    .split(" ")
    .map((word) => word.replace(/[^a-z0-9]/g, ""))
    .filter((word) => word.length > 2);
  if (words.length < 3) return false;

  let cursor = 0;
  let matched = 0;
  for (const word of words) {
    const at = haystack.indexOf(word, cursor);
    if (at === -1) continue;
    if (cursor > 0 && at - cursor > PROXIMITY_LIMIT) return false;
    cursor = at + word.length;
    matched += 1;
  }
  // Most of the quote has to be there. A handful of matching words scattered
  // through a résumé is not evidence that the sentence was ever written.
  return matched / words.length >= 0.8;
}

export interface DraftClaim {
  type: "action" | "outcome" | "metric" | "technology" | "responsibility";
  content: string;
  /** Verbatim from the résumé. The whole guarantee rests on this. */
  sourceQuote: string;
}

export interface DraftItem {
  type: "experience" | "project" | "education" | "leadership" | "other";
  title: string;
  organization?: string;
  /** As written — "June 2025 - August 2025", "Expected 2026". */
  period?: string;
  location?: string;
  summary: string;
  claims: DraftClaim[];
}

export interface DraftSkillGroup {
  category: string;
  skills: string[];
}

/**
 * Skills are grounded by presence rather than by quote.
 *
 * A skills section is a comma-separated list, so asking for a sentence to
 * quote makes no sense — but the individual word still has to be on the page,
 * which is the thing that matters. An extractor that adds Kubernetes because
 * the résumé mentions Docker is the failure mode here.
 */
export function groundSkills(
  groups: DraftSkillGroup[],
  document: string,
): DraftSkillGroup[] {
  const haystack = normalizeForMatch(document);
  return groups
    .map((group) => ({
      category: group.category,
      skills: group.skills.filter((skill) =>
        haystack.includes(normalizeForMatch(skill)),
      ),
    }))
    .filter((group) => group.skills.length > 0);
}

export interface GroundingReport<T> {
  kept: T[];
  /** Claims whose quote was not in the document, for the caller to log. */
  dropped: { content: string; sourceQuote: string; reason: string }[];
}

/**
 * Drops anything the document does not actually support.
 *
 * A numeric claim gets a second check: the digits in it must also appear in the
 * quote. "Reduced latency by 38%" sourced from a line that never mentions 38 is
 * exactly the failure this exists to catch, and it is the one a candidate is
 * least likely to notice while clicking confirm.
 */
export function groundItems(
  items: DraftItem[],
  document: string,
): GroundingReport<DraftItem> {
  const dropped: GroundingReport<DraftItem>["dropped"] = [];
  const kept: DraftItem[] = [];

  for (const item of items) {
    const claims = item.claims.filter((claim) => {
      if (!quoteAppearsIn(claim.sourceQuote, document)) {
        dropped.push({
          content: claim.content,
          sourceQuote: claim.sourceQuote,
          reason: "quote_not_in_document",
        });
        return false;
      }
      const numbers = numbersIn(claim.content);
      const quoted = normalizeForMatch(claim.sourceQuote);
      const invented = numbers.filter(
        (value) => !quoted.includes(value.toLowerCase()),
      );
      if (invented.length) {
        dropped.push({
          content: claim.content,
          sourceQuote: claim.sourceQuote,
          reason: `number_not_in_source:${invented.join(",")}`,
        });
        return false;
      }
      return true;
    });

    // An item with nothing left to confirm is not worth showing.
    if (claims.length) kept.push({ ...item, claims });
  }

  return { kept, dropped };
}

/**
 * Numbers a piece of text asserts, with sentence punctuation stripped.
 *
 * Shared by both grounding checks, because "38%" appearing in a bullet the
 * candidate is about to send to an employer is the single highest-stakes token
 * in this whole product.
 */
export function numbersIn(text: string): string[] {
  return (text.match(/\d[\d,.]*/g) ?? []).map((value) =>
    value.replace(/[.,]+$/, ""),
  );
}

export interface SupportCheck {
  ok: boolean;
  /** Numbers the supporting text never contained. */
  inventedNumbers: string[];
}

/**
 * Whether a tailored bullet is actually supported by the claims behind it.
 *
 * A rewrite is allowed to change the wording — that is the entire point — so
 * this cannot demand a verbatim quote. What it can demand is that the bullet
 * introduces no quantity the confirmed evidence does not already contain. That
 * is where an embellished résumé bullet turns into a lie a candidate has to
 * defend in an interview.
 */
export function bulletIsSupported(
  bullet: string,
  supportingText: string[],
): SupportCheck {
  const support = normalizeForMatch(supportingText.join(" "));
  const inventedNumbers = numbersIn(bullet).filter(
    (value) => !support.includes(value.toLowerCase()),
  );
  return { ok: inventedNumbers.length === 0, inventedNumbers };
}

/**
 * How many bullet-like lines the document contains.
 *
 * Used to tell whether an extraction actually read the résumé. The model is
 * usually thorough, but not always: on one run of a six-entry résumé it
 * returned only the education, which is exactly what a candidate reports as
 * "it found my GPA and nothing else". Counting what should have been found is
 * cheaper than hoping.
 */
export function countBulletLines(document: string): number {
  return document
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length < 25) return false;
      // An explicit bullet glyph, or a line long enough to be a described
      // achievement rather than a heading or a date range.
      if (/^[\u2022\u25aa\u25cf\u00b7*\-\u2013]/.test(line)) return true;
      return line.split(/\s+/).length >= 8;
    }).length;
}

/** Below this share of the document's bullets, an extraction has missed most of it. */
export const MIN_EXTRACTION_RATIO = 0.5;

export function extractionLooksComplete(
  claimCount: number,
  document: string,
): boolean {
  const bullets = countBulletLines(document);
  if (bullets === 0) return true;
  return claimCount >= bullets * MIN_EXTRACTION_RATIO;
}
