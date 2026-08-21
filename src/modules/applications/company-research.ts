import { z } from "zod";

export const companyResearchSchema = z.object({
  companySummary: z.string().trim().min(1),
  whatTheyValue: z.array(z.string().trim().min(1)).max(6),
  recentEvents: z
    .array(
      z.object({
        headline: z.string().trim().min(1),
        date: z.string().trim().min(1),
        summary: z.string().trim().min(1),
        whyItMatters: z.string().trim().min(1),
        sourceTitle: z.string().trim().min(1),
        sourceUrl: z.url(),
      }),
    )
    .max(5),
  interviewAngles: z
    .array(
      z.object({
        topic: z.string().trim().min(1),
        why: z.string().trim().min(1),
        question: z.string().trim().min(1),
      }),
    )
    .max(5),
  questionsToAsk: z.array(z.string().trim().min(1)).max(6),
  sources: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        url: z.url(),
      }),
    )
    .max(10),
});

export type CompanyResearch = z.infer<typeof companyResearchSchema>;

export const companyResearchJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "companySummary",
    "whatTheyValue",
    "recentEvents",
    "interviewAngles",
    "questionsToAsk",
    "sources",
  ],
  properties: {
    companySummary: { type: "string" },
    whatTheyValue: {
      type: "array",
      items: { type: "string" },
    },
    recentEvents: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "headline",
          "date",
          "summary",
          "whyItMatters",
          "sourceTitle",
          "sourceUrl",
        ],
        properties: {
          headline: { type: "string" },
          date: { type: "string" },
          summary: { type: "string" },
          whyItMatters: { type: "string" },
          sourceTitle: { type: "string" },
          sourceUrl: { type: "string" },
        },
      },
    },
    interviewAngles: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "why", "question"],
        properties: {
          topic: { type: "string" },
          why: { type: "string" },
          question: { type: "string" },
        },
      },
    },
    questionsToAsk: {
      type: "array",
      items: { type: "string" },
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url"],
        properties: {
          title: { type: "string" },
          url: { type: "string" },
        },
      },
    },
  },
} as const;
