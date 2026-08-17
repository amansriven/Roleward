import { describe, expect, it } from "vitest";
import { workspaceSnapshotSchema } from "@/modules/workspace/repository";
import { interviewSessionSchema, summarizeSession } from "./schema";

const baseSession = {
  id: "session-1",
  config: {
    type: "behavioral" as const,
    modality: "text" as const,
    intensity: "realistic" as const,
    length: "standard" as const,
    roleTarget: {
      kind: "generic" as const,
      label: "Software Engineering role",
    },
  },
  status: "complete" as const,
  roleLabel: "Software Engineering role",
  roleDescription: "",
  turns: [
    {
      id: "turn-1",
      role: "interviewer" as const,
      content: "Tell me about a conflict.",
      competency: "conflict" as const,
      createdAt: new Date("2026-08-01T00:00:00.000Z").toISOString(),
    },
    {
      id: "turn-2",
      role: "candidate" as const,
      content: "I disagreed with a teammate about the API shape.",
      competency: null,
      createdAt: new Date("2026-08-01T00:01:00.000Z").toISOString(),
    },
  ],
  report: {
    overallScore: 72,
    rationale: "Clear structure, thin on measurable impact.",
    dimensions: [
      {
        key: "structure",
        label: "Structure",
        score: 80,
        rationale: "Situation and action were easy to follow.",
      },
    ],
    strengths: ["Named the disagreement without blaming anyone."],
    improvements: [
      {
        title: "Quantify the outcome",
        detail: "Say what changed after the decision.",
        actionLabel: "Rehearse this again",
        href: "/dashboard/stage-fright/new?type=behavioral",
      },
    ],
    competenciesCovered: ["conflict" as const],
    topicsCovered: [],
  },
  createdAt: new Date("2026-08-01T00:00:00.000Z").toISOString(),
  completedAt: new Date("2026-08-01T00:20:00.000Z").toISOString(),
};

describe("interview session schema", () => {
  it("round-trips a scored session", () => {
    const parsed = interviewSessionSchema.parse(baseSession);
    expect(parsed.report?.overallScore).toBe(72);
    expect(parsed.turns).toHaveLength(2);
  });

  it("summarizes a completed session for the workspace", () => {
    const summary = summarizeSession(interviewSessionSchema.parse(baseSession));
    expect(summary).toMatchObject({
      id: "session-1",
      type: "behavioral",
      overallScore: 72,
      competenciesCovered: ["conflict"],
    });
  });

  it("does not summarize an unfinished session", () => {
    const unfinished = interviewSessionSchema.parse({
      ...baseSession,
      status: "in_progress",
      report: null,
      completedAt: null,
    });
    expect(summarizeSession(unfinished)).toBeNull();
  });
});

describe("workspace backward compatibility", () => {
  it("parses a snapshot written before interviews existed", () => {
    const legacy = {
      profile: null,
      evidence: [],
      applications: [],
      activeApplicationId: null,
    };
    const parsed = workspaceSnapshotSchema.parse(legacy);
    expect(parsed.interviewSummaries).toEqual([]);
  });
});
