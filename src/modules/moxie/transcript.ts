import type {
  InterviewSession,
  InterviewTurn,
} from "@/modules/interviews/schema";
import { speakingPace } from "@/modules/interviews/delivery-metrics";

/**
 * Turns a stored interview into something Moxie can coach from. Whole
 * transcripts are too large for the prompt, so this selects the answers worth
 * discussing and attaches the measurements behind them.
 */

export interface MoxieCoachableAnswer {
  turnId: string;
  competency: string | null;
  /** The interviewer's question, so the answer can be judged against it. */
  question: string;
  answer: string;
  words: number;
  /**
   * Words per minute across the answer window. The window runs from the
   * question to the next interviewer turn, so it includes thinking time and
   * reads slower than pure speaking pace.
   */
  wordsPerMinute: number | null;
  /**
   * Pace excluding pauses, from the audio meter. More honest than
   * `wordsPerMinute`, and present only for spoken answers.
   */
  speakingWordsPerMinute: number | null;
  /** Heard pauses inside the answer, from the audio meter. */
  pauses: { count: number; longestMs: number } | null;
  /** Loudness spread while speaking; low values read as monotone. */
  energyVariation: number | null;
}

export interface MoxieTranscriptExcerpt {
  interviewId: string;
  roleLabel: string;
  type: string;
  modality: string;
  completedAt: string | null;
  overallScore: number | null;
  /** Report dimensions the candidate scored lowest on, worth coaching first. */
  weakestDimensions: { label: string; score: number }[];
  answers: MoxieCoachableAnswer[];
}

const countWords = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean).length;

const clip = (value: string, length: number) =>
  value.length <= length ? value : `${value.slice(0, length)}…`;

function paceFor(
  answer: InterviewTurn,
  next: InterviewTurn | undefined,
  words: number,
) {
  if (!next) return null;
  const seconds =
    (new Date(next.createdAt).getTime() -
      new Date(answer.createdAt).getTime()) /
    1_000;
  // Sub-second and implausibly long windows say more about logging than pace.
  if (!Number.isFinite(seconds) || seconds < 5 || seconds > 900) return null;
  return Math.round((words / seconds) * 60);
}

/** Pairs each candidate answer with the question that prompted it. */
export function selectCoachableAnswers(
  session: InterviewSession,
  limit = 6,
): MoxieCoachableAnswer[] {
  const answers: MoxieCoachableAnswer[] = [];
  session.turns.forEach((turn, index) => {
    if (turn.role !== "candidate") return;
    const words = countWords(turn.content);
    // One-word acknowledgements carry nothing to coach.
    if (words < 8) return;
    const question = [...session.turns.slice(0, index)]
      .reverse()
      .find((item) => item.role === "interviewer");
    answers.push({
      turnId: turn.id,
      competency: turn.competency,
      question: clip(question?.content ?? "", 300),
      answer: clip(turn.content, 700),
      words,
      wordsPerMinute: paceFor(turn, session.turns[index + 1], words),
      speakingWordsPerMinute: turn.delivery
        ? speakingPace(words, turn.delivery)
        : null,
      pauses: turn.delivery
        ? {
            count: turn.delivery.pauseCount,
            longestMs: turn.delivery.longestPauseMs,
          }
        : null,
      energyVariation: turn.delivery?.energyVariation ?? null,
    });
  });
  // The longest answers are where pace and rambling problems show up.
  return answers.sort((a, b) => b.words - a.words).slice(0, limit);
}

export function excerptInterview(
  session: InterviewSession,
  answerLimit = 6,
): MoxieTranscriptExcerpt {
  const weakestDimensions = [...(session.report?.dimensions ?? [])]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((dimension) => ({ label: dimension.label, score: dimension.score }));
  return {
    interviewId: session.id,
    roleLabel: session.roleLabel,
    type: session.config.type,
    modality: session.config.modality,
    completedAt: session.completedAt,
    overallScore: session.report?.overallScore ?? null,
    weakestDimensions,
    answers: selectCoachableAnswers(session, answerLimit),
  };
}

/** The most recent completed interviews, newest first. */
export function buildMoxieTranscripts(
  sessions: InterviewSession[],
  sessionLimit = 2,
): MoxieTranscriptExcerpt[] {
  return [...sessions]
    .filter((session) => session.turns.length > 0)
    .sort((a, b) =>
      (b.completedAt ?? b.createdAt).localeCompare(
        a.completedAt ?? a.createdAt,
      ),
    )
    .slice(0, sessionLimit)
    .map((session) => excerptInterview(session));
}
