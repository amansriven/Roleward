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
      <div className="border-iron bg-workshop/70 rounded-2xl border py-20 text-center">
        <BriefcaseBusiness className="text-dust mx-auto size-7" />
        <h2 className="mt-5 text-xl font-semibold">Add the role you want.</h2>
        <p className="text-canvas mx-auto mt-2 max-w-md text-sm">
          Sweet+ will connect its requirements to your résumé, coding, and
          stories.
        </p>
        <Link
          href="/dashboard/applications/new"
          className="bg-amber text-night mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <Plus className="size-4" /> Add application
        </Link>
      </div>
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

  return (
    <div className="space-y-3">
      {ranked.map(({ app, readiness, urgency }) => {
        const isActive = app.id === active?.id;
        const settled = isSettled(app.status);
        const covered = app.requirements.filter(
          (item) => item.matchStrength === "strong",
        ).length;
        return (
          <div
            key={app.id}
            className={cn(
              "border-iron bg-workshop/70 rounded-2xl border p-5",
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
  );
}
