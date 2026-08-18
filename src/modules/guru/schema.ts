import { z } from "zod";
import { LANGUAGES } from "@/modules/execution/port";
import { ARCHETYPE_IDS, CODING_SKILLS, type Difficulty } from "./archetypes";

/** Below this a problem cannot hide enough of its behaviour to be worth solving. */
export const MIN_HIDDEN_TESTS = 4;

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

/** The full object the model produces. Hidden fields never reach the browser. */
export const generatedProblemSchema = z.object({
  id: z.string().min(1),
  archetypeId: z.enum(ARCHETYPE_IDS as [string, ...string[]]),
  difficulty: difficultySchema,
  title: z.string().trim().min(3).max(80),
  statement: z.string().trim().min(80),
  constraints: z.array(z.string().trim().min(1)).min(1).max(6),
  signature: signatureSchema,
  publicTests: z.array(testCaseSchema).min(2).max(4),
  hiddenTests: z.array(testCaseSchema).min(MIN_HIDDEN_TESTS).max(20),
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
});
export type GeneratedProblem = z.infer<typeof generatedProblemSchema>;

/** Everything the browser is allowed to see. */
export const clientProblemSchema = generatedProblemSchema.pick({
  id: true,
  archetypeId: true,
  difficulty: true,
  title: true,
  statement: true,
  constraints: true,
  signature: true,
  publicTests: true,
});
export type ClientProblem = z.infer<typeof clientProblemSchema>;

export function toClientProblem(problem: GeneratedProblem): ClientProblem {
  return clientProblemSchema.parse(problem);
}

export const submissionSchema = z.object({
  problemId: z.string().min(1),
  language: z.enum(LANGUAGES),
  code: z.string().min(1).max(60_000),
});

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

/** How many test inputs a draft carries, and how many of them are public. */
export const TEST_INPUT_COUNT = 10;
export const PUBLIC_TEST_COUNT = 3;

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
