/**
 * Archetypes are not questions. Each one describes a skill to test and the
 * constraints a generated problem must satisfy to test it honestly.
 *
 * Storing ~30 of these instead of ~500 problems is the whole point: variation
 * comes from generation, so a candidate never memorizes their way through.
 */

export const CODING_SKILLS = [
  "pattern_recognition",
  "brute_force_articulation",
  "optimization_derivation",
  "edge_case_identification",
  "implementation_accuracy",
  "complexity_analysis",
  "communication",
] as const;
export type CodingSkill = (typeof CODING_SKILLS)[number];

export const CODING_SKILL_LABELS: Record<CodingSkill, string> = {
  pattern_recognition: "Recognizing the pattern",
  brute_force_articulation: "Explaining the brute force",
  optimization_derivation: "Deriving the optimization",
  edge_case_identification: "Edge-case identification",
  implementation_accuracy: "Implementation accuracy",
  complexity_analysis: "Complexity analysis",
  communication: "Communication",
};

export type Difficulty = "easy" | "medium" | "hard";

export interface Archetype {
  id: string;
  name: string;
  /** Shown to the candidate only after they commit to a classification. */
  tell: string;
  competencies: string[];
  /** Free-form guidance handed to the generator. */
  constraints: string[];
  /**
   * Techniques that would make this a different archetype. Live testing showed
   * the model drifting - a "two pointers" request came back as a monotonic
   * deque problem - which would teach the wrong pattern name at the
   * classification gate.
   */
  exclusions: string[];
  optimalComplexity: Record<Difficulty, string>;
  bruteForceComplexity: string;
  /** Distractors for the classify-before-you-code gate. */
  confusableWith: string[];
}

export const ARCHETYPES: Archetype[] = [
  {
    id: "sliding-window",
    name: "Sliding window",
    tell: "You are asked about a contiguous run of elements, and recomputing each run from scratch repeats work the previous run already did.",
    competencies: [
      "recognizing contiguous-range structure",
      "maintaining incremental state across a moving boundary",
      "deciding when to expand versus shrink",
      "arguing the amortized O(n) bound",
    ],
    constraints: [
      "The optimal solution must maintain a window over a single pass.",
      "A correct brute force must re-scan every candidate range.",
      "Include at least one case where the window must shrink, not only grow.",
      "Avoid problems solvable by a single prefix sum lookup.",
    ],
    exclusions: [
      "Must NOT require a deque, monotonic structure, heap, or sorted container to track the window.",
      "Window state must be a simple counter, sum, or frequency map.",
      "If tracking a running min and max is required, it is not this archetype.",
    ],
    optimalComplexity: { easy: "O(n)", medium: "O(n)", hard: "O(n log n)" },
    bruteForceComplexity: "O(n^2)",
    confusableWith: ["two-pointers", "prefix-sum", "hash-map"],
  },
  {
    id: "hash-map",
    name: "Hash map",
    tell: "You need to answer 'have I seen this before?' or 'how many of these are there?' while scanning, and a nested loop is doing that lookup by rescanning.",
    competencies: [
      "replacing a nested scan with a keyed lookup",
      "choosing a key that makes the invariant obvious",
      "handling duplicate and absent keys",
      "trading space for time deliberately",
    ],
    constraints: [
      "The optimal solution must reduce a nested scan to one pass plus a map.",
      "The key must require a small insight, not merely be the element itself.",
      "Include a case with duplicate values that a naive key choice mishandles.",
      "Do not require sorting in the optimal path.",
    ],
    exclusions: [
      "Must NOT be about a contiguous range or window.",
      "Must NOT depend on two indices converging over sorted data.",
    ],
    optimalComplexity: { easy: "O(n)", medium: "O(n)", hard: "O(n)" },
    bruteForceComplexity: "O(n^2)",
    confusableWith: ["two-pointers", "sliding-window", "sorting"],
  },
  {
    id: "two-pointers",
    name: "Two pointers",
    tell: "The input is sorted or can be, and the answer depends on a pair or a partition whose search space collapses when you move one end at a time.",
    competencies: [
      "exploiting order to discard half the search space",
      "choosing which pointer to advance and justifying it",
      "avoiding the off-by-one at the crossing point",
      "recognizing when sorting first is worth the log factor",
    ],
    constraints: [
      "The optimal solution must use two indices converging or advancing in step.",
      "The correctness argument must depend on ordering.",
      "Include a case where both pointers land on equal values.",
      "Do not make the answer reachable by a single linear scan.",
    ],
    exclusions: [
      "Must NOT require a deque, heap, or monotonic structure.",
      "Must NOT be a contiguous-window problem whose state is a frequency map.",
      "Correctness must rest on ordering and converging indices, not on keyed lookup.",
    ],
    optimalComplexity: {
      easy: "O(n)",
      medium: "O(n)",
      hard: "O(n log n)",
    },
    bruteForceComplexity: "O(n^2)",
    confusableWith: ["sliding-window", "binary-search", "hash-map"],
  },
];

export const ARCHETYPE_IDS = ARCHETYPES.map((item) => item.id);

export function findArchetype(id: string) {
  return ARCHETYPES.find((item) => item.id === id) ?? null;
}

/**
 * Options for the classify-before-you-code gate: the true archetype plus its
 * most plausible confusions, so a correct answer means recognition rather than
 * elimination.
 */
export function classificationChoices(archetype: Archetype): string[] {
  const distractors = archetype.confusableWith.slice(0, 3);
  return [archetype.id, ...distractors].sort();
}
