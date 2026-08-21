import { BarChart3, BrainCircuit, Sparkles, Target } from "lucide-react";
import type { ReactNode } from "react";
import { getZedDashboard } from "@/modules/zed/dashboard";

export const dynamic = "force-dynamic";

export default async function ZedProgressPage() {
  const { attempts, mastery, skills } = await getZedDashboard();
  const solved = attempts.filter((item) => item.solved).length;
  const unaided = attempts.filter(
    (item) => item.solved && item.hintsUsed === 0,
  ).length;
  const recognition = attempts.length
    ? Math.round(
        (attempts.filter((item) => item.classificationCorrect).length /
          attempts.length) *
          100,
      )
    : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="section-label">Performance</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">
          Your technical signal
        </h2>
        <p className="text-dust mt-2 max-w-2xl text-sm leading-6">
          A clean read on recognition, implementation, and independence—built
          only from completed practice.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={<BarChart3 />}
          label="Sessions"
          value={String(attempts.length)}
          note={`${solved} solved`}
        />
        <Stat
          icon={<Sparkles />}
          label="Unaided solves"
          value={String(unaided)}
          note="No hints used"
        />
        <Stat
          icon={<Target />}
          label="Recognition"
          value={recognition === null ? "—" : `${recognition}%`}
          note="Named before coding"
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ProgressPanel
          title="Core interview skills"
          icon={<BrainCircuit className="size-4" />}
          rows={skills.map((item) => ({
            label: item.label,
            value: item.score === null ? null : item.score * 10,
            display: item.score === null ? "Not measured" : `${item.score}/10`,
          }))}
          empty="Complete a session to start measuring your skills."
        />
        <ProgressPanel
          title="Pattern mastery"
          icon={<Target className="size-4" />}
          rows={mastery.map((item) => ({
            label: item.name,
            value: item.strength,
            display: `${item.strength}%`,
          }))}
          empty="Complete a session to build your pattern map."
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="surface rounded-2xl p-5">
      <div className="text-amber size-4 [&>svg]:size-4">{icon}</div>
      <p className="mt-5 text-3xl font-semibold tracking-[-.05em]">{value}</p>
      <p className="text-canvas mt-1 text-xs font-medium">{label}</p>
      <p className="text-dust mt-1 text-[10px]">{note}</p>
    </div>
  );
}

function ProgressPanel({
  title,
  icon,
  rows,
  empty,
}: {
  title: string;
  icon: ReactNode;
  rows: { label: string; value: number | null; display: string }[];
  empty: string;
}) {
  return (
    <section className="border-iron/80 rounded-2xl border p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-amber">{icon}</span>
        {title}
      </h3>
      {rows.length ? (
        <div className="mt-6 space-y-5">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="mb-2 flex justify-between gap-4 text-xs">
                <span className="text-canvas truncate">{row.label}</span>
                <span className="text-dust font-mono text-[10px]">
                  {row.display}
                </span>
              </div>
              <div className="bg-iron h-1.5 overflow-hidden rounded-full">
                {row.value !== null && (
                  <div
                    className="from-amber to-sunset h-full rounded-full bg-gradient-to-r transition-[width] duration-700"
                    style={{ width: `${row.value}%` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-dust mt-6 text-xs">{empty}</p>
      )}
    </section>
  );
}
