import "server-only";

import { INTERVIEW_MODEL, openai } from "@/modules/interviews/openai";
import {
  applyTailoredResume,
  tailoredDraftSchema,
  type TailorableResume,
  type TailoredResume,
} from "./tailor-resume-merge";

/**
 * Rewrites a whole resume for one role in a single pass.
 *
 * The per-requirement tailor writes one bullet at a time, which is the right
 * shape for filling a specific gap and the wrong shape for "make this resume
 * fit this job". Doing it bullet by bullet also loses the only thing a reader
 * of the finished document notices: whether it still looks like the resume the
 * candidate wrote.
 *
 * So the model never gets to decide the shape. It is handed the resume already
 * broken into items and bullets and asked for a replacement string per bullet
 * id; the layout, the entries, their order, and the number of bullets under
 * each one are reassembled here from the original. A bullet the model drops,
 * renames, or invents changes nothing.
 *
 * The grounding rule from `tailoring.ts` still applies, widened by exactly one
 * source: whatever extra detail the candidate typed for this run. That text is
 * theirs, so a number in it is a number they are willing to defend — which is
 * the whole test a figure on a resume has to pass.
 */

export class ResumeTailoringError extends Error {}

export interface TailorTarget {
  companyName: string;
  roleTitle: string;
  jobDescription: string;
  /** Requirement text, from a saved application or a freshly parsed posting. */
  requirements: string[];
}

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "skills", "items"],
  properties: {
    headline: {
      type: "string",
      description:
        "The candidate's headline, rewritten for this role. Empty string to leave it as it was, or if the resume has none.",
    },
    skills: {
      type: "array",
      description:
        "The same skill groups, reordered so what this role asks for reads first. Do not add a skill the candidate never listed.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "skills"],
        properties: {
          category: { type: "string" },
          skills: { type: "array", items: { type: "string" } },
        },
      },
    },
    items: {
      type: "array",
      description:
        "Every entry you were given, by its id, with one replacement per bullet id.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "bullets"],
        properties: {
          id: { type: "string" },
          bullets: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "content"],
              properties: {
                id: {
                  type: "string",
                  description: "The bullet id exactly as it was given to you.",
                },
                content: {
                  type: "string",
                  description:
                    "The rewritten bullet, or the original unchanged if it is already right for this role.",
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

function resumeForPrompt(resume: TailorableResume) {
  const lines: string[] = [];
  if (resume.headline) lines.push(`Headline: ${resume.headline}`);
  for (const group of resume.skills)
    lines.push(`Skills — ${group.category}: ${group.skills.join(", ")}`);
  for (const item of resume.items) {
    lines.push("");
    lines.push(
      `[${item.id}] ${item.title}${
        item.organization ? ` — ${item.organization}` : ""
      }${item.period ? ` (${item.period})` : ""}`,
    );
    for (const bullet of item.bullets)
      lines.push(`  [${bullet.id}] ${bullet.content}`);
  }
  return lines.join("\n");
}

function instructions(
  resume: TailorableResume,
  target: TailorTarget,
  extraContext: string,
) {
  return [
    "You rewrite an entire resume so it reads as though it was written for one specific job, without changing what the candidate actually did.",
    "",
    `The role: ${target.roleTitle || "Unspecified role"}${
      target.companyName ? ` at ${target.companyName}` : ""
    }`,
    "",
    "What the posting asks for:",
    ...(target.requirements.length
      ? target.requirements.map((requirement) => `- ${requirement}`)
      : ["- (none listed; read the description below)"]),
    "",
    "The job description:",
    target.jobDescription.slice(0, 12_000),
    "",
    "The resume, as ids you must reuse exactly:",
    resumeForPrompt(resume),
    "",
    ...(extraContext
      ? [
          "Extra detail the candidate supplied for this application. Treat it as true, and as the only new material you may draw on:",
          extraContext,
          "",
        ]
      : []),
    "Rules:",
    "- Return every item id and every bullet id you were given, once each, in the order given. Do not merge, split, drop, or add bullets.",
    "- NEVER introduce a number, percentage, duration, team size, or scale that is not in that bullet already or in the extra detail above. A rewrite containing one is discarded and the original bullet is used instead, so it wastes the rewrite.",
    "- Do not upgrade the candidate's role. 'Contributed to' does not become 'Led'.",
    "- Do not claim a technology the bullet or the extra detail does not mention, even if the posting asks for it.",
    "- Reframe rather than invent: lead with the part of the work this role cares about, use the posting's own vocabulary where it genuinely describes what happened, and cut filler.",
    "- If a bullet is already right for this role, return it unchanged. An unnecessary rewrite is worse than none.",
    "- Keep each bullet to one line, roughly 12 to 32 words, starting with a past-tense verb, no trailing period.",
    "- Reorder skills within their groups so the ones this role names come first. Do not add skills the candidate never listed and the extra detail never mentions.",
  ].join("\n");
}

export async function tailorResume(
  resume: TailorableResume,
  target: TailorTarget,
  extraContext: string,
): Promise<TailoredResume> {
  const bullets = resume.items.reduce(
    (count, item) => count + item.bullets.length,
    0,
  );
  if (!bullets)
    return {
      resume,
      changes: [],
      rejected: [],
      droppedSkills: [],
    };

  const response = await openai().chat.completions.create({
    model: INTERVIEW_MODEL,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: instructions(resume, target, extraContext),
      },
      {
        role: "user",
        content: `Rewrite all ${bullets} bullets for this role, reusing every id exactly.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "tailored_resume",
        strict: true,
        schema: jsonSchema,
      },
    },
  });

  let parsed;
  try {
    parsed = tailoredDraftSchema.parse(
      JSON.parse(response.choices[0]?.message?.content ?? ""),
    );
  } catch (error) {
    throw new ResumeTailoringError(
      `The tailor returned something unusable: ${
        error instanceof Error ? error.message.slice(0, 200) : "unparseable"
      }`,
    );
  }

  const result = applyTailoredResume(resume, parsed, extraContext);
  if (result.rejected.length)
    console.warn("resume tailoring: unsupported rewrites discarded", {
      rejected: result.rejected.length,
      changed: result.changes.length,
    });
  return result;
}
