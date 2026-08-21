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

import { findArchetype } from "@/modules/zed/archetypes";
import type { GeneratedProblem } from "@/modules/zed/schema";
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
      tests: problem.tests,
      constraints: problem.constraints,
      expectedComplexity: problem.expectedComplexity,
    },
  };
}

/**
 * What the interviewer is told about the candidate's submissions.
 *
 * The candidate can see every test, so the interviewer is free to point at a
 * failing one. It is still told to ask rather than fix: naming the case is a
 * fair prompt, walking them to the answer is not.
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
  else if (latest.failedTests.length)
    lines.push(
      `Failing ${latest.failedTests.length === 1 ? "case" : "cases"} ${latest.failedTests
        .slice(0, 3)
        .map((index) => index + 1)
        .join(
          ", ",
        )}, which the candidate can see too. Ask what those inputs have in common rather than naming the fix.`,
    );

  const improving =
    runs.length > 1 && latest.passed > runs[runs.length - 2]!.passed;
  if (improving)
    lines.push("They are converging; the last run improved on the one before.");

  return lines.join(" ");
}
