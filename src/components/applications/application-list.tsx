"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  assessUrgency,
  isSettled,
  STATUS_LABELS,
} from "@/modules/applications/timeline";
import {
  applicationReadiness,
  getActiveApplication,
  loadWorkspace,
  setActiveApplication,
  workspaceUpdatedEvent,
  type WorkspaceSnapshot,
} from "@/modules/workspace/repository";

/**
 * Applications ordered by what needs attention, not by when they were added.
 *
 * The list previously showed a requirement count and a readiness percentage in
 * insertion order, which is the one ordering that never answers "what should I
 * do now" — the whole reason someone opens this page.
 */
export function ApplicationList() {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  useEffect(() => {
    const refresh = () => setWorkspace(loadWorkspace(localStorage));
    queueMicrotask(refresh);
    window.addEventListener(workspaceUpdatedEvent, refresh);
    return () => window.removeEventListener(workspaceUpdatedEvent, refresh);
  }, []);

  if (!workspace)
    return (
      <div className="text-dust py-24 text-center text-sm">
        Opening your workspace…
      </div>
    );

  if (!workspace.applications.length)
    return (
      <section className="backstage-empty rounded-[28px] p-5 sm:p-10">
        <div className="border-iron/70 flex min-h-[360px] flex-col items-center justify-center rounded-[22px] border border-dashed px-6 py-16 text-center">
          <span className="bg-raised text-amber flex size-14 items-center justify-center rounded-2xl">
            <BriefcaseBusiness className="size-6" />
          </span>
          <h2 className="mt-6 text-xl font-semibold">Add your first role</h2>
          <p className="text-canvas mx-auto mt-2 max-w-lg text-sm leading-6">
            Backstage will connect the job requirements to the right résumé,
            coding practice, and interview plan—then keep the original inputs
            available whenever you need them.
          </p>
          <Link
            href="/dashboard/applications/new"
            className="bg-amber text-night mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
          >
            <Plus className="size-4" /> Add application
          </Link>
        </div>
      </section>
    );

  const active = getActiveApplication(workspace);
  const ranked = workspace.applications
    .map((app) => {
      const readiness = applicationReadiness(app, workspace);
      return {
        app,
        readiness,
        urgency: assessUrgency({
          status: app.status,
          deadline: app.deadline,
          interviewDate: app.interviewDate,
          readinessScore: readiness.application.score,
        }),
      };
    })
    .sort((left, right) => right.urgency.score - left.urgency.score);
  const focus = (
    active
      ? (ranked.find(({ app }) => app.id === active.id) ?? ranked[0])
      : ranked[0]
  )!;
  const remaining = ranked.filter(({ app }) => app.id !== focus.app.id);
  const focusCovered = focus.app.requirements.filter(
    (item) => item.matchStrength === "strong",
  ).length;

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="text-lg font-semibold">Focus application</h2>
          <p className="text-dust text-xs">Your current preparation target</p>
        </div>
        <div className="backstage-card backstage-card-accent rounded-[28px] p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="bg-amber/12 text-amber ring-amber/15 flex size-14 shrink-0 items-center justify-center rounded-2xl ring-1">
              <BriefcaseBusiness className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-xl font-semibold sm:text-2xl">
                  {focus.app.companyName} · {focus.app.roleTitle}
                </h3>
                <span className="bg-amber text-night rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase">
                  Active
                </span>
                <span className="border-iron text-dust rounded-full border px-2.5 py-1 text-[10px]">
                  {STATUS_LABELS[focus.app.status]}
                </span>
              </div>
              <p className="text-canvas mt-2 text-sm">
                {focus.urgency.headline ||
                  `${focusCovered} of ${focus.app.requirements.length} requirements have strong evidence`}
              </p>
              <div className="mt-5 flex max-w-xl items-center gap-3">
                <div className="bg-iron h-1.5 flex-1 rounded-full">
                  <div
                    className="bg-amber h-full rounded-full"
                    style={{ width: `${focus.readiness.application.score}%` }}
                  />
                </div>
                <span className="text-dust font-mono text-[11px]">
                  {focus.readiness.application.score}% ready
                </span>
              </div>
            </div>
            <Link
              href={`/dashboard/applications/${focus.app.id}`}
              className="text-amber inline-flex shrink-0 items-center gap-2 text-sm font-semibold"
            >
              Open application <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">All applications</h2>
          <p className="text-dust mt-1 text-xs">
            Ordered by deadlines and preparation gaps
          </p>
        </div>
        {remaining.length === 0 ? (
          <div className="backstage-empty rounded-[24px] px-6 py-12 text-center">
            <p className="text-canvas text-sm">No other applications yet.</p>
            <Link
              href="/dashboard/applications/new"
              className="text-amber mt-3 inline-flex items-center gap-1.5 text-sm font-semibold"
            >
              <Plus className="size-4" /> Add another role
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {remaining.map(({ app, readiness, urgency }) => {
              const isActive = app.id === active?.id;
              const settled = isSettled(app.status);
              const covered = app.requirements.filter(
                (item) => item.matchStrength === "strong",
              ).length;
              return (
                <div
                  key={app.id}
                  className={cn(
                    "backstage-card rounded-[22px] p-5",
                    isActive && "border-amber/45",
                    settled && "opacity-60",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span className="bg-amber/10 text-amber flex size-10 shrink-0 items-center justify-center rounded-xl">
                      <BriefcaseBusiness className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {app.companyName} · {app.roleTitle}
                        </p>
                        <span className="border-iron text-dust rounded-full border px-2 py-0.5 text-[10px]">
                          {STATUS_LABELS[app.status]}
                        </span>
                        {isActive && (
                          <span className="text-sage text-[9px] uppercase">
                            Active
                          </span>
                        )}
                      </div>

                      {urgency.headline && (
                        <p
                          className={cn(
                            "mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold",
                            urgency.score > 45 ? "text-copper" : "text-canvas",
                          )}
                        >
                          <CalendarClock className="size-3" />
                          {urgency.headline}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-3">
                        <div className="bg-iron h-1.5 flex-1 rounded-full">
                          <div
                            className="bg-amber h-full rounded-full"
                            style={{ width: `${readiness.application.score}%` }}
                          />
                        </div>
                        <span className="text-dust shrink-0 font-mono text-[10px]">
                          {readiness.application.score}%
                        </span>
                      </div>
                      <p className="text-dust mt-1.5 text-[10px]">
                        {covered} of {app.requirements.length} requirements have
                        evidence
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Link
                        href={`/dashboard/applications/${app.id}`}
                        className="text-canvas hover:text-linen inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        Open <ArrowRight className="size-3" />
                      </Link>
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveApplication(localStorage, app.id);
                            setWorkspace(loadWorkspace(localStorage));
                          }}
                          className="text-dust hover:text-canvas text-[11px]"
                        >
                          Make active
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
