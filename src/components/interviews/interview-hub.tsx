"use client";

import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Mic,
  Mic2,
  Plus,
  Sparkles,
  Target,
  Type,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Metric, PageIntro, Panel } from "@/components/workspace/dashboard-ui";
import { cn } from "@/lib/utils";
import { INTERVIEW_PLANS } from "@/modules/interviews/plan";
import {
  COMPETENCIES,
  COMPETENCY_LABELS,
  type InterviewSummary,
} from "@/modules/interviews/schema";
import {
  behavioralSignals,
  technicalSignals,
} from "@/modules/interviews/signals";
import {
  loadWorkspace,
  workspaceUpdatedEvent,
} from "@/modules/workspace/repository";

const PRACTICE_MODES = [
  {
    label: "Behavioral",
    copy: "Sharpen stories, ownership, and measurable outcomes.",
    href: "/dashboard/stage-fright/new?type=behavioral",
  },
  {
    label: "Recruiter screen",
    copy: "Practice your pitch, motivation, and role fit.",
    href: "/dashboard/stage-fright/new?type=recruiter_screen",
  },
  {
    label: "Technical",
    copy: "Work through coding and system design under pressure.",
    href: "/dashboard/stage-fright/new?type=coding",
  },
] as const;

export function InterviewHub() {
  const [summaries, setSummaries] = useState<InterviewSummary[] | null>(null);
  useEffect(() => {
    const refresh = () =>
      setSummaries(loadWorkspace(localStorage).interviewSummaries);
    queueMicrotask(refresh);
    window.addEventListener(workspaceUpdatedEvent, refresh);
    return () => window.removeEventListener(workspaceUpdatedEvent, refresh);
  }, []);

  if (!summaries)
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="text-dust flex items-center gap-3 text-sm">
          <span className="relative flex size-2">
            <span className="bg-amber absolute inline-flex size-full animate-ping rounded-full opacity-50" />
            <span className="bg-amber relative inline-flex size-2 rounded-full" />
          </span>
          Preparing your rehearsal room…
        </div>
      </div>
    );

  const behavioral = behavioralSignals(summaries);
  const technical = technicalSignals(summaries);
  const covered = new Set(behavioral.covered);
  const averageScore = summaries.length
    ? Math.round(
        summaries.reduce((total, item) => total + item.overallScore, 0) /
          summaries.length,
      )
    : 0;
  const latest = summaries[0];

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageIntro
        icon={<StageFrightAvatar compact />}
        eyebrow="Stage Fright"
        title="Rehearse until the room feels familiar."
        copy="Practice against a focused AI interviewer, then turn every answer into a clear next step before the real conversation."
        action={
          <Link
            href="/dashboard/stage-fright/new"
            className="group bg-amber text-night hover:bg-sunset inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-[0_12px_30px_rgba(255,122,89,.18)] transition hover:-translate-y-0.5"
          >
            <Plus className="size-4" /> New rehearsal
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />

      <Panel className="roleward-card-accent relative overflow-hidden p-0">
        <div className="bg-amber/[.08] pointer-events-none absolute -top-24 right-[-5%] size-80 rounded-full blur-3xl" />
        <div className="relative grid gap-0 lg:grid-cols-[1.05fr_.95fr]">
          <div className="flex flex-col justify-between p-6 sm:p-8 lg:min-h-[330px] lg:p-10">
            <div>
              <div className="text-amber mb-8 flex items-center gap-2 text-[11px] font-medium tracking-[.12em] uppercase">
                <Sparkles className="size-3.5" /> Guided rehearsal
              </div>
              <h2 className="max-w-xl text-2xl font-semibold tracking-[-.04em] text-balance sm:text-3xl">
                {summaries.length
                  ? "Your next answer should feel more deliberate than your last."
                  : "Your first rehearsal becomes the baseline you improve from."}
              </h2>
              <p className="text-canvas mt-4 max-w-xl text-sm leading-6">
                Choose a role, set the pressure, and answer by voice or text.
                The interviewer adapts in real time and scores the details that
                make an answer credible.
              </p>
            </div>
            <div className="text-canvas mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs">
              <span className="flex items-center gap-2">
                <Check className="text-sage size-3.5" /> Role-aware questions
              </span>
              <span className="flex items-center gap-2">
                <Check className="text-sage size-3.5" /> Voice or text
              </span>
              <span className="flex items-center gap-2">
                <Check className="text-sage size-3.5" /> Actionable scorecard
              </span>
            </div>
          </div>

          <div className="border-iron/70 bg-night/25 p-5 lg:border-l lg:p-7">
            <div className="border-iron/80 bg-workshop/80 rounded-[20px] border p-5 shadow-2xl shadow-black/20">
              <div className="border-iron/70 flex items-center justify-between gap-3 border-b pb-4">
                <div className="flex items-center gap-3">
                  <InterviewerAvatar />
                  <div>
                    <p className="text-sm font-semibold">AI interviewer</p>
                    <p className="text-dust mt-0.5 text-[11px]">
                      Realistic · focused follow-ups
                    </p>
                  </div>
                </div>
                <span className="border-sage/20 bg-sage/[.06] text-sage flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px]">
                  <span className="bg-sage size-1.5 rounded-full" /> Ready
                </span>
              </div>
              <div className="space-y-3 py-5">
                <div className="border-iron/80 bg-raised text-canvas max-w-[90%] rounded-2xl rounded-tl-md border px-4 py-3 text-xs leading-5">
                  Tell me about a time you had to change direction after new
                  information surfaced.
                </div>
                <div className="border-amber/20 bg-amber/[.08] text-linen ml-auto max-w-[82%] rounded-2xl rounded-tr-md border px-4 py-3 text-xs leading-5">
                  I was leading a launch when our beta data challenged the
                  original assumption…
                </div>
              </div>
              <div className="border-iron/70 text-dust flex items-center gap-2 border-t pt-4 text-[11px]">
                <Mic className="text-amber size-3.5" /> Listening for ownership,
                specificity, and impact
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {summaries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Panel className="p-5">
            <Metric
              label="Rehearsals"
              value={String(summaries.length)}
              note={`Latest: ${latest ? INTERVIEW_PLANS[latest.type].label : "—"}`}
            />
          </Panel>
          <Panel className="p-5">
            <Metric
              label="Average score"
              value={`${averageScore}%`}
              note="Across completed interviews"
            />
          </Panel>
          <Panel className="p-5">
            <Metric
              label="Story coverage"
              value={`${behavioral.competenciesCovered} / ${COMPETENCIES.length}`}
              note="Competencies backed by an answer"
            />
          </Panel>
        </div>
      )}

      {summaries.length ? (
        <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <Panel className="overflow-hidden">
            <div className="border-iron/70 flex items-end justify-between gap-4 border-b p-5 sm:p-6">
              <div>
                <p className="font-semibold">Recent rehearsals</p>
                <p className="text-dust mt-1 text-xs">
                  Revisit feedback and track how your answers are changing.
                </p>
              </div>
              <Link
                href="/dashboard/stage-fright/new"
                className="text-amber hidden items-center gap-1.5 text-xs font-semibold sm:flex"
              >
                Practice again <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="divide-iron/65 divide-y">
              {summaries.slice(0, 6).map((summary) => (
                <Link
                  key={summary.id}
                  href={`/dashboard/stage-fright/report/${summary.id}`}
                  className="group hover:bg-linen/[.025] flex items-center gap-4 p-5 transition sm:px-6"
                >
                  <span className="border-amber/15 bg-amber/[.06] text-amber flex size-10 shrink-0 items-center justify-center rounded-xl border">
                    {summary.modality === "voice" ? (
                      <Mic className="size-4" />
                    ) : (
                      <Type className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {INTERVIEW_PLANS[summary.type].label}
                      <span className="text-dust mx-2">·</span>
                      <span className="text-canvas">{summary.roleLabel}</span>
                    </p>
                    <p className="text-dust mt-1 flex items-center gap-2 text-[11px]">
                      {new Date(summary.completedAt).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                      <span>·</span>
                      {summary.modality === "voice" ? "Voice" : "Text"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-linen font-mono text-base">
                      {summary.overallScore}
                      <span className="text-dust text-xs">%</span>
                    </p>
                    <p className="text-dust mt-0.5 text-[10px]">Score</p>
                  </div>
                  <ChevronRight className="text-dust group-hover:text-amber size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">Story coverage</p>
                <p className="text-dust mt-1 text-xs leading-5">
                  The themes your answers have proven so far.
                </p>
              </div>
              <span className="bg-sage/[.08] text-sage flex size-9 items-center justify-center rounded-xl">
                <Target className="size-4" />
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {COMPETENCIES.map((competency) => {
                const isCovered = covered.has(competency);
                return (
                  <div key={competency}>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span
                        className={cn(isCovered ? "text-canvas" : "text-dust")}
                      >
                        {COMPETENCY_LABELS[competency]}
                      </span>
                      <span
                        className={cn(
                          "flex size-4 items-center justify-center rounded-full border",
                          isCovered
                            ? "border-sage/40 bg-sage text-night"
                            : "border-iron text-transparent",
                        )}
                      >
                        <Check className="size-2.5" />
                      </span>
                    </div>
                    <div className="bg-iron/70 h-1 overflow-hidden rounded-full">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          isCovered ? "bg-sage w-full" : "w-0",
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {behavioral.uncovered[0] && (
              <Link
                href="/dashboard/stage-fright/new?type=behavioral"
                className="border-iron/80 bg-linen/[.025] hover:border-amber/30 mt-7 flex items-center justify-between rounded-xl border p-3.5 text-xs transition"
              >
                <span>
                  <span className="text-dust block text-[10px] tracking-[.08em] uppercase">
                    Suggested next focus
                  </span>
                  <span className="text-linen mt-1 block font-medium">
                    {COMPETENCY_LABELS[behavioral.uncovered[0]]}
                  </span>
                </span>
                <ArrowRight className="text-amber size-4" />
              </Link>
            )}
          </Panel>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {PRACTICE_MODES.map((mode, index) => (
            <Link
              key={mode.label}
              href={mode.href}
              className="roleward-card group hover:border-amber/25 rounded-[20px] p-5 transition hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-dust font-mono text-[10px]">
                  0{index + 1}
                </span>
                <ArrowRight className="text-dust group-hover:text-amber size-4 transition group-hover:translate-x-0.5" />
              </div>
              <p className="mt-8 text-sm font-semibold">{mode.label}</p>
              <p className="text-dust mt-2 text-xs leading-5">{mode.copy}</p>
              <p className="text-canvas mt-5 flex items-center gap-1.5 text-[11px]">
                <Clock3 className="size-3" /> Start with a 10 minute rehearsal
              </p>
            </Link>
          ))}
        </div>
      )}

      {technical.attempts > 0 && (
        <p className="sr-only">
          Technical interview coverage is {technical.coverage}% across{" "}
          {technical.attempts} attempts.
        </p>
      )}
    </div>
  );
}

function StageFrightAvatar({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        "border-amber/25 relative flex shrink-0 items-center justify-center rounded-2xl border bg-[radial-gradient(circle_at_50%_20%,rgba(255,154,61,.18),rgba(255,122,89,.05)_48%,rgba(19,22,28,.8))] shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_12px_30px_rgba(0,0,0,.2)]",
        compact ? "size-13" : "size-16",
      )}
    >
      <span className="absolute inset-1.5 rounded-xl border border-white/[.04]" />
      <Mic2
        className={cn("text-amber relative", compact ? "size-5" : "size-7")}
        aria-hidden="true"
      />
    </span>
  );
}

function InterviewerAvatar() {
  return (
    <span className="border-amber/20 bg-amber/[.07] text-amber relative flex size-10 shrink-0 items-center justify-center rounded-xl border">
      <Mic2 className="size-4" />
      <span className="border-workshop bg-sage absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2" />
    </span>
  );
}
