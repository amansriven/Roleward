"use client";

import { ArrowRight, Mic, Plus, Type } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FeatureIcon } from "@/components/brand/feature-icon";
import { Metric, PageIntro, Panel } from "@/components/workspace/dashboard-ui";
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
      <p className="text-dust py-20 text-center text-sm">
        Opening Stage Fright…
      </p>
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

  if (!summaries.length)
    return (
      <div className="space-y-7">
        <PageIntro
          icon={<FeatureIcon feature="stage-fright" size="xl" active />}
          eyebrow="Stage Fright"
          title="Practice the interview before it counts."
          copy="Pick the kind of interview, the role, and how hard it should feel. Answer by typing or out loud, then get scored feedback on what to fix."
        />
        <Panel className="py-20 text-center">
          <div className="flex justify-center">
            <FeatureIcon feature="stage-fright" size="xl" active />
          </div>
          <h2 className="mt-5 text-xl font-semibold">
            You haven’t run an interview yet.
          </h2>
          <p className="text-canvas mx-auto mt-2 max-w-md text-sm leading-6">
            A first one takes about ten minutes and gives you a baseline to
            improve against.
          </p>
          <Link
            href="/dashboard/stage-fright/new"
            className="bg-plum mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> Start your first interview
          </Link>
        </Panel>
      </div>
    );

  return (
    <div className="space-y-7">
      <PageIntro
        icon={<FeatureIcon feature="stage-fright" size="xl" active />}
        eyebrow="Stage Fright"
        title="Practice the interview before it counts."
        copy="Every interview is scored and stored, so you can watch specific weaknesses close over time."
        action={
          <Link
            href="/dashboard/stage-fright/new"
            className="bg-plum inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> New interview
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <Metric
            label="Interviews"
            value={String(summaries.length)}
            note={`Average score ${averageScore}%`}
          />
        </Panel>
        <Panel className="p-5">
          <Metric
            label="Competencies"
            value={`${behavioral.competenciesCovered} / ${COMPETENCIES.length}`}
            note="Covered by a real answer"
          />
        </Panel>
        <Panel className="p-5">
          <Metric
            label="Technical"
            value={technical.attempts ? `${technical.coverage}%` : "—"}
            note={
              technical.attempts
                ? `${technical.attempts} coding or design interview${technical.attempts === 1 ? "" : "s"}`
                : "No coding interview yet"
            }
          />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Panel className="overflow-hidden">
          <div className="border-iron/70 border-b p-5">
            <p className="font-semibold">Past interviews</p>
          </div>
          {summaries.map((summary) => (
            <Link
              key={summary.id}
              href={`/dashboard/stage-fright/report/${summary.id}`}
              className="group border-iron/65 hover:bg-linen/[.025] flex items-center gap-4 border-t p-5 first:border-t-0"
            >
              <span className="bg-plum/10 text-plum flex size-9 shrink-0 items-center justify-center rounded-lg">
                {summary.modality === "voice" ? (
                  <Mic className="size-4" />
                ) : (
                  <Type className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {INTERVIEW_PLANS[summary.type].label} · {summary.roleLabel}
                </p>
                <p className="text-dust mt-1 text-xs">
                  {new Date(summary.completedAt).toLocaleDateString()}
                </p>
              </div>
              <span className="font-mono text-sm">{summary.overallScore}%</span>
              <ArrowRight className="text-dust size-4" />
            </Link>
          ))}
        </Panel>

        <Panel className="p-5">
          <p className="font-semibold">Competency coverage</p>
          <p className="text-dust mt-1 text-xs">
            Earned by actually answering a question on it.
          </p>
          <div className="mt-5 space-y-2">
            {COMPETENCIES.map((competency) => (
              <div
                key={competency}
                className="flex items-center justify-between text-xs"
              >
                <span
                  className={
                    covered.has(competency) ? "text-canvas" : "text-dust"
                  }
                >
                  {COMPETENCY_LABELS[competency]}
                </span>
                <span
                  className={
                    covered.has(competency) ? "text-sage" : "text-dust"
                  }
                >
                  {covered.has(competency) ? "Covered" : "Not yet"}
                </span>
              </div>
            ))}
          </div>
          {behavioral.uncovered[0] && (
            <Link
              href="/dashboard/stage-fright/new?type=behavioral"
              className="text-plum mt-6 flex items-center gap-2 text-xs font-semibold"
            >
              Practice{" "}
              {COMPETENCY_LABELS[behavioral.uncovered[0]].toLowerCase()}
              <ArrowRight className="size-3" />
            </Link>
          )}
        </Panel>
      </div>
    </div>
  );
}
