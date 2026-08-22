"use client";

import { LoaderCircle, Plus, Target, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  moxieGoalProgress,
  moxieGoalStatusLabels,
  sortMoxieGoals,
  type MoxieGoal,
  type MoxieGoalStatus,
} from "@/modules/moxie/goal";

export function MoxieGoalsSection({ reloadKey = 0 }: { reloadKey?: number }) {
  const [goals, setGoals] = useState<MoxieGoal[] | null>(null);
  const [statement, setStatement] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/moxie/goals");
        const body = (await response.json().catch(() => null)) as {
          goals?: MoxieGoal[];
          error?: string;
        } | null;
        if (cancelled) return;
        if (!response.ok || !body?.goals) {
          setError(body?.error ?? "Moxie could not read your goals.");
          setGoals([]);
          return;
        }
        setGoals(body.goals);
      } catch {
        if (!cancelled) {
          setError("Moxie could not reach your goals.");
          setGoals([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function save() {
    const trimmed = statement.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/moxie/goals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          statement: trimmed,
          ...(targetDate ? { targetDate } : {}),
          milestones: [],
          linkedEntityIds: [],
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        goal?: MoxieGoal;
        error?: string;
      } | null;
      if (!response.ok || !body?.goal) {
        setError(body?.error ?? "Moxie could not save that goal.");
        return;
      }
      setGoals((current) => [...(current ?? []), body.goal as MoxieGoal]);
      setStatement("");
      setTargetDate("");
    } catch {
      setError("Moxie could not reach your goals.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, change: Record<string, string>) {
    setError("");
    const previous = goals;
    try {
      const response = await fetch("/api/moxie/goals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...change }),
      });
      const body = (await response.json().catch(() => null)) as {
        goal?: MoxieGoal;
      } | null;
      if (!response.ok || !body?.goal) {
        setGoals(previous);
        setError("Moxie could not update that goal.");
        return;
      }
      setGoals((current) =>
        (current ?? []).map((goal) =>
          goal.id === id ? (body.goal as MoxieGoal) : goal,
        ),
      );
    } catch {
      setGoals(previous);
      setError("Moxie could not reach your goals.");
    }
  }

  async function remove(id: string) {
    const previous = goals;
    setGoals((current) => (current ?? []).filter((goal) => goal.id !== id));
    try {
      const response = await fetch("/api/moxie/goals", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        setGoals(previous);
        setError("Moxie could not remove that goal.");
      }
    } catch {
      setGoals(previous);
      setError("Moxie could not reach your goals.");
    }
  }

  const ordered = sortMoxieGoals(goals ?? []);

  return (
    <>
      <p className="text-dust shrink-0 px-5 pb-3 text-[11px] leading-5">
        Goals you approve here shape how Moxie prioritises its advice.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {goals === null ? (
          <p className="text-dust flex items-center gap-2 px-1 py-6 text-xs">
            <LoaderCircle className="size-3.5 animate-spin" /> Loading goals…
          </p>
        ) : ordered.length === 0 ? (
          <p className="text-dust px-1 py-6 text-xs leading-5">
            No goals yet. Name an outcome you are working toward and Moxie will
            plan against it.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {ordered.map((goal) => {
              const progress = moxieGoalProgress(goal);
              return (
                <li
                  key={goal.id}
                  className="border-iron/80 bg-linen/[.02] rounded-xl border px-3 py-2.5"
                >
                  <div className="flex items-start gap-2">
                    <Target
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        goal.status === "active" ? "text-amber" : "text-dust",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-xs leading-5",
                          goal.status === "achieved"
                            ? "text-dust line-through"
                            : "text-canvas",
                        )}
                      >
                        {goal.statement}
                      </p>
                      {goal.targetDate && (
                        <span className="text-dust mt-1 block text-[10px]">
                          Target {goal.targetDate}
                        </span>
                      )}
                      {progress.total > 0 && (
                        <span className="text-dust mt-1 block text-[10px]">
                          {progress.done}/{progress.total} milestones
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void remove(goal.id)}
                      aria-label={`Delete goal: ${goal.statement}`}
                      className="text-dust shrink-0 rounded-lg p-1 transition hover:text-red-400"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  {goal.milestones.length > 0 && (
                    <ul className="mt-2 space-y-1 pl-5">
                      {goal.milestones.map((milestone) => (
                        <li key={milestone.id}>
                          <button
                            type="button"
                            onClick={() =>
                              void patch(goal.id, {
                                toggleMilestoneId: milestone.id,
                              })
                            }
                            className="flex items-center gap-2 text-left text-[11px] transition"
                          >
                            <span
                              className={cn(
                                "flex size-3.5 shrink-0 items-center justify-center rounded border",
                                milestone.completedAt
                                  ? "border-sage bg-sage/20 text-sage"
                                  : "border-iron",
                              )}
                            >
                              {milestone.completedAt ? "✓" : ""}
                            </span>
                            <span
                              className={
                                milestone.completedAt
                                  ? "text-dust line-through"
                                  : "text-canvas"
                              }
                            >
                              {milestone.title}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1 pl-5">
                    {(
                      ["active", "achieved", "archived"] as MoxieGoalStatus[]
                    ).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void patch(goal.id, { status })}
                        aria-pressed={goal.status === status}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[9px] transition",
                          goal.status === status
                            ? "border-sage/40 bg-sage/[.08] text-sage"
                            : "border-iron text-dust hover:text-linen",
                        )}
                      >
                        {moxieGoalStatusLabels[status]}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {error && (
          <p role="alert" className="mt-3 px-1 text-[11px] text-red-400">
            {error}
          </p>
        )}
      </div>

      <div className="border-iron/70 shrink-0 space-y-2 border-t p-4">
        <textarea
          value={statement}
          onChange={(event) => setStatement(event.target.value)}
          rows={2}
          maxLength={400}
          placeholder="An outcome you are working toward…"
          aria-label="New goal"
          className="border-iron bg-night/60 placeholder:text-dust focus:border-amber/45 w-full resize-none rounded-xl border px-3 py-2 text-xs transition-colors outline-none"
        />
        <input
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
          aria-label="Target date"
          className="border-iron bg-night/60 text-canvas focus:border-amber/45 w-full rounded-xl border px-3 py-2 text-xs transition-colors outline-none"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={!statement.trim() || busy}
          className="bg-amber text-night flex min-h-9 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold transition disabled:opacity-35"
        >
          {busy ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Save goal
        </button>
      </div>
    </>
  );
}
