/**
 * The practice loop's rules: what counts as recognizing the pattern, what
 * counts as predicting the cost, what the hints give away and in what order,
 * and what the candidate is told at the end.
 *
 * Grading lives on the server because the answers do. The browser is sent four
 * unmarked choices, never which one is right — a gate whose answer ships with
 * the question is not a gate.
 *
 * Pure, so all of it is testable without a model, a judge, or DynamoDB.
 */

import { findArchetype, type Archetype } from "./archetypes";
import type { GeneratedProblem } from "./schema";

/** Ladder used to build plausible wrong answers for the complexity gate. */
const COMPLEXITY_LADDER = [
  "O(1)",
  "O(log n)",
  "O(n)",
  "O(n log n)",
  "O(n^2)",
  "O(n^3)",
  "O(2^n)",
];

/**
 * Reduces a complexity to something comparable.
 *
 * The model writes these freely — "O(V + E) where V is the number of cities"
 * has to match a candidate picking "O(V + E)". Everything after the closing
 * parenthesis is commentary, and spacing and case carry no meaning.
 */
export function normalizeComplexity(text: string): string {
  const lowered = text.toLowerCase().replace(/\s+/g, "");
  const start = lowered.indexOf("o(");
  if (start === -1) return lowered;
  let depth = 0;
  for (let index = start + 1; index < lowered.length; index += 1) {
    if (lowered[index] === "(") depth += 1;
    if (lowered[index] === ")") {
      depth -= 1;
      if (depth === 0)
        return lowered
          .slice(start, index + 1)
          .replace(/\*/g, "")
          .replace(/\^/g, "");
    }
  }
  return lowered.slice(start);
}

export function complexityMatches(candidate: string, truth: string) {
  return normalizeComplexity(candidate) === normalizeComplexity(truth);
}

/** Deterministic shuffle, so a seeded test can assert the option set. */
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap]!, result[index]!];
  }
  return result;
}

export interface ClassificationChoice {
  id: string;
  name: string;
}

export interface PracticeGate {
  classification: ClassificationChoice[];
  complexity: string[];
}

/**
 * The unmarked choices the browser is allowed to see.
 *
 * Distractors come from the archetype's own confusableWith list, so a correct
 * answer means recognition rather than elimination.
 */
export function buildGate(
  problem: GeneratedProblem,
  random: () => number = Math.random,
): PracticeGate {
  const archetype = findArchetype(problem.archetypeId);
  const distractors = (archetype?.confusableWith ?? [])
    .map((id) => findArchetype(id))
    .filter((item): item is Archetype => Boolean(item))
    .slice(0, 3);

  const classification = shuffle(
    [
      ...(archetype ? [{ id: archetype.id, name: archetype.name }] : []),
      ...distractors.map((item) => ({ id: item.id, name: item.name })),
    ],
    random,
  );

  const truth = problem.expectedComplexity.time;
  const wrong = COMPLEXITY_LADDER.filter(
    (item) => !complexityMatches(item, truth),
  ).slice(0, 3);
  const complexity = shuffle([truth, ...wrong], random);

  return { classification, complexity };
}

/**
 * Progressive hints, drawn from what the problem already carries.
 *
 * Ordered so that each one costs more than the last: the first names the shape
 * of the idea, the second gives away the target, the third points at a case
 * they are probably not handling. Nothing here reveals the solution.
 */
export function hintsFor(problem: GeneratedProblem): string[] {
  const archetype = findArchetype(problem.archetypeId);
  const hints: string[] = [];
  if (archetype)
    hints.push(`Think about the shape of the problem. ${archetype.tell}`);
  hints.push(
    `Aim for ${problem.expectedComplexity.time} time and ${problem.expectedComplexity.space} space. If your approach is slower than that, the structure is wrong, not the code.`,
  );
  const edge = problem.edgeCases[0];
  if (edge) hints.push(`Make sure you handle this case: ${edge}.`);
  return hints;
}

export const MAX_HINTS = 3;

export interface AttemptSignals {
  classificationCorrect: boolean;
  complexityCorrect: boolean;
  solved: boolean;
  hintsUsed: number;
  runs: number;
}

export interface CoachingPoint {
  tone: "good" | "work";
  title: string;
  detail: string;
}

/**
 * What the candidate is told once the problem is closed.
 *
 * Every point is grounded in something that actually happened — a judged
 * verdict, a recorded answer, a hint they opened. Guru's whole claim is that it
 * separates recognizing the pattern from implementing it, so those are reported
 * separately even when both went the same way.
 */
