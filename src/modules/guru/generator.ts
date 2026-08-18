import "server-only";

import { z } from "zod";
import { INTERVIEW_MODEL, openai } from "@/modules/interviews/openai";
import { findArchetype, type Archetype, type Difficulty } from "./archetypes";
import {
  MIN_HIDDEN_TESTS,
  PUBLIC_TEST_COUNT,
  signatureSchema,
  TEST_INPUT_COUNT,
  type ProblemDraft,
} from "./schema";

export { PUBLIC_TEST_COUNT, TEST_INPUT_COUNT, type ProblemDraft };

/** Enough inputs to fill the public tests and the schema's hidden-test floor. */
const MIN_TEST_INPUTS = PUBLIC_TEST_COUNT + MIN_HIDDEN_TESTS;

/**
 * The model is never asked what its function returns.
 *
 * Live testing showed it confidently mispredicting its own canonical solution's
 * output on 3-4 of 8 cases. It writes correct code and then guesses at the
 * results. So it supplies inputs; expected outputs are derived by execution.
 */
const rawProblemSchema = z.object({
  title: z.string().trim().min(3).max(80),
  statement: z.string().trim().min(80),
  constraints: z.array(z.string().trim().min(1)).min(1),
  signature: z.object({
    name: z.string().regex(/^[a-z][a-z0-9_]*$/),
    parameters: z
      .array(
        z.object({
          name: z.string().regex(/^[a-z][a-z0-9_]*$/),
          type: z.string(),
          description: z.string().trim().min(1),
        }),
      )
      .min(1)
      .max(4),
    returnType: z.string(),
  }),
  testInputsJson: z.array(z.string().min(2)).min(4),
  edgeCases: z.array(z.string().trim().min(1)).min(1),
  followUps: z
    .array(
      z.object({
        prompt: z.string().trim().min(1),
        lookingFor: z.string().trim().min(1),
      }),
    )
    .min(1),
  expectedComplexity: z.object({
    time: z.string().trim().min(2),
    space: z.string().trim().min(2),
  }),
  canonicalSolution: z.string().trim().min(20),
  bruteForceSolution: z.string().trim().min(20),
  inputGenerator: z.string().trim().min(20),
});

const parameterType = {
  type: "string",
  enum: [
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
  ],
} as const;

const problemJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "statement",
    "constraints",
    "signature",
    "testInputsJson",
    "edgeCases",
    "followUps",
    "expectedComplexity",
    "canonicalSolution",
    "bruteForceSolution",
    "inputGenerator",
  ],
  properties: {
    title: { type: "string", description: "Plain, non-cute problem title." },
    statement: {
      type: "string",
      description:
        "The problem as an interviewer would say it aloud. No I/O format section, no constraints section.",
    },
    constraints: {
      type: "array",
      description: "Between 1 and 5 constraint lines.",
      items: { type: "string" },
    },
    signature: {
      type: "object",
      additionalProperties: false,
      required: ["name", "parameters", "returnType"],
      properties: {
        name: { type: "string", description: "snake_case function name." },
        parameters: {
          type: "array",
          description: "Between 1 and 4 parameters.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "type", "description"],
            properties: {
              name: { type: "string" },
              type: parameterType,
              description: { type: "string" },
            },
          },
        },
        returnType: parameterType,
      },
    },
    testInputsJson: {
      type: "array",
      description: `EXACTLY ${TEST_INPUT_COUNT} entries. Each is a JSON array of positional arguments in signature order, for example "[[2,7,11,15], 9]". Do not include expected outputs.`,
      items: { type: "string" },
    },
    edgeCases: {
      type: "array",
      description: "Between 2 and 5 edge cases the test inputs already cover.",
      items: { type: "string" },
    },
    followUps: {
      type: "array",
      description: "Between 1 and 3 follow-up questions.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["prompt", "lookingFor"],
        properties: {
          prompt: { type: "string" },
          lookingFor: { type: "string" },
        },
      },
    },
    expectedComplexity: {
      type: "object",
      additionalProperties: false,
      required: ["time", "space"],
      properties: { time: { type: "string" }, space: { type: "string" } },
    },
    canonicalSolution: {
      type: "string",
      description:
        "Python 3 source defining the signature function at module level, using the optimal approach.",
    },
    bruteForceSolution: {
      type: "string",
      description:
        "Python 3 source defining the same function name, written for obvious correctness rather than speed.",
    },
    inputGenerator: {
      type: "string",
      description:
        "Python 3 source defining generate_input(seed) that seeds random and returns a list of positional arguments obeying the constraints.",
    },
  },
} as const;

