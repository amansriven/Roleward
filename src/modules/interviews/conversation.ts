import "server-only";

import { z } from "zod";
import { INTERVIEW_MODEL, openai } from "./openai";
import { INTERVIEW_PLANS, TURN_BUDGETS } from "./plan";
import {
  COMPETENCIES,
  competencySchema,
  interviewReportSchema,
  type InterviewSession,
  type InterviewReport,
} from "./schema";

const MAX_ANSWER_CHARS = 6000;

export function truncateAnswer(answer: string) {
  return answer.slice(0, MAX_ANSWER_CHARS);
}

const turnResultSchema = z.object({
  message: z.string().min(1),
  competency: competencySchema.nullable(),
  shouldConclude: z.boolean(),
});
export type TurnResult = z.infer<typeof turnResultSchema>;

const turnJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["message", "competency", "shouldConclude"],
  properties: {
    message: {
      type: "string",
      description: "What the interviewer says next. One question at a time.",
    },
    competency: {
      type: ["string", "null"],
      enum: [...COMPETENCIES, null],
      description: "Behavioral competency this question targets, or null.",
    },
    shouldConclude: {
      type: "boolean",
      description: "True when this message closes the interview.",
    },
  },
} as const;

function transcript(session: InterviewSession) {
  return session.turns.map((turn) => ({
    role:
      turn.role === "interviewer" ? ("assistant" as const) : ("user" as const),
    content: turn.content,
  }));
}

export async function nextInterviewerTurn(
  session: InterviewSession,
  instructions: string,
): Promise<TurnResult> {
  const answered = session.turns.filter(
    (turn) => turn.role === "candidate",
  ).length;
  const budget = TURN_BUDGETS[session.config.length];
  const remaining = budget - answered;
  const nudge =
    remaining <= 0
      ? "The interview has reached its length. Thank the candidate and close now, setting shouldConclude to true."
      : `About ${remaining} candidate answers remain.`;

  const response = await openai().chat.completions.create({
    model: INTERVIEW_MODEL,
    temperature: 0.7,
    messages: [
      { role: "system", content: `${instructions}\n\n${nudge}` },
      ...transcript(session),
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "interviewer_turn",
        strict: true,
        schema: turnJsonSchema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content ?? "";
  return turnResultSchema.parse(JSON.parse(raw));
}

const reportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "overallScore",
    "rationale",
    "dimensions",
    "strengths",
    "improvements",
  ],
  properties: {
    overallScore: { type: "integer", minimum: 0, maximum: 100 },
    rationale: {
      type: "string",
      description:
        "Why this score, referring to what the candidate actually said.",
    },
    dimensions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "score", "rationale"],
        properties: {
          key: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 100 },
          rationale: { type: "string" },
        },
      },
    },
    strengths: { type: "array", items: { type: "string" } },
    improvements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "area"],
        properties: {
          title: { type: "string" },
          detail: {
            type: "string",
            description: "Concretely what to do differently, and how.",
          },
          area: {
            type: "string",
            enum: ["resume", "coding", "stories"],
            description: "Which part of Backstage helps them practice this.",
          },
        },
      },
    },
  },
} as const;

const rawReportSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  rationale: z.string().min(1),
  dimensions: z.array(
    z.object({
      key: z.string(),
      score: z.number().int().min(0).max(100),
      rationale: z.string().min(1),
    }),
  ),
  strengths: z.array(z.string().min(1)),
  improvements: z.array(
    z.object({
      title: z.string().min(1),
      detail: z.string().min(1),
      area: z.enum(["resume", "coding", "stories"]),
    }),
  ),
});

const AREA_ACTIONS = {
  resume: {
    actionLabel: "Open Resume Kitchen",
    href: "/dashboard/resume-kitchen",
  },
  coding: {
    actionLabel: "Practice a coding interview",
    href: "/dashboard/stage-fright/new?type=coding",
  },
  stories: {
    actionLabel: "Rehearse this again",
    href: "/dashboard/stage-fright/new?type=behavioral",
  },
} as const;

export async function scoreInterview(
  session: InterviewSession,
  instructions: string,
): Promise<InterviewReport> {
  const plan = INTERVIEW_PLANS[session.config.type];
  const dimensionGuide = plan.dimensions
    .map((item) => `- ${item.key}: ${item.label} — ${item.description}`)
    .join("\n");

  const response = await openai().chat.completions.create({
    model: INTERVIEW_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: [
          instructions,
          "The interview is over. Score it honestly and specifically, as a hiring manager writing feedback the candidate will read.",
          `Score each of these dimensions, using exactly these keys:\n${dimensionGuide}`,
          "Quote or paraphrase what they actually said. Do not invent details. If the interview was too short to judge a dimension, score it low and say why. Every improvement must be concrete and actionable.",
        ].join("\n\n"),
      },
      ...transcript(session),
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "interview_report",
        strict: true,
        schema: reportJsonSchema,
      },
    },
  });

  const raw = rawReportSchema.parse(
    JSON.parse(response.choices[0]?.message?.content ?? ""),
  );
  const labels = new Map(plan.dimensions.map((item) => [item.key, item.label]));
  const competenciesCovered = [
    ...new Set(
      session.turns.flatMap((turn) =>
        turn.competency ? [turn.competency] : [],
      ),
    ),
  ];

  return interviewReportSchema.parse({
    overallScore: raw.overallScore,
    rationale: raw.rationale,
    dimensions: raw.dimensions.map((item) => ({
      key: item.key,
      label: labels.get(item.key) ?? item.key,
      score: item.score,
      rationale: item.rationale,
    })),
    strengths: raw.strengths,
    improvements: raw.improvements.map((item) => ({
      title: item.title,
      detail: item.detail,
      ...AREA_ACTIONS[item.area],
    })),
    competenciesCovered,
    // The archetype is the topic. With a static list this was guesswork, so it
    // was left empty; a pool problem knows what it is testing.
    topicsCovered: session.codingProblem ? [session.codingProblem.topic] : [],
  });
}
