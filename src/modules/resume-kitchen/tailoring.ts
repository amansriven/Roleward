import "server-only";

import { z } from "zod";
import { INTERVIEW_MODEL, openai } from "@/modules/interviews/openai";
import { bulletIsSupported } from "./grounding";

/**
 * Rewrites a résumé bullet to answer a specific requirement, using only what
 * the candidate has already confirmed.
 *
 * This is the feature the page has been depicting since it was a mockup, and
 * the one with the most obvious way to go wrong: the helpful thing for a model
 * to do is add a number. A bullet that says 40% when the evidence says 22% is
 * not a better résumé, it is a question the candidate cannot answer in the
 * interview it wins them.
 *
 * So a suggestion must name the claims it drew on, and may not contain a
 * quantity those claims do not. Anything else is discarded — never softened,
 * never shown with a warning, because a warning next to a plausible sentence
 * is not a control.
 */

export class TailoringError extends Error {}

export interface SupportingClaim {
  id: string;
  content: string;
  /** Where it came from, so the suggestion can stay truthful about context. */
  itemTitle: string;
}

const draftSchema = z.object({
  suggestions: z.array(
    z.object({
      bullet: z.string().trim().min(10),
      usedClaimIds: z.array(z.string()),
      rationale: z.string().trim().min(1),
    }),
  ),
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      description: "One or two suggestions. Prefer one good one.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["bullet", "usedClaimIds", "rationale"],
        properties: {
          bullet: {
            type: "string",
            description:
              "One résumé bullet. Starts with a past-tense verb. No first person, no period at the end.",
          },
          usedClaimIds: {
            type: "array",
            description:
              "The ids of every confirmed claim this bullet draws on.",
            items: { type: "string" },
          },
          rationale: {
            type: "string",
            description:
              "One sentence on why this answers the requirement, addressed to the candidate.",
          },
        },
      },
    },
  },
} as const;

function instructions(requirement: string, claims: SupportingClaim[]) {
  return [
    "You rewrite a résumé bullet so it speaks to one specific requirement of a job the candidate is applying to.",
    "",
    `The requirement: ${requirement}`,
    "",
    "The candidate's confirmed experience. This is the only material you may use:",
    ...claims.map(
      (claim) => `- [${claim.id}] (${claim.itemTitle}) ${claim.content}`,
    ),
    "",
    "Rules:",
    "- Use ONLY the claims above. Do not add a technology, a scale, a team size, a duration, or an outcome that is not in them.",
    "- NEVER introduce a number that is not already in the claims you used. Not a rounded one, not an estimated one, not a converted one.",
    "- Do not upgrade the candidate's role. 'Helped build' does not become 'Led'. 'Contributed to' does not become 'Owned'.",
    "- If the confirmed claims genuinely do not speak to this requirement, return an empty suggestions array. That is a useful answer; a stretched bullet is not.",
    "- List every claim id you drew on in usedClaimIds.",
    "- Keep the bullet to one line, roughly 15 to 30 words, starting with a past-tense verb.",
    "",
    "A bullet containing a quantity that is not in the claims it cites is discarded before the candidate sees it, so inventing one wastes the suggestion.",
  ].join("\n");
}

export interface TailoredSuggestion {
  bullet: string;
  usedClaimIds: string[];
  rationale: string;
}

export interface TailoringResult {
  suggestions: TailoredSuggestion[];
  /** Suggestions thrown away for asserting something the evidence did not. */
  rejected: { bullet: string; inventedNumbers: string[] }[];
}

