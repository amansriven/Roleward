import { z } from "zod";
import { moxieMemoryCategories } from "./memory";

/**
 * The structured contract Moxie answers with. Blocks arrive as typed data
 * rather than markers embedded in prose, so rendering no longer depends on the
 * model formatting brackets and fences correctly.
 *
 * The wire shape is deliberately flat — one object with a `type` discriminator
 * and every other field nullable — because OpenAI strict schemas require every
 * property to be present. `normalizeMoxiePayload` narrows it into the tagged
 * union the renderer actually uses.
 */

const blockTypes = [
  "paragraph",
  "heading",
  "list",
  "code",
  "plan",
  "coach",
  "table",
  "draft",
] as const;

const nullableString = z.string().nullable().default(null);

const wireItemSchema = z.object({
  text: z.string(),
  citations: z.array(z.string()).default([]),
});

const wireStepSchema = z.object({
  text: z.string(),
  date: nullableString,
});

const wireBlockSchema = z.object({
  type: z.enum(blockTypes),
  text: nullableString,
  citations: z.array(z.string()).default([]),
  ordered: z.boolean().nullable().default(null),
  items: z.array(wireItemSchema).nullable().default(null),
  language: nullableString,
  code: nullableString,
  title: nullableString,
  steps: z.array(wireStepSchema).nullable().default(null),
  observation: nullableString,
  evidence: nullableString,
  drill: nullableString,
  headers: z.array(z.string()).nullable().default(null),
  rows: z
    .array(z.object({ cells: z.array(z.string()) }))
    .nullable()
    .default(null),
  label: nullableString,
  target: nullableString,
  bulletId: nullableString,
});

const wireProposalSchema = z.object({
  kind: z.enum(["memory", "goal"]),
  statement: z.string(),
  category: z.enum(moxieMemoryCategories).nullable().default(null),
  targetDate: nullableString,
});

export const moxiePayloadSchema = z.object({
  blocks: z.array(wireBlockSchema).max(40),
  proposals: z.array(wireProposalSchema).max(4).default([]),
});
export type MoxieWirePayload = z.infer<typeof moxiePayloadSchema>;
export type MoxieWireBlock = z.infer<typeof wireBlockSchema>;

/** Marks a stored message as contract JSON rather than legacy markdown. */
export const moxiePayloadMarker = '{"blocks"';

export function isMoxiePayload(content: string) {
  return content.trimStart().startsWith(moxiePayloadMarker);
}

/** Parses a stored message, returning null for legacy markdown content. */
export function parseMoxiePayload(content: string): MoxieWirePayload | null {
  if (!isMoxiePayload(content)) return null;
  try {
    const parsed = moxiePayloadSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Flattens a payload back to prose. Conversation history is replayed to the
 * model in this form so the prompt stays readable, and it is the fallback for
 * anywhere a plain string is needed.
 */
export function moxiePlainText(payload: MoxieWirePayload): string {
  const parts: string[] = [];
  for (const block of payload.blocks) {
    switch (block.type) {
      case "heading":
        parts.push(`## ${block.text ?? ""}`);
        break;
      case "list":
        parts.push(
          (block.items ?? [])
            .map((item, index) =>
              block.ordered ? `${index + 1}. ${item.text}` : `- ${item.text}`,
            )
            .join("\n"),
        );
        break;
      case "code":
        parts.push(
          `\`\`\`${block.language ?? ""}\n${block.code ?? ""}\n\`\`\``,
        );
        break;
      case "plan":
        parts.push(
          [
            block.title ? `Plan: ${block.title}` : "Plan:",
            ...(block.steps ?? []).map(
              (step) => `- ${step.date ? `${step.date} | ` : ""}${step.text}`,
            ),
          ].join("\n"),
        );
        break;
      case "coach":
        parts.push(
          [
            `Observation: ${block.observation ?? ""}`,
            block.evidence ? `Evidence: ${block.evidence}` : "",
            block.drill ? `Drill: ${block.drill}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        );
        break;
      case "table":
        parts.push(
          [
            (block.headers ?? []).join(" | "),
            ...(block.rows ?? []).map((row) => row.cells.join(" | ")),
          ].join("\n"),
        );
        break;
      case "draft":
        parts.push(`${block.label ?? "Draft"}: ${block.text ?? ""}`);
        break;
      default:
        parts.push(block.text ?? "");
    }
  }
  return parts.filter((part) => part.trim()).join("\n\n");
}

/** JSON Schema handed to the model. Mirrors the zod shape above. */
export const moxieResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["blocks", "proposals"],
  properties: {
    blocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "type",
          "text",
          "citations",
          "ordered",
          "items",
          "language",
          "code",
          "title",
          "steps",
          "observation",
          "evidence",
          "drill",
          "headers",
          "rows",
          "label",
          "target",
          "bulletId",
        ],
        properties: {
          type: { type: "string", enum: blockTypes },
          text: {
            type: ["string", "null"],
            description: "Body for paragraph, heading, and draft blocks.",
          },
          citations: {
            type: "array",
            items: { type: "string" },
            description:
              "Workspace sources this block rests on, e.g. 'Active application', 'Evidence · Ledger rewrite', 'Zed', 'Stage Fright', 'Active resume'.",
          },
          ordered: { type: ["boolean", "null"] },
          items: {
            type: ["array", "null"],
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "citations"],
              properties: {
                text: { type: "string" },
                citations: { type: "array", items: { type: "string" } },
              },
            },
          },
          language: { type: ["string", "null"] },
          code: { type: ["string", "null"] },
          title: { type: ["string", "null"] },
          steps: {
            type: ["array", "null"],
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "date"],
              properties: {
                text: { type: "string" },
                date: {
                  type: ["string", "null"],
                  description: "YYYY-MM-DD, or null when undated.",
                },
              },
            },
          },
          observation: {
            type: ["string", "null"],
            description: "Coach blocks: your interpretation.",
          },
          evidence: {
            type: ["string", "null"],
            description: "Coach blocks: the measurement behind the reading.",
          },
          drill: {
            type: ["string", "null"],
            description: "Coach blocks: the next rep to run.",
          },
          headers: { type: ["array", "null"], items: { type: "string" } },
          rows: {
            type: ["array", "null"],
            items: {
              type: "object",
              additionalProperties: false,
              required: ["cells"],
              properties: {
                cells: { type: "array", items: { type: "string" } },
              },
            },
          },
          label: {
            type: ["string", "null"],
            description:
              "Draft blocks: what the draft is, e.g. 'Resume bullet'.",
          },
          target: {
            type: ["string", "null"],
            description: "Draft blocks: where it would go.",
          },
          bulletId: {
            type: ["string", "null"],
            description:
              "Draft blocks: id of the resume bullet this rewrites, from the context. Null unless rewriting an existing bullet.",
          },
        },
      },
    },
    proposals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "statement", "category", "targetDate"],
        properties: {
          kind: { type: "string", enum: ["memory", "goal"] },
          statement: { type: "string" },
          category: {
            type: ["string", "null"],
            enum: [...moxieMemoryCategories, null],
            description: "Memory proposals only.",
          },
          targetDate: {
            type: ["string", "null"],
            description: "Goal proposals only: YYYY-MM-DD.",
          },
        },
      },
    },
  },
} as const;

/** A stored message as prose, whether it is contract JSON or legacy markdown. */
export function moxieHistoryText(content: string) {
  const payload = parseMoxiePayload(content);
  return payload ? moxiePlainText(payload) : content;
}
