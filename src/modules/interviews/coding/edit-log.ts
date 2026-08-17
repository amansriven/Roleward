/**
 * Captures how the candidate is solving the problem, not just what they ended
 * up with. Screenshots would only ever show the final state; an edit log also
 * exposes hesitation, backtracking, and where they got stuck — which is what an
 * interviewer actually reacts to.
 *
 * The log is kept in the browser (free) and only summarized to the model when
 * the candidate asks for a check-in (paid).
 */

export interface EditOp {
  at: number;
  from: number;
  /** Text removed at `from`, if any. */
  removed: string;
  /** Text inserted at `from`, if any. */
  inserted: string;
}

export interface EditLog {
  startedAt: number;
  ops: EditOp[];
}

export const IDLE_THRESHOLD_MS = 20_000;
const SIGNIFICANT_DELETION = 40;

export function createEditLog(startedAt = Date.now()): EditLog {
  return { startedAt, ops: [] };
}

export function recordChange(log: EditLog, op: EditOp): EditLog {
  return { ...log, ops: [...log.ops, op] };
}

/**
 * Reduces two document states to the single changed region, which is how a real
 * editor reports a transaction. Lets a plain textarea feed the same log that a
 * CodeMirror/Monaco integration would.
 */
export function diffToOp(
  previous: string,
  next: string,
  at = Date.now(),
): EditOp | null {
  if (previous === next) return null;
  let start = 0;
  const max = Math.min(previous.length, next.length);
  while (start < max && previous[start] === next[start]) start += 1;
  let fromEnd = 0;
  while (
    fromEnd < max - start &&
    previous[previous.length - 1 - fromEnd] === next[next.length - 1 - fromEnd]
  )
    fromEnd += 1;
  return {
    at,
    from: start,
    removed: previous.slice(start, previous.length - fromEnd),
    inserted: next.slice(start, next.length - fromEnd),
  };
}

export interface ActivitySummary {
  /** Seconds from session start to the first non-whitespace character. */
  timeToFirstLineSeconds: number | null;
  /** Pauses long enough to read as the candidate being stuck. */
  idleGaps: { atSeconds: number; durationSeconds: number }[];
  /** Chunks written and then deleted again — the interesting part. */
  rewrites: { atSeconds: number; text: string }[];
  charactersInserted: number;
  charactersRemoved: number;
}

function seconds(ms: number) {
  return Math.round(ms / 1000);
}

export function summarizeActivity(
  log: EditLog,
  since = log.startedAt,
): ActivitySummary {
  const ops = log.ops.filter((op) => op.at >= since);
  const summary: ActivitySummary = {
    timeToFirstLineSeconds: null,
    idleGaps: [],
    rewrites: [],
    charactersInserted: 0,
    charactersRemoved: 0,
  };

  let previous = since;
  for (const op of ops) {
    if (op.at - previous >= IDLE_THRESHOLD_MS)
      summary.idleGaps.push({
        atSeconds: seconds(previous - log.startedAt),
        durationSeconds: seconds(op.at - previous),
      });
    previous = op.at;

    summary.charactersInserted += op.inserted.length;
    summary.charactersRemoved += op.removed.length;

    if (
      summary.timeToFirstLineSeconds === null &&
      op.inserted.trim().length > 0
    )
      summary.timeToFirstLineSeconds = seconds(op.at - log.startedAt);

    if (op.removed.trim().length >= SIGNIFICANT_DELETION)
      summary.rewrites.push({
        atSeconds: seconds(op.at - log.startedAt),
        text: op.removed.trim().slice(0, 400),
      });
  }

  return summary;
}

/** The compact digest sent to the interviewer on a check-in. */
export function describeActivity(summary: ActivitySummary, code: string) {
  const lines: string[] = [];
  if (summary.timeToFirstLineSeconds !== null)
    lines.push(`Started typing ${summary.timeToFirstLineSeconds}s in.`);
  for (const gap of summary.idleGaps)
    lines.push(
      `Paused for ${gap.durationSeconds}s at the ${gap.atSeconds}s mark.`,
    );
  for (const rewrite of summary.rewrites)
    lines.push(
      `At ${rewrite.atSeconds}s they deleted this and moved on:\n${rewrite.text}`,
    );
  if (!lines.length)
    lines.push("Steady typing with no notable pauses or rewrites.");

  return [
    "[Editor check-in requested by the candidate]",
    `Current code:\n${code.slice(0, 6000)}`,
    `How they got here:\n${lines.join("\n")}`,
  ].join("\n\n");
}