export async function tailorBullet(
  requirement: string,
  claims: SupportingClaim[],
): Promise<TailoringResult> {
  if (!claims.length) return { suggestions: [], rejected: [] };

  const response = await openai().chat.completions.create({
    model: INTERVIEW_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: instructions(requirement, claims) },
      {
        role: "user",
        content: `Write the bullet for: ${requirement}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "tailored_bullets",
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
    throw new TailoringError(
      `The tailor returned something unusable: ${
        error instanceof Error ? error.message.slice(0, 200) : "unparseable"
      }`,
    );
  }

  const byId = new Map(claims.map((claim) => [claim.id, claim]));
  const suggestions: TailoredSuggestion[] = [];
  const rejected: TailoringResult["rejected"] = [];

  for (const suggestion of parsed.suggestions.slice(0, 2)) {
    // Only claims that exist count as support. A bullet citing an id we never
    // sent is checked against nothing, which is how an invented number slips by.
    const used = suggestion.usedClaimIds
      .map((id) => byId.get(id))
      .filter((claim): claim is SupportingClaim => Boolean(claim));
    const support = used.map((claim) => claim.content);
    const check = bulletIsSupported(suggestion.bullet, support);
    if (!used.length || !check.ok) {
      rejected.push({
        bullet: suggestion.bullet,
        inventedNumbers: check.inventedNumbers,
      });
      continue;
    }
    suggestions.push({
      bullet: suggestion.bullet,
      usedClaimIds: used.map((claim) => claim.id),
      rationale: suggestion.rationale,
    });
  }

  if (rejected.length)
    console.warn("resume tailoring: unsupported bullets discarded", {
      rejected: rejected.length,
    });

  return { suggestions, rejected };
}

/**
 * Strengthens a bullet without a job in mind.
 *
 * The rewrite is allowed to change verbs, structure, and emphasis. It is not
 * allowed to add a quantity, because the most tempting improvement to a bullet
 * with no number in it is to supply one — and that is the single thing a
 * candidate cannot defend when asked about it.
 *
 * Where a figure is genuinely missing, the model returns the question that
 * would produce it instead. A prompt the candidate can answer from memory is
 * more use than a number invented for them.
 */
const improveSchema = z.object({
  improved: z.string().trim(),
  changed: z.string().trim(),
  askFor: z.string().trim(),
});

const improveJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["improved", "changed", "askFor"],
  properties: {
    improved: {
      type: "string",
      description:
        "The stronger bullet, using only facts already present. Empty string if it cannot be improved without inventing something.",
    },
    changed: {
      type: "string",
      description: "One short sentence on what you changed and why.",
    },
    askFor: {
      type: "string",
      description:
        "If a number would transform this bullet, the question the candidate should answer to supply it. Empty string otherwise.",
    },
  },
} as const;

const IMPROVE_INSTRUCTIONS = [
  "You strengthen a single résumé bullet.",
  "",
  "Rules:",
  "- NEVER add a number, percentage, duration, team size, or scale that is not already in the original. This is absolute.",
  "- Do not upgrade the candidate's role. 'Helped build' may become 'Built' ONLY if the original does not attribute the work to someone else.",
  "- Replace weak openers ('helped with', 'worked on', 'responsible for') with what was actually done.",
  "- Replace vague quantities ('various', 'several') only if the original says how many. Otherwise leave the vagueness and ask about it.",
  "- Keep it to one line, roughly 12 to 30 words, starting with a past-tense verb, no trailing period.",
  "- If the bullet is already strong, return it unchanged and say so.",
  "- If a missing number is the main weakness, put the question that would supply it in askFor. Do not guess the answer.",
].join("\n");

export interface ImprovedBullet {
  improved: string;
  changed: string;
  askFor: string;
  /** True when a rewrite was discarded for inventing a figure. */
  rejected: boolean;
}

export async function improveBullet(
  original: string,
  context: string,
): Promise<ImprovedBullet> {
  const response = await openai().chat.completions.create({
    model: INTERVIEW_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: IMPROVE_INSTRUCTIONS },
      {
        role: "user",
        content: `From "${context}":\n\n${original}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "improved_bullet",
        strict: true,
        schema: improveJsonSchema,
      },
    },
  });

  let parsed;
  try {
    parsed = improveSchema.parse(
      JSON.parse(response.choices[0]?.message?.content ?? ""),
    );
  } catch (error) {
    throw new TailoringError(
      `The rewriter returned something unusable: ${
        error instanceof Error ? error.message.slice(0, 200) : "unparseable"
      }`,
    );
  }

  // The original is the only evidence a rewrite of it has.
  const check = bulletIsSupported(parsed.improved, [original]);
  if (parsed.improved && !check.ok)
    return { improved: "", changed: "", askFor: parsed.askFor, rejected: true };

  return { ...parsed, rejected: false };
}
