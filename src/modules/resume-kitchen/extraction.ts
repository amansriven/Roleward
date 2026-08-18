import "server-only";

import { z } from "zod";
import { INTERVIEW_MODEL, openai } from "@/modules/interviews/openai";
import { groundItems, type DraftItem } from "./grounding";

/**
 * Reads a resume and proposes evidence the candidate can confirm.
 *
 * The model is asked for a verbatim quote behind every claim, and the quote is
 * then checked against the document. That is not a formality — it is the only
 * thing standing between a candidate and a confirmed metric they never earned.
 * A claim whose quote does not check out is discarded, not softened.
 */

export class ExtractionError extends Error {}

const draftSchema = z.object({
  fullName: z.string().trim(),
  headline: z.string().trim(),
  items: z.array(
    z.object({
      type: z.enum([
        "experience",
        "project",
        "education",
        "leadership",
        "other",
      ]),
      title: z.string().trim().min(1),
      organization: z.string().trim().optional(),
      summary: z.string().trim().min(1),
      claims: z.array(
        z.object({
          type: z.enum([
            "action",
            "outcome",
            "metric",
            "technology",
            "responsibility",
          ]),
          content: z.string().trim().min(1),
          sourceQuote: z.string().trim().min(1),
        }),
      ),
    }),
  ),
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fullName", "headline", "items"],
  properties: {
    fullName: {
      type: "string",
      description:
        "The candidate's name exactly as written at the top of the resume. Empty string if there is none.",
    },
    headline: {
      type: "string",
      description:
        "The title or summary line under their name, copied as written. Empty string if there is none.",
    },
    items: {
      type: "array",
      description: "One entry per role, project, or activity on the resume.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "title", "organization", "summary", "claims"],
        properties: {
          type: {
            type: "string",
            enum: ["experience", "project", "education", "leadership", "other"],
          },
          title: { type: "string", description: "Role or project name." },
          organization: {
            type: "string",
            description: "Employer or school. Empty string if none is given.",
          },
          summary: {
            type: "string",
            description: "One neutral sentence describing what this was.",
          },
          claims: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["type", "content", "sourceQuote"],
              properties: {
                type: {
                  type: "string",
                  enum: [
                    "action",
                    "outcome",
                    "metric",
                    "technology",
                    "responsibility",
                  ],
                },
                content: {
                  type: "string",
                  description:
                    "The claim, restated plainly. Never stronger than the source.",
                },
                sourceQuote: {
                  type: "string",
                  description:
                    "The exact sentence from the resume this came from, copied character for character.",
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

const INSTRUCTIONS = [
  "You extract structured evidence from a candidate's resume so they can confirm or correct it.",
  "",
  "This is not a writing task. You are reading, not improving.",
  "",
  "Rules, in order of importance:",
  "- Every claim must come from text that is actually on the resume. Never add an accomplishment, a technology, or a responsibility that is not written there.",
  "- sourceQuote must be copied from the resume character for character. Do not paraphrase it, tidy it, or join two separate lines into one quote.",
  "- NEVER introduce a number that is not in the source quote. Do not estimate, round, scale, or convert. If the resume says 'several users', the claim says 'several users'.",
  "- content must not be stronger than its source. 'Helped build' does not become 'Built'. 'Contributed to' does not become 'Led'.",
  "- If a line is vague, extract it vaguely. The candidate will sharpen it themselves; that is what the confirmation step is for.",
  "- Split each role into its distinct claims rather than one summary claim. One bullet is usually one claim.",
  "- Skip contact details, links, and lists of interests entirely.",
  "- fullName and headline are copied from the top of the resume as written. Do not invent a title the candidate did not give themselves.",
  "",
  "A claim whose quote is not found in the document verbatim is discarded before the candidate ever sees it, so an invented one is wasted output, not a clever addition.",
].join("\n");

export interface ExtractionResult {
  /** As written on the résumé, and only if it is actually written there. */
  fullName: string;
  headline: string;
  items: DraftItem[];
  /** Claims the document did not support, kept for logging rather than display. */
  dropped: { content: string; sourceQuote: string; reason: string }[];
}

/** Long resumes are truncated: the model only needs what it can quote. */
const MAX_DOCUMENT_CHARACTERS = 24_000;

export async function extractEvidence(
  documentText: string,
): Promise<ExtractionResult> {
  const document = documentText.slice(0, MAX_DOCUMENT_CHARACTERS);

  const response = await openai().chat.completions.create({
    model: INTERVIEW_MODEL,
    // Low: this is transcription with structure, not invention.
    temperature: 0.1,
    messages: [
      { role: "system", content: INSTRUCTIONS },
      { role: "user", content: `Resume:\n\n${document}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "resume_evidence",
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
    throw new ExtractionError(
      `The extractor returned something unusable: ${
        error instanceof Error ? error.message.slice(0, 200) : "unparseable"
      }`,
    );
  }

  const items: DraftItem[] = parsed.items.map((item) => ({
    ...item,
    organization: item.organization?.trim() ? item.organization : undefined,
  }));

  const { kept, dropped } = groundItems(items, document);

  // The name and headline are held to the same rule as everything else: if the
  // document does not contain them, we do not have them.
  const fullName =
    parsed.fullName &&
    document.toLowerCase().includes(parsed.fullName.toLowerCase())
      ? parsed.fullName
      : "";
  const headline =
    parsed.headline &&
    document.toLowerCase().includes(parsed.headline.toLowerCase())
      ? parsed.headline
      : "";
  if (dropped.length)
    console.warn("resume extraction: ungrounded claims dropped", {
      dropped: dropped.length,
      reasons: dropped.map((item) => item.reason),
    });

  if (!kept.length)
    throw new ExtractionError(
      "Nothing on this resume could be matched back to its text. Rather than show you claims we cannot support, we stopped.",
    );

  return { fullName, headline, items: kept, dropped };
}
