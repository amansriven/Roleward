/**
 * When an application needs attention, and how urgently.
 *
 * The schema has carried a seven-state status and a deadline field since the
 * beginning, and nothing has ever read either: status was pinned to the literal
 * "preparing" and the deadline was collected and then never shown. So a list of
 * applications could not tell you which one was on fire.
 *
 * Pure, so the arithmetic that decides "8 days away" is testable without a
 * clock or a workspace.
 */

import type { ApplicationStatus } from "./schema";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  preparing: "Preparing",
  applied: "Applied",
  assessment: "Assessment",
  interviewing: "Interviewing",
  offer: "Offer",
  closed: "Closed",
};

/** The order a real search moves through, for the status control. */
export const STATUS_ORDER: ApplicationStatus[] = [
  "saved",
  "preparing",
  "applied",
  "assessment",
  "interviewing",
  "offer",
  "closed",
];

/** Statuses where preparation no longer changes the outcome. */
const SETTLED: ApplicationStatus[] = ["offer", "closed"];
export function isSettled(status: ApplicationStatus) {
  return SETTLED.includes(status);
}

/** Whole days from now until an ISO date; negative once it has passed. */
export function daysUntil(
  iso: string | undefined,
  now = new Date(),
): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const startOfDay = (date: Date) =>
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round(
    (startOfDay(target) - startOfDay(now)) / (24 * 60 * 60 * 1000),
  );
}

export function describeCountdown(
  days: number | null,
  noun: string,
): string | null {
  if (days === null) return null;
  if (days < 0)
    return `${noun} was ${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} ago`;
  if (days === 0) return `${noun} is today`;
  if (days === 1) return `${noun} is tomorrow`;
  return `${noun} in ${days} days`;
}

export interface UrgencyInput {
  status: ApplicationStatus;
  deadline?: string;
  interviewDate?: string;
  readinessScore: number;
}

export interface Urgency {
  /** Higher sorts first. */
  score: number;
  /** The single reason this one is near the top, or null when nothing presses. */
  headline: string | null;
  daysToDeadline: number | null;
  daysToInterview: number | null;
}

/**
 * Ranks what to work on next.
 *
 * An imminent interview outranks an imminent deadline, because a deadline can
 * be met in an evening and an interview cannot. Being underprepared raises
 * urgency; being settled removes it entirely, since nothing you do now changes
 * an offer you already have.
 */
export function assessUrgency(input: UrgencyInput, now = new Date()): Urgency {
  const daysToDeadline = daysUntil(input.deadline, now);
  const daysToInterview = daysUntil(input.interviewDate, now);

  if (isSettled(input.status))
    return { score: 0, headline: null, daysToDeadline, daysToInterview };

  let score = 0;
  let headline: string | null = null;

  if (daysToInterview !== null && daysToInterview >= 0) {
    score += Math.max(0, 60 - daysToInterview * 4);
    headline = describeCountdown(daysToInterview, "Interview");
  }
  if (daysToDeadline !== null && daysToDeadline >= 0) {
    const deadlineScore = Math.max(0, 40 - daysToDeadline * 3);
    score += deadlineScore;
    // Only take the headline if nothing more pressing already has it.
    if (!headline || deadlineScore > 30)
      headline = describeCountdown(daysToDeadline, "Deadline");
  }

  // A gap matters more the closer the date is, so this is added rather than
  // averaged: an unprepared application with no date is not an emergency.
  score += Math.max(0, 100 - input.readinessScore) / 5;

  if (!headline && input.readinessScore < 50) headline = "Preparation is thin";

  return { score, headline, daysToDeadline, daysToInterview };
}
