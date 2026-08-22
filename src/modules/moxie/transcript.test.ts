import { describe, expect, it } from "vitest";
import type { InterviewSession } from "@/modules/interviews/schema";
import {
  buildMoxieTranscripts,
  excerptInterview,
  selectCoachableAnswers,
} from "./transcript";

const at = (seconds: number) =>
  new Date(Date.UTC(2026, 0, 1, 0, 0, seconds)).toISOString();

const turn = (
  id: string,
  role: "interviewer" | "candidate",
  content: string,
  seconds: number,
) => ({ id, role, content, competency: null, createdAt: at(seconds) });

const session = (over: Partial<InterviewSession> = {}) =>
  ({
    id: "s1",
    config: { type: "behavioral", modality: "voice" },
    status: "complete",
    roleLabel: "Backend intern",
    roleDescription: "",
    codingProblem: null,
    codingRuns: [],
    turns: [],
    report: null,
    createdAt: at(0),
    completedAt: at(600),
    ...over,
  }) as unknown as InterviewSession;

describe("Moxie transcript excerpts", () => {
  it("pairs each answer with the question that prompted it", () => {
    const answers = selectCoachableAnswers(
      session({
        turns: [
          turn("t1", "interviewer", "Tell me about a hard bug.", 0),
          turn(
            "t2",
            "candidate",
            "I traced a race condition through the ledger service over two days.",
            10,
          ),
          turn("t3", "interviewer", "What did you learn?", 40),
        ],
      }),
    );
    expect(answers).toHaveLength(1);
    expect(answers[0]?.question).toBe("Tell me about a hard bug.");
    expect(answers[0]?.words).toBe(12);
  });

  it("measures pace across the answer window", () => {
    const answers = selectCoachableAnswers(
      session({
        turns: [
          turn("t1", "interviewer", "Question?", 0),
          // 12 words over 60 seconds reads as 12 wpm.
          turn(
            "t2",
            "candidate",
            "one two three four five six seven eight nine ten eleven twelve",
            10,
          ),
          turn("t3", "interviewer", "Next.", 70),
        ],
      }),
    );
    expect(answers[0]?.wordsPerMinute).toBe(12);
  });

  it("declines to measure when the window is missing or implausible", () => {
    const trailing = selectCoachableAnswers(
      session({
        turns: [
          turn("t1", "interviewer", "Question?", 0),
          turn(
            "t2",
            "candidate",
            "one two three four five six seven eight",
            10,
          ),
        ],
      }),
    );
    expect(trailing[0]?.wordsPerMinute).toBeNull();

    const tooFast = selectCoachableAnswers(
      session({
        turns: [
          turn("t1", "interviewer", "Question?", 0),
          turn(
            "t2",
            "candidate",
            "one two three four five six seven eight",
            10,
          ),
          turn("t3", "interviewer", "Next.", 12),
        ],
      }),
    );
    expect(tooFast[0]?.wordsPerMinute).toBeNull();
  });

  it("skips acknowledgements and keeps the longest answers", () => {
    const answers = selectCoachableAnswers(
      session({
        turns: [
          turn("t1", "interviewer", "Ready?", 0),
          turn("t2", "candidate", "Yes absolutely", 5),
          turn("t3", "interviewer", "Go on.", 10),
          turn(
            "t4",
            "candidate",
            "one two three four five six seven eight nine ten",
            15,
          ),
        ],
      }),
      5,
    );
    expect(answers.map((item) => item.turnId)).toEqual(["t4"]);
  });

  it("surfaces the weakest report dimensions first", () => {
    const excerpt = excerptInterview(
      session({
        report: {
          overallScore: 62,
          rationale: "x",
          dimensions: [
            { key: "a", label: "Structure", score: 80, rationale: "x" },
            { key: "b", label: "Pace", score: 40, rationale: "x" },
            { key: "c", label: "Depth", score: 55, rationale: "x" },
          ],
          strengths: [],
          improvements: [],
          competenciesCovered: [],
          topicsCovered: [],
        },
      } as unknown as Partial<InterviewSession>),
    );
    expect(excerpt.weakestDimensions.map((item) => item.label)).toEqual([
      "Pace",
      "Depth",
      "Structure",
    ]);
    expect(excerpt.overallScore).toBe(62);
  });

  it("takes the newest sessions and ignores empty ones", () => {
    const excerpts = buildMoxieTranscripts([
      session({
        id: "old",
        completedAt: at(100),
        turns: [
          turn("a", "candidate", "one two three four five six seven eight", 0),
        ],
      }),
      session({
        id: "new",
        completedAt: at(900),
        turns: [
          turn("b", "candidate", "one two three four five six seven eight", 0),
        ],
      }),
      session({ id: "empty", turns: [] }),
    ]);
    expect(excerpts.map((item) => item.interviewId)).toEqual(["new", "old"]);
  });
});
