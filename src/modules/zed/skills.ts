/**
 * The competency graph: what a candidate is good at, one skill at a time.
 *
 * Topic labels say where you have been, not what went wrong. "Graphs 52" does
 * not tell you whether the candidate cannot see the pattern, cannot derive the
 * optimization, or simply writes buggy loops — and those need different
 * practice. So every session scores the skills separately.
 *
 * The hard rule here is that a skill is only scored when something actually
 * happened that measures it. Two of the seven cannot be judged by watching
 * someone type, and inventing a number for them would repeat the fake dashboard
 * this page just stopped being.
 */

import {
  CODING_SKILLS,
  CODING_SKILL_LABELS,
  findArchetype,
  type CodingSkill,
  type Difficulty,
} from "./archetypes";

export interface AttemptSkillInput {
  archetypeId: string;
  difficulty: Difficulty;
  classificationCorrect: boolean;
  complexityCorrect: boolean;
  edgeCasesScore: number | null;
  solved: boolean;
  hintsUsed: number;
  runs: number;
  completedAt: string | null;
}

/** Hint two states the target complexity outright. */
const COMPLEXITY_HINT_INDEX = 2;

export interface SkillObservation {
  skill: CodingSkill;
  /** 0-10. */
  score: number;
}

/**
 * What one attempt says about each skill.
 *
 * Only skills with a real signal appear. Speaking skills never do — Zed is a
 * silent editor, and a silence is not evidence of anything.
 */
export function observeAttempt(attempt: AttemptSkillInput): SkillObservation[] {
  const observations: SkillObservation[] = [
    {
      skill: "pattern_recognition",
      score: attempt.classificationCorrect ? 10 : 0,
    },
    { skill: "complexity_analysis", score: attempt.complexityCorrect ? 10 : 0 },
    {
      skill: "implementation_accuracy",
      // Solving on the first run is different from solving on the seventh. The
      // judge is standing in for a compiler the candidate will not have.
      score: attempt.solved ? Math.max(4, 11 - attempt.runs) : 1,
    },
  ];

  if (attempt.edgeCasesScore !== null)
    observations.push({
      skill: "edge_case_identification",
      score: attempt.edgeCasesScore,
    });

  // Deriving the optimization is only demonstrated if they reached the target
  // without being handed it. Hint two gives the target away, so taking it
  // disqualifies the evidence rather than merely costing a point.
  if (attempt.hintsUsed < COMPLEXITY_HINT_INDEX)
    observations.push({
      skill: "optimization_derivation",
      score:
        attempt.solved && attempt.complexityCorrect
          ? 10
          : attempt.solved
            ? 5
            : 1,
    });

  return observations;
}

export interface SkillScore {
  skill: CodingSkill;
  label: string;
  /** 0-10, or null when nothing has measured this skill yet. */
  score: number | null;
  samples: number;
  /** Where the evidence would come from, for skills Zed cannot see. */
  measuredBy: "zed" | "stage_fright";
}

/** Speaking is Stage Fright's to judge; it is the side with a conversation. */
const CONVERSATIONAL_SKILLS: CodingSkill[] = [
  "brute_force_articulation",
  "communication",
];

/**
 * Recent attempts count for more, because the point is what the candidate can
 * do now, not what they could do a month ago. Five is short enough that a run
 * of recent successes visibly outweighs an older run of failures — which is
 * what improving is supposed to look like.
 */
const RECENCY_HALF_LIFE = 5;

