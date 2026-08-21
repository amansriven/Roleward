import "server-only";

import type { ExecutionAdapter } from "@/modules/execution/port";
import {
  acquireRefillLock,
  evictPooledProblem,
  getPooledProblem,
  getSeenIds,
  listPooledIds,
  markSeen,
  putPooledProblem,
  releaseRefillLock,
} from "@/modules/aws/problem-pool";
import { putProblem } from "@/modules/aws/problem-store";
import { ARCHETYPES, type Difficulty } from "./archetypes";
import { generateValidatedProblem } from "./pipeline";
import type { GenerationAttempt } from "./validation";
import {
  chooseUnseen,
  countUnseen,
  planRefill,
  poolCell,
  POOL_TARGET,
} from "./pool-policy";
import type { GeneratedProblem } from "./schema";

export interface RefillReport {
  added: number;
  /** Why generation stopped, when it stopped early. */
  rejections: string[];
  skipped?: "locked";
}

export interface ClaimResult {
  claim: Claim | null;
  /** Populated only on the slow path, and only worth reading when it failed. */
  attempts: GenerationAttempt[];
}

export interface Claim {
  problem: GeneratedProblem;
  /** "pool" is the fast path; "generated" means the candidate waited for it. */
  source: "pool" | "generated";
  /** How many the pool wants generated in the background after responding. */
  refill: number;
}

/** A pooled id whose item has gone is not worth a second round trip. */
const MAX_FETCH_ATTEMPTS = 3;

/**
 * Hands the candidate a problem they have not seen, preferring one that already
 * exists.
 *
 * The pool is what makes this fast: generating a validated problem takes 11 to
 * 28 seconds, which cannot sit behind a click. When the pool has nothing left
 * for this candidate the slow path still runs, so a cold cell degrades to the
 * old latency rather than to an error.
 */
export async function claimProblem(
  adapter: ExecutionAdapter,
  userId: string,
  archetypeId: string,
  difficulty: Difficulty,
): Promise<ClaimResult> {
  const cell = poolCell(archetypeId, difficulty);
  const [poolIds, seenIds] = await Promise.all([
    listPooledIds(cell),
    getSeenIds(userId, cell),
  ]);

  let candidates = poolIds;
  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt += 1) {
    const chosen = chooseUnseen(candidates, seenIds);
    if (!chosen) break;
    const problem = await getPooledProblem(cell, chosen);
    if (!problem) {
      // Expired by TTL, or written under a schema this build no longer accepts.
      await evictPooledProblem(cell, chosen);
      candidates = candidates.filter((id) => id !== chosen);
      continue;
    }
    await serve(userId, cell, problem);
    return {
      claim: {
        problem,
        source: "pool",
        refill: planRefill(
          candidates.length,
          countUnseen(candidates, seenIds) - 1,
        ),
      },
      attempts: [],
    };
  }

  const { problem, attempts } = await generateValidatedProblem(
    adapter,
    archetypeId,
    difficulty,
  );
  if (!problem) return { claim: null, attempts };

  // Pooled as well as served: the next candidate to ask for this cell should
  // not pay the same wait.
  await putPooledProblem(cell, problem);
  await serve(userId, cell, problem);
  return {
    claim: {
      problem,
      source: "generated",
      refill: planRefill(poolIds.length + 1, 0),
    },
    attempts,
  };
}

/**
 * Copies the problem into the candidate's own namespace, which is where
 * /api/zed/run looks for its hidden tests, and records that they have seen it.
 */
async function serve(
  userId: string,
  cell: ReturnType<typeof poolCell>,
  problem: GeneratedProblem,
) {
  await Promise.all([
    putProblem(userId, problem),
    markSeen(userId, cell, problem.id),
  ]);
}

/**
 * Tops the cell up. Runs after the response, so its cost is invisible to the
 * candidate who triggered it.
 *
 * Bounded by a deadline as well as a count: this runs inside the triggering
 * request's remaining duration budget, and being cut off mid-generation wastes
 * the whole attempt.
 */
export async function refillCell(
  adapter: ExecutionAdapter,
  archetypeId: string,
  difficulty: Difficulty,
  count: number,
  deadline: number,
): Promise<RefillReport> {
  const cell = poolCell(archetypeId, difficulty);
  if (count < 1) return { added: 0, rejections: [] };
  const holder = await acquireRefillLock(cell);
  if (!holder) return { added: 0, rejections: [], skipped: "locked" };

  let added = 0;
  const rejections: string[] = [];
  try {
    for (let index = 0; index < count; index += 1) {
      // One generation can take 28s. Starting one we cannot finish spends an
      // OpenAI call and two judge invocations on a result nobody stores.
      if (Date.now() > deadline - MIN_GENERATION_BUDGET_MS) break;
      const { problem, attempts } = await generateValidatedProblem(
        adapter,
        archetypeId,
        difficulty,
      );
      if (!problem) {
        // Nobody is watching a background refill, so a cell that has quietly
        // stopped producing valid problems would otherwise just stay empty.
        // These describe the model's output, not anyone's data.
        for (const item of attempts)
          if (!item.outcome.ok)
            rejections.push(`${item.outcome.reason}: ${item.outcome.detail}`);
        console.warn("zed pool: generation rejected", { cell, rejections });
        break;
      }
      await putPooledProblem(cell, problem);
      added += 1;
    }
  } finally {
    await releaseRefillLock(cell, holder);
  }
  return { added, rejections };
}

/** The slowest generation observed in testing, with room to store the result. */
const MIN_GENERATION_BUDGET_MS = 30_000;

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export interface CellStock {
  archetypeId: string;
  difficulty: Difficulty;
  size: number;
}

/** Current stock of every cell, shallowest first. */
export async function poolStock(): Promise<CellStock[]> {
  const cells = ARCHETYPES.flatMap((archetype) =>
    DIFFICULTIES.map((difficulty) => ({
      archetypeId: archetype.id,
      difficulty,
    })),
  );
  const sized = await Promise.all(
    cells.map(async (cell) => ({
      ...cell,
      size: (await listPooledIds(poolCell(cell.archetypeId, cell.difficulty)))
        .length,
    })),
  );
  return sized.sort((left, right) => left.size - right.size);
}

/**
 * Pre-generation, as opposed to the refill a request triggers on its way out.
 *
 * Reactive refill alone still makes the first candidate into any cell wait the
 * full 11 to 28 seconds, which is the thing the pool exists to avoid. Run on a
 * schedule, this fills the shallowest cell a batch at a time until every cell
 * can answer immediately.
 */
export async function warmShallowestCell(
  adapter: ExecutionAdapter,
  deadline: number,
) {
  const [shallowest] = await poolStock();
  if (!shallowest || shallowest.size >= POOL_TARGET)
    return { archetypeId: null, difficulty: null, added: 0, rejections: [] };

  const report = await refillCell(
    adapter,
    shallowest.archetypeId,
    shallowest.difficulty,
    POOL_TARGET - shallowest.size,
    deadline,
  );
  return {
    archetypeId: shallowest.archetypeId,
    difficulty: shallowest.difficulty,
    ...report,
  };
}
