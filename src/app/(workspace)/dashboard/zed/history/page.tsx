import { Check, Clock3, History } from "lucide-react";
import { ARCHETYPES } from "@/modules/zed/archetypes";
import { getZedDashboard } from "@/modules/zed/dashboard";

export const dynamic = "force-dynamic";

export default async function ZedHistoryPage() {
  const { attempts } = await getZedDashboard();
  const names = new Map(ARCHETYPES.map((item) => [item.id, item.name]));
  const ordered = [...attempts].sort((a, b) =>
    (b.completedAt ?? "").localeCompare(a.completedAt ?? ""),
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="section-label">Session archive</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">
          Practice history
        </h2>
        <p className="text-dust mt-2 text-sm">
          Every attempt, without inflated streaks or vanity points.
        </p>
      </div>
      {ordered.length ? (
        <ol className="surface overflow-hidden rounded-2xl">
          {ordered.map((attempt, index) => (
            <li
              key={`${attempt.problemId}-${index}`}
              className="border-iron/70 flex items-center gap-4 border-b p-4 last:border-b-0 sm:p-5"
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${attempt.solved ? "border-sage/30 bg-sage/10 text-sage" : "border-iron bg-raised text-dust"}`}
              >
                {attempt.solved ? (
                  <Check className="size-4" />
                ) : (
                  <Clock3 className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {names.get(attempt.archetypeId) ?? "Technical practice"}
                </p>
                <p className="text-dust mt-1 text-[11px] capitalize">
                  {attempt.difficulty} · {attempt.hintsUsed}{" "}
                  {attempt.hintsUsed === 1 ? "hint" : "hints"} · {attempt.runs}{" "}
                  {attempt.runs === 1 ? "run" : "runs"}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={
                    attempt.solved
                      ? "text-sage text-xs font-semibold"
                      : "text-dust text-xs"
                  }
                >
                  {attempt.solved ? "Solved" : "Reviewed"}
                </p>
                <p className="text-dust mt-1 text-[10px]">
                  {attempt.completedAt
                    ? new Date(attempt.completedAt).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )
                    : "In progress"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="roleward-empty flex min-h-64 flex-col items-center justify-center rounded-2xl p-8 text-center">
          <History className="text-dust size-6" />
          <h3 className="mt-4 text-sm font-semibold">No sessions yet</h3>
          <p className="text-dust mt-2 max-w-xs text-xs leading-5">
            Your completed practice sessions will collect here.
          </p>
        </div>
      )}
    </div>
  );
}
