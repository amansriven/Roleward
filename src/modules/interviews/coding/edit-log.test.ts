import { describe, expect, it } from "vitest";
import {
  createEditLog,
  describeActivity,
  IDLE_THRESHOLD_MS,
  recordChange,
  summarizeActivity,
  type EditLog,
} from "./edit-log";

const START = 1_000_000;
const op = (
  atOffsetMs: number,
  inserted: string,
  removed = "",
): Parameters<typeof recordChange>[1] => ({
  at: START + atOffsetMs,
  from: 0,
  inserted,
  removed,
});

function logWith(...ops: Parameters<typeof recordChange>[1][]): EditLog {
  return ops.reduce(recordChange, createEditLog(START));
}

describe("edit log", () => {
  it("reports time to the first real character, ignoring whitespace", () => {
    const summary = summarizeActivity(
      logWith(op(2000, "   "), op(9000, "function")),
    );
    expect(summary.timeToFirstLineSeconds).toBe(9);
  });

  it("leaves time-to-first-line null when nothing was typed", () => {
    expect(summarizeActivity(logWith()).timeToFirstLineSeconds).toBeNull();
  });

  it("flags idle gaps that read as being stuck", () => {
    const summary = summarizeActivity(
      logWith(
        op(1000, "const x = 1"),
        op(1000 + IDLE_THRESHOLD_MS + 5000, ";"),
      ),
    );
    expect(summary.idleGaps).toHaveLength(1);
    expect(summary.idleGaps[0]?.durationSeconds).toBe(25);
  });

  it("ignores pauses shorter than the threshold", () => {
    const summary = summarizeActivity(logWith(op(1000, "a"), op(5000, "b")));
    expect(summary.idleGaps).toEqual([]);
  });

  it("captures a written-then-deleted approach as a rewrite", () => {
    const abandoned =
      "const queue = [start]; while (queue.length) { const node = queue.shift(); }";
    const summary = summarizeActivity(logWith(op(30_000, "", abandoned)));
    expect(summary.rewrites).toHaveLength(1);
    expect(summary.rewrites[0]?.text).toContain("queue");
    expect(summary.rewrites[0]?.atSeconds).toBe(30);
  });

  it("does not treat small deletions as rewrites", () => {
    expect(summarizeActivity(logWith(op(1000, "", "typo"))).rewrites).toEqual(
      [],
    );
  });

  it("counts characters in both directions", () => {
    const summary = summarizeActivity(logWith(op(100, "abcde", "xy")));
    expect(summary.charactersInserted).toBe(5);
    expect(summary.charactersRemoved).toBe(2);
  });

  it("only summarizes activity after the last check-in", () => {
    const log = logWith(op(1000, "first"), op(60_000, "second"));
    const summary = summarizeActivity(log, START + 30_000);
    expect(summary.charactersInserted).toBe("second".length);
  });

  it("describes rewrites in the digest sent to the interviewer", () => {
    const abandoned = "x".repeat(60);
    const digest = describeActivity(
      summarizeActivity(logWith(op(20_000, "", abandoned))),
      "const answer = 1;",
    );
    expect(digest).toContain("deleted this");
    expect(digest).toContain("const answer = 1;");
  });

  it("still says something useful when nothing notable happened", () => {
    const digest = describeActivity(summarizeActivity(logWith()), "code");
    expect(digest).toContain("no notable pauses");
  });
});
