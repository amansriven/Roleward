import { describe, expect, it } from "vitest";
import {
  assessUrgency,
  daysUntil,
  describeCountdown,
  isSettled,
} from "./timeline";

const now = new Date("2026-08-18T12:00:00.000Z");
const inDays = (days: number) =>
  new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

describe("daysUntil", () => {
  it("counts whole days rather than hours", () => {
    // A deadline later today is today, not "in 0.4 days".
    expect(daysUntil("2026-08-18T23:00:00.000Z", now)).toBe(0);
    expect(daysUntil(inDays(8), now)).toBe(8);
  });
  it("goes negative once the date has passed", () => {
    expect(daysUntil(inDays(-3), now)).toBe(-3);
  });
  it("returns null for a missing or unparseable date", () => {
    expect(daysUntil(undefined, now)).toBeNull();
    expect(daysUntil("not a date", now)).toBeNull();
  });
});

describe("describeCountdown", () => {
  it("reads the way a person would say it", () => {
    expect(describeCountdown(8, "Interview")).toBe("Interview in 8 days");
    expect(describeCountdown(1, "Interview")).toBe("Interview is tomorrow");
    expect(describeCountdown(0, "Deadline")).toBe("Deadline is today");
    expect(describeCountdown(-1, "Deadline")).toBe("Deadline was 1 day ago");
  });
});

describe("assessUrgency", () => {
  const base = { status: "preparing" as const, readinessScore: 60 };

  it("ranks a near interview above a near deadline", () => {
    // A deadline can be met in an evening. An interview cannot.
    const interview = assessUrgency({ ...base, interviewDate: inDays(2) }, now);
    const deadline = assessUrgency({ ...base, deadline: inDays(2) }, now);
    expect(interview.score).toBeGreaterThan(deadline.score);
  });

  it("raises urgency as the date approaches", () => {
    const soon = assessUrgency({ ...base, interviewDate: inDays(2) }, now);
    const later = assessUrgency({ ...base, interviewDate: inDays(12) }, now);
    expect(soon.score).toBeGreaterThan(later.score);
  });

  it("names the reason it is urgent", () => {
    expect(
      assessUrgency({ ...base, interviewDate: inDays(8) }, now).headline,
    ).toBe("Interview in 8 days");
  });

  it("drops an application that is settled to the bottom", () => {
    // Nothing you do now changes an offer you already have.
    const offer = assessUrgency(
      { status: "offer", readinessScore: 10, interviewDate: inDays(1) },
      now,
    );
    expect(offer.score).toBe(0);
    expect(offer.headline).toBeNull();
  });

  it("treats being underprepared as urgent even with no dates", () => {
    const thin = assessUrgency({ ...base, readinessScore: 20 }, now);
    const ready = assessUrgency({ ...base, readinessScore: 95 }, now);
    expect(thin.score).toBeGreaterThan(ready.score);
    expect(thin.headline).toBe("Preparation is thin");
  });

  it("ignores a date that has already passed", () => {
    const past = assessUrgency({ ...base, interviewDate: inDays(-5) }, now);
    expect(past.headline).toBeNull();
    expect(past.daysToInterview).toBe(-5);
  });
});

describe("isSettled", () => {
  it("covers the outcomes preparation cannot change", () => {
    expect(isSettled("offer")).toBe(true);
    expect(isSettled("closed")).toBe(true);
    expect(isSettled("interviewing")).toBe(false);
  });
});