export function aggregateSkills(attempts: AttemptSkillInput[]): SkillScore[] {
  const totals = new Map<
    CodingSkill,
    { weighted: number; weight: number; n: number }
  >();

  // Newest last, so the most recent attempts carry the heaviest weight.
  const ordered = [...attempts].sort((left, right) =>
    (left.completedAt ?? "").localeCompare(right.completedAt ?? ""),
  );

  ordered.forEach((attempt, index) => {
    const age = ordered.length - 1 - index;
    const weight = Math.pow(0.5, age / RECENCY_HALF_LIFE);
    for (const observation of observeAttempt(attempt)) {
      const entry = totals.get(observation.skill) ?? {
        weighted: 0,
        weight: 0,
        n: 0,
      };
      entry.weighted += observation.score * weight;
      entry.weight += weight;
      entry.n += 1;
      totals.set(observation.skill, entry);
    }
  });

  return CODING_SKILLS.map((skill) => {
    const entry = totals.get(skill);
    return {
      skill,
      label: CODING_SKILL_LABELS[skill],
      score: entry
        ? Math.round((entry.weighted / entry.weight) * 10) / 10
        : null,
      samples: entry?.n ?? 0,
      measuredBy: CONVERSATIONAL_SKILLS.includes(skill)
        ? ("stage_fright" as const)
        : ("zed" as const),
    };
  });
}

export interface Recommendation {
  archetypeId: string;
  archetypeName: string;
  difficulty: Difficulty;
  /** Why this one, in the second person, naming a real weakness. */
  reason: string;
  estimatedMinutes: number;
}

const MINUTES: Record<Difficulty, number> = { easy: 15, medium: 25, hard: 40 };
const HARDER: Record<Difficulty, Difficulty> = {
  easy: "medium",
  medium: "hard",
  hard: "hard",
};
const EASIER: Record<Difficulty, Difficulty> = {
  easy: "easy",
  medium: "easy",
  hard: "medium",
};

export interface ArchetypeStanding {
  archetypeId: string;
  name: string;
  attempts: number;
  solvedUnaided: number;
  recognized: number;
  strength: number;
  lastDifficulty: Difficulty | null;
}

/**
 * Chooses the next problem, and says why in terms of the candidate's own
 * history.
 *
 * "Pick another medium" is not advice. Naming the specific thing that keeps
 * going wrong is, and it is the reason for tracking skills separately at all.
 */
export function recommendNext(
  standings: ArchetypeStanding[],
  skills: SkillScore[],
  untouched: { id: string; name: string }[],
): Recommendation | null {
  const measured = skills.filter(
    (item) => item.score !== null && item.samples > 0,
  );
  const weakest = [...measured].sort(
    (left, right) => (left.score ?? 0) - (right.score ?? 0),
  )[0];
  const strongest = [...measured].sort(
    (left, right) => (right.score ?? 0) - (left.score ?? 0),
  )[0];

  // A weak archetype with history beats an unseen one: the gap is known.
  const target = [...standings].sort(
    (left, right) => left.strength - right.strength,
  )[0];

  if (!target) {
    const first = untouched[0];
    if (!first) return null;
    return {
      archetypeId: first.id,
      archetypeName: first.name,
      difficulty: "medium",
      reason:
        "Nothing practised yet. Start here, and the recommendations after this one will be based on what actually went wrong.",
      estimatedMinutes: MINUTES.medium,
    };
  }

  const solvesCleanly =
    target.attempts > 0 && target.solvedUnaided / target.attempts >= 0.7;
  const base = target.lastDifficulty ?? "medium";
  const difficulty = solvesCleanly
    ? HARDER[base]
    : target.strength < 35
      ? EASIER[base]
      : base;

  const archetype = findArchetype(target.archetypeId);
  const reason = [
    strongest && strongest.score !== null && strongest.score >= 7
      ? `Your ${strongest.label.toLowerCase()} is strong`
      : null,
    weakest && weakest.score !== null
      ? `${strongest && strongest.score !== null && strongest.score >= 7 ? ", but " : "Your "}${weakest.label.toLowerCase()} is where this keeps breaking down`
      : null,
    archetype ? `. ${archetype.tell}` : ".",
  ]
    .filter(Boolean)
    .join("");

  return {
    archetypeId: target.archetypeId,
    archetypeName: target.name,
    difficulty,
    reason:
      reason ||
      `You have practised ${target.name} ${target.attempts} times without solving it unaided.`,
    estimatedMinutes: MINUTES[difficulty],
  };
}
