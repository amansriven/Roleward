import { describe, expect, it } from "vitest";
import { buildMoxieContext } from "./context";
import { emptyWorkspace } from "@/modules/workspace/repository";

describe("Moxie context broker", () => {
  it("builds a bounded cross-product context", () => {
    const context = JSON.parse(
      buildMoxieContext({
        workspace: emptyWorkspace,
        pathname: "/dashboard/zed",
        attempts: [],
      }),
    );
    expect(context.currentPage).toBe("/dashboard/zed");
    expect(context.activeApplication).toBeNull();
    expect(context.evidenceSummary).toEqual({ entries: 0, confirmedClaims: 0 });
    expect(context.zed).toEqual([]);
  });

  it("carries transcript excerpts and approved memory into the payload", () => {
    const context = JSON.parse(
      buildMoxieContext({
        workspace: emptyWorkspace,
        pathname: "/dashboard/moxie",
        attempts: [],
        memories: [
          {
            id: "m1",
            category: "preference",
            statement: "Prefers backend work",
            createdAt: "2026-01-01T00:00:00.000Z",
            approvedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "m2",
            category: "target",
            statement: "Withdrawn",
            createdAt: "2026-01-01T00:00:00.000Z",
            approvedAt: "2026-01-01T00:00:00.000Z",
            deletedAt: "2026-02-01T00:00:00.000Z",
          },
        ],
        transcripts: [
          {
            interviewId: "s1",
            roleLabel: "Backend intern",
            type: "behavioral",
            modality: "voice",
            completedAt: "2026-01-01T00:00:00.000Z",
            overallScore: 62,
            weakestDimensions: [{ label: "Pace", score: 40 }],
            answers: [
              {
                turnId: "t2",
                competency: null,
                question: "Tell me about a hard bug.",
                answer: "I traced a race condition.",
                words: 5,
                wordsPerMinute: 120,
              },
            ],
          },
        ],
      }),
    );
    // Withdrawn memories must not reach the model.
    expect(context.memory).toEqual([
      { category: "preference", statements: ["Prefers backend work"] },
    ]);
    expect(context.interviewTranscripts[0].answers[0].wordsPerMinute).toBe(120);
    expect(context.interviewTranscripts[0].weakestDimensions).toEqual([
      { label: "Pace", score: 40 },
    ]);
  });
});
