/**
 * Test inputs arrive as JSON arrays of positional arguments, which is ambiguous
 * for the commonest signature of all.
 *
 * A function taking one `int[]` should get `[[1,3,5]]` — a single argument that
 * happens to be a list. Models routinely write `[1,3,5]` instead, and the judge
 * then calls it with three arguments and reports a TypeError against a
 * perfectly good solution. Live generation showed this rejecting whole drafts.
 *
 * Pure, so it can be tested without reaching for the model or the judge.
 */

import type { Signature } from "./schema";

export type ArityFix = "exact" | "wrapped";

export interface NormalizedInputs {
  inputs: unknown[][];
  /** Which entries had to be repaired, for the prompt-quality signal. */
  fixes: ArityFix[];
}

export class ArityError extends Error {}

/**
 * Reconciles each entry against the declared parameter count.
 *
 * Only the single-parameter case is repairable: `[1,3,5]` for one `int[]` can
 * only have meant one argument. With two or more parameters a miscount is
 * genuinely ambiguous, so it is rejected rather than guessed at — cheaply, and
 * before either judge round trip has been paid for.
 */
export function normalizeTestInputs(
  signature: Signature,
  entries: unknown[][],
): NormalizedInputs {
  const arity = signature.parameters.length;
  const fixes: ArityFix[] = [];
  const inputs = entries.map((entry, index) => {
    if (entry.length === arity) {
      fixes.push("exact");
      return entry;
    }
    if (arity === 1) {
      fixes.push("wrapped");
      return [entry];
    }
    throw new ArityError(
      `Test input ${index} has ${entry.length} arguments but ${signature.name} takes ${arity}.`,
    );
  });
  return { inputs, fixes };
}
