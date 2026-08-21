import { ArrowUpRight, Clock3, Target } from "lucide-react";
import Link from "next/link";
import { PracticeFlow } from "@/components/zed/practice-flow";
import { ARCHETYPES, CODING_SKILL_LABELS } from "@/modules/zed/archetypes";
import { getZedDashboard } from "@/modules/zed/dashboard";
import { recommendNext } from "@/modules/zed/skills";

export const dynamic = "force-dynamic";

export default async function ZedPage() {
  const { attempts, mastery, skills } = await getZedDashboard();
  const lastDifficulty = new Map(
    [...attempts]
      .sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""))
      .map((attempt) => [attempt.archetypeId, attempt.difficulty]),
  );
  const recommendation = recommendNext(
    mastery.map((item) => ({
      ...item,
      lastDifficulty: lastDifficulty.get(item.archetypeId) ?? null,
    })),
    skills,
    ARCHETYPES.filter(
      (item) => !mastery.some((seen) => seen.archetypeId === item.id),
    ).map((item) => ({ id: item.id, name: item.name })),
  );
  const solved = attempts.filter((attempt) => attempt.solved);
  const recognition = attempts.length
    ? Math.round(
        (attempts.filter((attempt) => attempt.classificationCorrect).length /
          attempts.length) *
          100,
      )
    : null;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <main className="min-w-0">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="section-label">Next session</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">
              Your practice room
            </h2>
            <p className="text-dust mt-2 text-sm">
              One focused problem. Clear checkpoints. Useful feedback.
            </p>
          </div>
          <span className="border-iron bg-raised text-dust hidden rounded-full border px-3 py-1.5 font-mono text-[10px] sm:inline-flex">
            Untimed practice
          </span>
        </div>
        <PracticeFlow
          archetypes={ARCHETYPES.map(({ id, name }) => ({ id, name }))}
          skillLabels={CODING_SKILL_LABELS}
          recommendation={recommendation}
        />
      </main>
      <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <div className="surface rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="text-amber size-4" /> Session signal
          </div>
          <p className="text-dust mt-2 text-xs leading-5">
            Zed measures how you think before it measures whether the code
            passes.
          </p>
          <div className="border-iron/70 mt-5 grid grid-cols-2 gap-3 border-t pt-4">
            <Metric value={String(solved.length)} label="Solved" />
            <Metric
              value={recognition === null ? "—" : `${recognition}%`}
              label="Recognition"
            />
          </div>
        </div>
        <div className="border-iron/80 rounded-2xl border p-5">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Clock3 className="text-sage size-3.5" /> How it works
          </div>
          <ol className="mt-4 space-y-3 text-xs">
            {[
              "Recognize the pattern",
              "Commit to the cost",
              "Build and test",
              "Review the evidence",
            ].map((label, index) => (
              <li key={label} className="text-canvas flex items-center gap-3">
                <span className="border-iron text-dust flex size-5 items-center justify-center rounded-full border font-mono text-[9px]">
                  {index + 1}
                </span>
                {label}
              </li>
            ))}
          </ol>
        </div>
        <Link
          href="/dashboard/zed/progress"
          className="text-canvas hover:text-linen flex items-center justify-between rounded-xl px-1 py-2 text-xs font-semibold transition-colors"
        >
          See your full progress <ArrowUpRight className="size-3.5" />
        </Link>
      </aside>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-semibold tracking-tight">{value}</p>
      <p className="text-dust mt-1 text-[10px]">{label}</p>
    </div>
  );
}