function instructions(archetype: Archetype, difficulty: Difficulty) {
  return [
    "You write original coding-interview problems for a practice platform.",
    "",
    `Archetype: ${archetype.name}`,
    `The skill being tested: ${archetype.competencies.join("; ")}.`,
    `Difficulty: ${difficulty}.`,
    `Target optimal complexity: ${archetype.optimalComplexity[difficulty]}.`,
    `A correct brute force should be about ${archetype.bruteForceComplexity}.`,
    "",
    "Generation constraints:",
    ...archetype.constraints.map((item) => `- ${item}`),
    "",
    "This problem is DISQUALIFIED if any of these are true:",
    ...archetype.exclusions.map((item) => `- ${item}`),
    "",
    "Counts (these are exact, not suggestions):",
    `- testInputsJson: EXACTLY ${TEST_INPUT_COUNT} entries.`,
    "- constraints: 1 to 5 entries.",
    "- edgeCases: 2 to 5 entries.",
    "- followUps: 1 to 3 entries.",
    "",
    "Hard requirements:",
    "- The problem must be ORIGINAL. Do not reproduce the wording of any published problem.",
    "- Write the statement the way an interviewer says it out loud: a concrete scenario, then what to return. No 'Input:'/'Output:' sections.",
    "- canonicalSolution and bruteForceSolution must BOTH define a module-level function with exactly the signature name, taking the parameters in order.",
    "- The two must be genuinely independent approaches that agree on every valid input.",
    "- bruteForceSolution must be the obviously-correct version. Prefer clarity over efficiency; it is the oracle.",
    "- inputGenerator must define generate_input(seed), call random.seed(seed), and return a LIST of positional arguments matching the signature exactly.",
    "- Inputs stay small enough that the brute force finishes quickly (collections of at most ~40 elements).",
    "- testInputsJson must collectively exercise every edge case you list.",
    "- Do NOT provide expected outputs anywhere. They are computed by running your canonical solution.",
    "- Every parameter must be homogeneous: an int[] holds only integers, a string[] only strings.",
    "- NEVER encode numbers inside a string array. If you need paired data, use two parallel arrays (names: string[], ages: int[]).",
    "- The declared parameter types must be exactly what the canonical solution operates on, because typed stubs in ten languages are generated from them.",
    "- Use only the Python standard library.",
  ].join("\n");
}

export class ProblemGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProblemGenerationError";
  }
}

export async function generateProblemDraft(
  archetypeId: string,
  difficulty: Difficulty,
): Promise<ProblemDraft> {
  const archetype = findArchetype(archetypeId);
  if (!archetype)
    throw new ProblemGenerationError(`Unknown archetype: ${archetypeId}`);

  const response = await openai().chat.completions.create({
    model: INTERVIEW_MODEL,
    // High enough that repeated calls on one archetype do not converge.
    temperature: 1,
    messages: [
      { role: "system", content: instructions(archetype, difficulty) },
      {
        role: "user",
        content: `Write one ${difficulty} ${archetype.name} problem.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "coding_problem",
        strict: true,
        schema: problemJsonSchema,
      },
    },
  });

  const content = response.choices[0]?.message?.content ?? "";
  let raw: z.infer<typeof rawProblemSchema>;
  try {
    raw = rawProblemSchema.parse(JSON.parse(content));
  } catch (error) {
    throw new ProblemGenerationError(
      `The model returned an unusable problem: ${
        error instanceof Error ? error.message.slice(0, 200) : "unparseable"
      }`,
    );
  }

  // Every failure here must be a ProblemGenerationError, because that is what
  // the pipeline retries on. A raw SyntaxError would abandon the request.
  const testInputs = raw.testInputsJson.slice(0, TEST_INPUT_COUNT).map((entry) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(entry);
    } catch {
      throw new ProblemGenerationError(
        `A test input was not valid JSON: ${entry.slice(0, 120)}`,
      );
    }
    if (!Array.isArray(parsed))
      throw new ProblemGenerationError(
        "A test input was not a JSON array of arguments.",
      );
    return parsed;
  });

  // Cheaper to reject now than after two Lambda round trips prove a problem
  // that cannot fill its hidden test set anyway.
  if (testInputs.length < MIN_TEST_INPUTS)
    throw new ProblemGenerationError(
      `Only ${testInputs.length} test inputs were returned; ${MIN_TEST_INPUTS} is the minimum.`,
    );

  return {
    archetypeId: archetype.id,
    difficulty,
    title: raw.title,
    statement: raw.statement,
    // Trim rather than reject: strict mode does not enforce array bounds, so
    // the model overshoots these counts routinely.
    constraints: raw.constraints.slice(0, 5),
    signature: signatureSchema.parse(raw.signature),
    testInputs,
    edgeCases: raw.edgeCases.slice(0, 5),
    followUps: raw.followUps.slice(0, 3),
    expectedComplexity: raw.expectedComplexity,
    canonicalSolution: raw.canonicalSolution,
    bruteForceSolution: raw.bruteForceSolution,
    inputGenerator: raw.inputGenerator,
  };
}
