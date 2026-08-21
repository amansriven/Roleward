import "server-only";

import { z } from "zod";
import { INTERVIEW_MODEL, openai } from "@/modules/interviews/openai";
import { jobRequirementSchema } from "@/modules/applications/schema";
import { quoteAppearsIn } from "./grounding";

/**
 * Reads a job description and lists what the role actually asks for.
 *
 * What this replaces was a six-rule keyword table that returned canned strings
 * like "Production experience with TypeScript or JavaScript" — and, when fewer
 * than three rules matched, returned the first five regardless of the posting.
 * A product-management job description produced backend requirements, and the
 * matching underneath was then scored against things the employer never said.
 *
 * So requirements are quoted from the posting and the quote is checked, the
 * same way resume claims are.
 */

export class RequirementExtractionError extends Error {}

const draftSchema = z.object({
  requirements: z.array(
    z.object({
      category: z.enum([
        "skill",
        "responsibility",
        "qualification",
        "competency",
      ]),
      importance: z.enum(["required", "preferred", "inferred"]),
      content: z.string().trim().min(1),
      sourceQuote: z.string().trim().min(1),
    }),
  ),
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["requirements"],
  properties: {
    requirements: {
      type: "array",
      description: "Between 5 and 12 requirements, most important first.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "importance", "content", "sourceQuote"],
        properties: {
          category: {
            type: "string",
            enum: ["skill", "responsibility", "qualification", "competency"],
          },
          importance: {
            type: "string",
            enum: ["required", "preferred", "inferred"],
            description:
              "required if the posting states it as a must, preferred if it is a nice-to-have, inferred only if the role plainly implies it without saying so.",
          },
          content: {
            type: "string",
            description:
              "The requirement in one short phrase a candidate could match evidence against.",
          },
          sourceQuote: {
            type: "string",
            description:
              "The exact sentence or clause from the posting, copied character for character.",
          },
        },
      },
    },
  },
} as const;

const INSTRUCTIONS = [
  "You read a job posting and list what the role actually asks for, so a candidate can check their experience against it.",
  "",
  "Rules:",
  "- Every requirement must come from the posting. sourceQuote is copied character for character; do not paraphrase it or join separate lines.",
  "- Mark importance honestly. 'required' only when the posting states it as a must. Use 'inferred' sparingly, for things the role plainly needs but never says.",
  "- Write content as something evidence can be matched against: a skill, a responsibility, a qualification, or a competency. Not a sentence of marketing.",
  "- Ignore benefits, salary, equal-opportunity statements, company history, and application instructions.",
  "- Do not invent a seniority level, a years-of-experience figure, or a technology the posting never names.",
  "- Between 5 and 12 requirements. If the posting is thin, return fewer rather than padding it.",
  "",
  "A requirement whose quote is not found in the posting is discarded before the candidate sees it.",
].join("\n");

const MAX_DESCRIPTION_CHARACTERS = 16_000;

export interface RequirementExtractionResult {
  requirements: z.infer<typeof jobRequirementSchema>[];
  droppedCount: number;
}

export async function extractRequirementsFromPosting(
  jobDescription: string,
): Promise<RequirementExtractionResult> {
  const posting = jobDescription.slice(0, MAX_DESCRIPTION_CHARACTERS);

  const response = await openai().chat.completions.create({
    model: INTERVIEW_MODEL,
    temperature: 0.1,
    messages: [
      { role: "system", content: INSTRUCTIONS },
      { role: "user", content: `Job posting:\n\n${posting}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "job_requirements",
        strict: true,
        schema: jsonSchema,
      },
    },
  });

  let parsed;
  try {
    parsed = draftSchema.parse(
      JSON.parse(response.choices[0]?.message?.content ?? ""),
    );
  } catch (error) {
    throw new RequirementExtractionError(
      `The extractor returned something unusable: ${
        error instanceof Error ? error.message.slice(0, 200) : "unparseable"
      }`,
    );
  }

  const grounded = parsed.requirements.filter((requirement) =>
    quoteAppearsIn(requirement.sourceQuote, posting),
  );
  const droppedCount = parsed.requirements.length - grounded.length;

  if (!grounded.length)
    throw new RequirementExtractionError(
      "Nothing in this posting could be matched back to its text. Paste the description itself rather than a link or a summary.",
    );

  return {
    requirements: grounded.slice(0, 12).map((requirement, index) =>
      jobRequirementSchema.parse({
        id: `requirement-${index + 1}`,
        category: requirement.category,
        importance: requirement.importance,
        content: requirement.content,
        confirmed: false,
        matchStrength: "none",
        supportingClaimIds: [],
      }),
    ),
    droppedCount,
  };
}