export function buildCoaching(
  problem: GeneratedProblem,
  signals: AttemptSignals,
): CoachingPoint[] {
  const archetype = findArchetype(problem.archetypeId);
  const points: CoachingPoint[] = [];

  points.push(
    signals.classificationCorrect
      ? {
          tone: "good",
          title: "You named the pattern",
          detail: `You recognized this as ${archetype?.name ?? problem.archetypeId} before writing code, which is the part interviews actually select for.`,
        }
      : {
          tone: "work",
          title: "The pattern was misread",
          detail:
            `This was ${archetype?.name ?? problem.archetypeId}. ${archetype?.tell ?? ""} Misclassifying costs more than a slow implementation, because it sends the whole solution the wrong way.`.trim(),
        },
  );

  points.push(
    signals.complexityCorrect
      ? {
          tone: "good",
          title: "You predicted the cost",
          detail: `You committed to ${problem.expectedComplexity.time} before coding, so you knew what you were aiming at rather than discovering it afterwards.`,
        }
      : {
          tone: "work",
          title: "The target was off",
          detail: `The intended solution is ${problem.expectedComplexity.time} time and ${problem.expectedComplexity.space} space. Committing to the wrong target usually means the approach was chosen before the cost was thought about.`,
        },
  );

  if (signals.solved)
    points.push(
      signals.hintsUsed === 0
        ? {
            tone: "good",
            title: "Solved unaided",
            detail: `All tests passed with no hints, across ${signals.runs} ${signals.runs === 1 ? "run" : "runs"}.`,
          }
        : {
            tone: "work",
            title: `Solved after ${signals.hintsUsed} ${signals.hintsUsed === 1 ? "hint" : "hints"}`,
            detail:
              "Worth repeating this archetype in a few days without them. A solved-with-hints problem is not yet a pattern you own.",
          },
    );
  else
    points.push({
      tone: "work",
      title: "Not yet passing",
      detail:
        "The tests do not all pass. Come back to this one before starting a new archetype — an abandoned problem teaches less than a slow one.",
    });

  if (signals.runs > 4)
    points.push({
      tone: "work",
      title: "A lot of runs",
      detail: `You ran the tests ${signals.runs} times. Reaching for the judge instead of re-reading the code is a habit an interviewer notices, because in a real interview there is no judge.`,
    });

  return points;
}

export interface AttemptRecord {
  archetypeId: string;
  classificationCorrect: boolean;
  solved: boolean;
  hintsUsed: number;
  completedAt: string | null;
}

export interface ArchetypeMasteryView {
  archetypeId: string;
  name: string;
  attempts: number;
  solved: number;
  solvedUnaided: number;
  recognized: number;
  lastPracticedAt: string | null;
  /** 0-100, and deliberately not a average of scores nobody can interpret. */
  strength: number;
}

/**
 * Turns the attempt history into the numbers the dashboard shows.
 *
 * Strength weights recognizing the pattern and solving it unaided, because
 * those are the two things that transfer to an interview. Solving with hints
 * counts, but for less.
 */
export function summarizeMastery(
  attempts: AttemptRecord[],
): ArchetypeMasteryView[] {
  const byArchetype = new Map<string, AttemptRecord[]>();
  for (const attempt of attempts) {
    const list = byArchetype.get(attempt.archetypeId) ?? [];
    list.push(attempt);
    byArchetype.set(attempt.archetypeId, list);
  }

  return [...byArchetype.entries()]
    .map(([archetypeId, list]) => {
      const solved = list.filter((item) => item.solved);
      const solvedUnaided = solved.filter((item) => item.hintsUsed === 0);
      const recognized = list.filter((item) => item.classificationCorrect);
      const lastPracticedAt = list
        .map((item) => item.completedAt)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1);
      return {
        archetypeId,
        name: findArchetype(archetypeId)?.name ?? archetypeId,
        attempts: list.length,
        solved: solved.length,
        solvedUnaided: solvedUnaided.length,
        recognized: recognized.length,
        lastPracticedAt: lastPracticedAt ?? null,
        strength: Math.round(
          ((recognized.length / list.length) * 0.4 +
            (solvedUnaided.length / list.length) * 0.45 +
            (solved.length / list.length) * 0.15) *
            100,
        ),
      };
    })
    .sort((left, right) => left.strength - right.strength);
}
