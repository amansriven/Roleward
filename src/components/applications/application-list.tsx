"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Plus,
  Search,
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PipelineFilter>("all");
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
      <div className="space-y-8">
        <PipelineControls
          applications={workspace.applications}
          filter={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
        />
        <section className="border-iron/80 border-y py-20 text-center">
          <BriefcaseBusiness className="text-amber mx-auto size-6" />
          <h2 className="mt-5 text-xl font-semibold">No applications yet</h2>
          <p className="text-canvas mx-auto mt-2 max-w-lg text-sm leading-6">
            Paste a job link or add the role manually. Roleward will connect it
            to your resume evidence and preparation plan.
          </p>
          <Link
            href="/dashboard/applications/new"
            className="bg-amber text-night mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
          >
            <Plus className="size-4" /> Add application
          </Link>
        </section>
      </div>
    );

  const active = getActiveApplication(workspace);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleApplications = workspace.applications.filter((application) => {
    const matchesQuery =
      !normalizedQuery ||
      `${application.companyName} ${application.roleTitle}`
        .toLowerCase()
        .includes(normalizedQuery);
    return matchesQuery && matchesPipelineFilter(application.status, filter);
  });
  const ranked = visibleApplications
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

  if (!ranked.length)
    return (
      <div className="space-y-8">
        <PipelineControls
          applications={workspace.applications}
          filter={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
        />
        <p className="border-iron/80 text-dust border-y py-16 text-center text-sm">
          No applications match this view.
        </p>
      </div>
    );
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
      <PipelineControls
        applications={workspace.applications}
        filter={filter}
        onFilter={setFilter}
        query={query}
        onQuery={setQuery}
      />
      <section>
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="text-lg font-semibold">Focus application</h2>
          <p className="text-dust text-xs">Your current preparation target</p>
        </div>
        <div className="roleward-card roleward-card-accent rounded-[28px] p-6 sm:p-8">
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
          <div className="roleward-empty rounded-[24px] px-6 py-12 text-center">
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
                    "roleward-card rounded-[22px] p-5",
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

type PipelineFilter = "all" | "in_progress" | "interviewing" | "closed";

function matchesPipelineFilter(
  status: WorkspaceSnapshot["applications"][number]["status"],
  filter: PipelineFilter,
) {
  if (filter === "all") return true;
  if (filter === "interviewing") return status === "interviewing";
  if (filter === "closed") return status === "closed" || status === "offer";
  return ["saved", "preparing", "applied", "assessment"].includes(status);
}

function PipelineControls({
  applications,
  filter,
  onFilter,
  query,
  onQuery,
}: {
  applications: WorkspaceSnapshot["applications"];
  filter: PipelineFilter;
  onFilter: (filter: PipelineFilter) => void;
  query: string;
  onQuery: (query: string) => void;
}) {
  const filters: { value: PipelineFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "in_progress", label: "In progress" },
    { value: "interviewing", label: "Interviewing" },
    { value: "closed", label: "Closed" },
  ];
  return (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div className="flex scrollbar-none gap-2 overflow-x-auto">
        {filters.map((item) => {
          const count = applications.filter((application) =>
            matchesPipelineFilter(application.status, item.value),
          ).length;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onFilter(item.value)}
              className={cn(
                "border-iron flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs",
                filter === item.value
                  ? "border-amber/60 text-linen"
                  : "text-dust hover:text-canvas",
              )}
            >
              {item.label}{" "}
              <span className="font-mono text-[10px]">{count}</span>
            </button>
          );
        })}
      </div>
      <label className="border-iron bg-night/35 focus-within:border-canvas/50 flex min-h-11 items-center gap-3 rounded-xl border px-4 lg:w-80">
        <Search className="text-dust size-4" />
        <span className="sr-only">Search applications</span>
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search company or role…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
    </div>
  );
}
