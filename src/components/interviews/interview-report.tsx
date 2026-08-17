import { ArrowRight, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Panel } from "@/components/workspace/dashboard-ui";
import { INTERVIEW_PLANS } from "@/modules/interviews/plan";
import type { InterviewSession } from "@/modules/interviews/schema";

function scoreTone(score: number) {
  if (score >= 80) return "text-sage";
  if (score >= 60) return "text-amber";
  return "text-kiln";
}

export function InterviewReportView({
  session,
}: {
  session: InterviewSession;
}) {
  const report = session.report;
  if (!report)
    return (
      <p className="text-dust py-20 text-center text-sm">
        This interview has not been scored yet.
      </p>
    );
  const plan = INTERVIEW_PLANS[session.config.type];

  return (
    <div className="theme-stage mx-auto max-w-3xl space-y-6">
      <div>
        <p className="section-label">
          {plan.label} · {session.roleLabel}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em]">
          How that interview went.
        </h1>
      </div>

      <Panel className="p-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-dust text-[11px] tracking-[.08em] uppercase">
              Overall
            </p>
            <p
              className={`mt-2 font-mono text-5xl ${scoreTone(report.overallScore)}`}
            >
              {report.overallScore}
              <span className="text-dust text-lg">/100</span>
            </p>
          </div>
        </div>
        <p className="text-canvas mt-5 text-sm leading-6">{report.rationale}</p>
      </Panel>

      <Panel className="p-6">
        <p className="font-semibold">Breakdown</p>
        <div className="mt-5 space-y-5">
          {report.dimensions.map((dimension) => (
            <div key={dimension.key}>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-canvas">{dimension.label}</span>
                <span className="text-dust font-mono">{dimension.score}%</span>
              </div>
              <div className="bg-iron h-1.5 rounded-full">
                <div
                  className="bg-plum h-full rounded-full"
                  style={{ width: `${dimension.score}%` }}
                />
              </div>
              <p className="text-dust mt-2 text-xs leading-5">
                {dimension.rationale}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      {report.strengths.length > 0 && (
        <Panel className="p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-sage size-4" />
            <p className="font-semibold">What worked</p>
          </div>
          <ul className="mt-4 space-y-3">
            {report.strengths.map((strength) => (
              <li key={strength} className="text-canvas text-sm leading-6">
                {strength}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {report.improvements.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="text-amber size-4" />
            <p className="font-semibold">What to work on next</p>
          </div>
          <div className="space-y-3">
            {report.improvements.map((improvement) => (
              <Panel key={improvement.title} className="p-5">
                <p className="text-sm font-semibold">{improvement.title}</p>
                <p className="text-canvas mt-2 text-sm leading-6">
                  {improvement.detail}
                </p>
                <Link
                  href={improvement.href}
                  className="text-amber mt-4 inline-flex items-center gap-1.5 text-xs font-semibold"
                >
                  {improvement.actionLabel} <ArrowRight className="size-3" />
                </Link>
              </Panel>
            ))}
          </div>
        </section>
      )}

      <div className="border-iron/60 flex flex-col gap-3 border-t pt-6 sm:flex-row">
        <Link
          href="/dashboard/stage-fright/new"
          className="bg-plum inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white"
        >
          <Sparkles className="size-4" /> Run another interview
        </Link>
        <Link
          href="/dashboard/stage-fright"
          className="border-iron text-canvas hover:text-linen inline-flex min-h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold"
        >
          Back to Stage Fright
        </Link>
      </div>
    </div>
  );
}
