import { z } from "zod";
import { LANGUAGES } from "@/modules/execution/port";
import { ARCHETYPE_IDS, CODING_SKILLS, type Difficulty } from "./archetypes";

/** Below this a problem does not exercise enough behaviour to be worth solving. */
export const MIN_TESTS = 6;

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const codingSkillSchema = z.enum(CODING_SKILLS);

/**
 * A language-agnostic signature. Stubs for all ten editor languages render from
 * this, so adding a language is one formatter rather than N hand-written stubs.
 */
export const parameterSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  type: z.enum([
    "int",
    "float",
    "string",
    "bool",
    "int[]",
    "float[]",
    "string[]",
    "bool[]",
    "int[][]",
    "string[][]",
  ]),
  description: z.string().trim().min(1),
});
export type Parameter = z.infer<typeof parameterSchema>;

export const signatureSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  parameters: z.array(parameterSchema).min(1).max(4),
  returnType: parameterSchema.shape.type,
});
export type Signature = z.infer<typeof signatureSchema>;

export const testCaseSchema = z.object({
  input: z.array(z.unknown()),
  expected: z.unknown(),
  /** Only ever populated on public tests. */
  explanation: z.string().trim().optional(),
});

export const followUpSchema = z.object({
  prompt: z.string().trim().min(1),
  /** What a strong answer contains, for the interviewer rather than the UI. */
  lookingFor: z.string().trim().min(1),
});

/**
 * The full object the model produces.
 *
 * Tests were once split into public and hidden, so a candidate could not
 * hardcode their way past the judge. That protects a score with an external
 * stakeholder; here the only person a candidate can cheat is themselves, and
 * the cost was a bad teaching signal — a failure they were not allowed to see.
 * `preprocess` folds already-pooled problems into the single list.
 */
export const generatedProblemSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if (record.tests || !Array.isArray(record.publicTests)) return value;
  const { publicTests, hiddenTests, ...rest } = record;
  return {
    ...rest,
    tests: [
      ...publicTests,
      ...(Array.isArray(hiddenTests) ? hiddenTests : []),
    ],
  };
}, z.object({
  id: z.string().min(1),
  archetypeId: z.enum(ARCHETYPE_IDS as [string, ...string[]]),
  difficulty: difficultySchema,
  title: z.string().trim().min(3).max(80),
  statement: z.string().trim().min(80),
  constraints: z.array(z.string().trim().min(1)).min(1).max(6),
  signature: signatureSchema,
  tests: z.array(testCaseSchema).min(MIN_TESTS).max(20),
  edgeCases: z.array(z.string().trim().min(1)).min(2).max(6),
  followUps: z.array(followUpSchema).min(1).max(3),
  expectedComplexity: z.object({
    time: z.string().trim().min(2),
    space: z.string().trim().min(2),
  }),
  canonicalSolution: z.string().trim().min(20),
  bruteForceSolution: z.string().trim().min(20),
  /** Python defining generate_input(seed) -> list of positional arguments. */
  inputGenerator: z.string().trim().min(20),
  createdAt: z.string().datetime(),
  validation: z
    .object({
      trials: z.number().int().nonnegative(),
      validatedAt: z.string().datetime(),
    })
    .nullable()
    .default(null),
}));
export type GeneratedProblem = z.infer<typeof generatedProblemSchema>;

/**
 * Everything the browser is allowed to see.
 *
 * The tests are all of them now. What still does not cross is the pair of
 * solutions and the input generator, and — for the practice gate — which of the
 * offered archetypes is the right one.
 */
export const clientProblemSchema = z.object({
  id: z.string().min(1),
  difficulty: difficultySchema,
  title: z.string(),
  statement: z.string(),
  constraints: z.array(z.string()),
  signature: signatureSchema,
  tests: z.array(testCaseSchema),
  expectedComplexity: z.object({ time: z.string(), space: z.string() }),
});
export type ClientProblem = z.infer<typeof clientProblemSchema>;

export function toClientProblem(problem: GeneratedProblem): ClientProblem {
  return clientProblemSchema.parse({
    id: problem.id,
    difficulty: problem.difficulty,
    title: problem.title,
    statement: problem.statement,
    constraints: problem.constraints,
    signature: problem.signature,
    tests: problem.tests,
    expectedComplexity: problem.expectedComplexity,
  });
}

export const submissionSchema = z.object({
  problemId: z.string().min(1),
  language: z.enum(LANGUAGES),
  code: z.string().min(1).max(60_000),
});

/**
 * One pass through the practice loop.
 *
 * Held server-side because most of it is not the candidate's to assert: whether
 * they named the pattern, whether they predicted the cost, how many hints they
 * opened, and whether the judge ever accepted their code.
 */
export const practiceAttemptSchema = z.object({
  problemId: z.string().min(1),
  archetypeId: z.string().min(1),
  difficulty: difficultySchema,
  classification: z.string().nullable().default(null),
  classificationCorrect: z.boolean().default(false),
  complexity: z.string().nullable().default(null),
  complexityCorrect: z.boolean().default(false),
  hintsUsed: z.number().int().nonnegative().default(0),
  runs: z.number().int().nonnegative().default(0),
  solved: z.boolean().default(false),
  startedAt: z.string().datetime(),
  committedAt: z.string().datetime().nullable().default(null),
  completedAt: z.string().datetime().nullable().default(null),
});
export type PracticeAttempt = z.infer<typeof practiceAttemptSchema>;

/** Per-skill scores accumulated across sessions — the competency graph. */
export const skillScoreSchema = z.object({
  skill: codingSkillSchema,
  score: z.number().min(0).max(10),
  samples: z.number().int().nonnegative(),
});

export const archetypeMasterySchema = z.object({
  archetypeId: z.string().min(1),
  attempts: z.number().int().nonnegative(),
  solvedUnaided: z.number().int().nonnegative(),
  recognizedUnprompted: z.number().int().nonnegative(),
  lastPracticedAt: z.string().datetime().nullable(),
});
export type ArchetypeMastery = z.infer<typeof archetypeMasterySchema>;

/** How many test inputs a draft carries. */
export const TEST_INPUT_COUNT = 10;

/** A generated problem before expected outputs have been derived by execution. */
export interface ProblemDraft {
  archetypeId: string;
  difficulty: Difficulty;
  title: string;
  statement: string;
  constraints: string[];
  signature: Signature;
  testInputs: unknown[][];
  edgeCases: string[];
  followUps: { prompt: string; lookingFor: string }[];
  expectedComplexity: { time: string; space: string };
  canonicalSolution: string;
  bruteForceSolution: string;
  inputGenerator: string;
}
