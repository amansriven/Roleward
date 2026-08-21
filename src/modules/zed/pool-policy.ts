/**
 * How the shared warm pool decides what to hand out and when to top itself up.
 *
 * Generating one validated problem costs an OpenAI call plus two judge round
 * trips — 11 to 28 seconds — which is far too slow to sit behind a click. So
 * problems are generated ahead of time into a pool keyed by archetype and
 * difficulty, and a request becomes a read.
 *
 * Nothing here touches DynamoDB. The policy is the part worth testing, and it
 * stays free of `server-only` so it can be.
 */

import type { Difficulty } from "./archetypes";

/** Stock a cell aims to hold before anyone has drawn from it. */
export const POOL_TARGET = 8;
/** Below this many unseen problems, a candidate is about to start repeating. */
export const LOW_WATER = 3;
/** Generated per refill. One request funds a few problems, not a whole cell. */
export const REFILL_BATCH = 3;
/** A hard stop, so one heavy user cannot grow a cell without bound. */
export const POOL_CEILING = 60;

/** Pool partition key: problems are shared, so this is not per user. */
export type PoolCell = `${string}#${Difficulty}`;
export function poolCell(archetypeId: string, difficulty: Difficulty) {
  return `${archetypeId}#${difficulty}` as PoolCell;
}

/**
 * How many problems to generate in the background after serving a request.
 *
 * Two separate pressures, whichever is greater: a cell that has never been
 * filled, and a specific candidate who has worked through most of what the
 * cell holds. The second is why seen ids are tracked at all — the pool can be
 * comfortably full and still have nothing new for someone.
 */
export function planRefill(cellSize: number, unseenRemaining: number) {
  const shortfall = Math.max(
    POOL_TARGET - cellSize,
    LOW_WATER - unseenRemaining,
    0,
  );
  const headroom = Math.max(POOL_CEILING - cellSize, 0);
  return Math.min(shortfall, REFILL_BATCH, headroom);
}

/**
 * Picks which pooled problem to serve.
 *
 * Random rather than oldest-first: pooled problems are lent, not consumed, so
 * two candidates starting the same archetype at the same moment would
 * otherwise be handed the same problem and compare notes.
 */
export function chooseUnseen(
  poolIds: string[],
  seenIds: Iterable<string>,
  random: () => number = Math.random,
): string | null {
  const seen = new Set(seenIds);
  const unseen = poolIds.filter((id) => !seen.has(id));
  if (!unseen.length) return null;
  return unseen[Math.floor(random() * unseen.length)] ?? null;
}

export function countUnseen(poolIds: string[], seenIds: Iterable<string>) {
  const seen = new Set(seenIds);
  return poolIds.filter((id) => !seen.has(id)).length;
}
