/**
 * Turns a validated pool problem into the shape the interview stores.
 *
 * The static problem list this replaces carried no test cases at all, so the
 * interviewer could only infer correctness from how the candidate typed. A pool
 * problem brings a signature, public examples, and hidden tests the judge can
 * run — which is the whole reason for the swap.
 *
 * Pure, so it can be tested without the pool, the judge, or a model.
 */

import { findArchetype } from "@/modules/guru/archetypes";
import type { GeneratedProblem } from "@/modules/guru/schema";
import type { CodingRun, StoredCodingProblem } from "../schema";

export function toStoredCodingProblem(
  problem: GeneratedProblem,
): StoredCodingProblem {
  const archetype = findArchetype(problem.archetypeId);
  return {
    id: problem.id,
    title: problem.title,
    topic: archetype?.name ?? problem.archetypeId,
    // The constraints belong in the prompt: the candidate is told the bounds,
    // and the interviewer reads the same text they can see.
    prompt: [
      problem.statement,
      ...problem.constraints.map((line) => `- ${line}`),
    ].join("\n"),
    edgeCases: problem.edgeCases,
    execution: {
      problemId: problem.id,
      archetypeId: problem.archetypeId,
      signature: problem.signature,
      publicTests: problem.publicTests,
      constraints: problem.constraints,
      expectedComplexity: problem.expectedComplexity,
    },
  };
}

/**
 * What the interviewer is told about the candidate's submissions.
 *
 * Deliberately not the failing values. An interviewer who reads out the hidden
 * case the candidate missed has handed them the answer; one who knows only that
 * a hidden case fails can ask what input might break it, which is the question
 * a real interviewer asks.
 */
export function describeRuns(runs: CodingRun[]): string {
  if (!runs.length)
    return "The candidate has not run their code yet. If they claim it works, ask them to run it.";

  const latest = runs[runs.length - 1]!;
  const lines = [
    `The candidate has run their code ${runs.length} time${runs.length === 1 ? "" : "s"}.`,
    `Most recent run: ${latest.verdict}, ${latest.passed} of ${latest.total} tests passing, in ${latest.language}.`,
  ];

  if (latest.passed === latest.total && latest.total > 0)
    lines.push(
      "Every test passes, so treat the implementation as correct and move to complexity and follow-ups.",
    );
  else if (latest.failedPublicTests.length)
    lines.push(
      `Failing example ${latest.failedPublicTests.length === 1 ? "case" : "cases"} ${latest.failedPublicTests
        .map((index) => index + 1)
        .join(
          ", ",
        )}, which the candidate can see. Point at the example rather than the fix.`,
    );
  else
    lines.push(
      "The visible examples pass but hidden tests do not. Do NOT reveal the hidden cases. Ask what input might break it.",
    );

  const improving =
    runs.length > 1 && latest.passed > runs[runs.length - 2]!.passed;
  if (improving)
    lines.push("They are converging; the last run improved on the one before.");

  return lines.join(" ");
}
