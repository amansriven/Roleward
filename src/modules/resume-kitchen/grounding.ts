/**
 * Keeps extracted claims tied to the document they came from.
 *
 * The intake screen asks the candidate to confirm claims about themselves, and
 * a confirmed claim becomes "verified background" — it feeds interview
 * questions and tailored résumé bullets. So a model that embellishes here does
 * not produce a bad suggestion, it produces a fabricated credential the
 * candidate has personally signed off on.
 *
 * The defence is the same one Guru uses for expected outputs: do not trust the
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

/** Collapses whitespace and case so a quote survives PDF spacing artefacts. */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Whether a quote genuinely appears in the document.
 *
 * Exact containment after normalization, with one concession: PDF extraction
 * frequently breaks a line mid-phrase, so a quote is also accepted when all of
 * its words appear in order within a short window of each other.
 */
export function quoteAppearsIn(quote: string, document: string): boolean {
  const haystack = normalizeForMatch(document);
  const needle = normalizeForMatch(quote);
  if (needle.length < 8) return false;
  if (haystack.includes(needle)) return true;

  const words = needle.split(" ").filter((word) => word.length > 2);
  if (words.length < 3) return false;
  let cursor = 0;
  for (const word of words) {
    const at = haystack.indexOf(word, cursor);
    if (at === -1) return false;
    // Words must stay close together, or unrelated pages would satisfy this.
    if (cursor > 0 && at - cursor > 120) return false;
    cursor = at + word.length;
  }
  return true;
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
  summary: string;
  claims: DraftClaim[];
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
