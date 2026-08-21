"use client";

import {
  CalendarClock,
  CheckCircle2,
  CircleDot,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { STATUS_LABELS } from "@/modules/applications/timeline";
import {
  applicationReadiness,
  loadWorkspace,
  workspaceUpdatedEvent,
  type WorkspaceSnapshot,
} from "@/modules/workspace/repository";

function useApplicationWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  useEffect(() => {
    const refresh = () => setWorkspace(loadWorkspace(localStorage));
    queueMicrotask(refresh);
    window.addEventListener(workspaceUpdatedEvent, refresh);
    return () => window.removeEventListener(workspaceUpdatedEvent, refresh);
  }, []);
  return workspace;
}

function EmptyApplications() {
  return (
    <section className="border-iron/80 border-y py-16 text-center">
      <p className="text-canvas text-sm">
        Add an application to build this view.
      </p>
      <Link
        href="/dashboard/applications/new"
        className="text-amber mt-4 inline-flex text-sm font-semibold"
      >
        Add application
      </Link>
    </section>
  );
}

export function ApplicationTimeline() {
  const workspace = useApplicationWorkspace();
  const [renderedAt] = useState(() => Date.now());
  const events = useMemo(() => {
    if (!workspace) return [];
    return workspace.applications
      .flatMap((application) => [
        {
          id: `${application.id}-created`,
          date: application.createdAt,
          label: "Application added",
          detail: `${application.companyName} · ${application.roleTitle}`,
          applicationId: application.id,
          kind: "recorded" as const,
        },
        ...(application.deadline
          ? [
              {
                id: `${application.id}-deadline`,
                date: application.deadline,
                label: "Application deadline",
                detail: `${application.companyName} · ${application.roleTitle}`,
                applicationId: application.id,
                kind: "upcoming" as const,
              },
            ]
          : []),
        ...(application.interviewDate
          ? [
              {
                id: `${application.id}-interview`,
                date: application.interviewDate,
                label: "Interview",
                detail: `${application.companyName} · ${application.roleTitle}`,
                applicationId: application.id,
                kind: "upcoming" as const,
              },
            ]
          : []),
      ])
      .sort(
        (left, right) =>
          new Date(left.date).getTime() - new Date(right.date).getTime(),
      );
  }, [workspace]);

  if (!workspace)
    return (
      <p className="text-dust py-16 text-center text-sm">Opening timeline…</p>
    );
  if (!workspace.applications.length) return <EmptyApplications />;

  return (
    <div>
      <div>
        <p className="section-label">Timeline</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em]">
          Dates that shape your search.
        </h2>
        <p className="text-canvas mt-2 text-sm leading-6">
          Deadlines and interviews across every application, in one sequence.
        </p>
      </div>
      <div className="border-iron/80 mt-8 border-t">
        {events.map((event) => {
          const date = new Date(event.date);
          const past = date.getTime() < renderedAt;
          return (
            <Link
              key={event.id}
              href={`/dashboard/applications/${event.applicationId}`}
              className="group border-iron/70 grid gap-3 border-b py-5 sm:grid-cols-[8rem_2rem_1fr_auto] sm:items-center"
            >
              <time className="text-dust font-mono text-[10px] uppercase">
                {date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              <span className="border-iron bg-raised flex size-7 items-center justify-center rounded-full border">
                {event.kind === "upcoming" && !past ? (
                  <CalendarClock className="text-amber size-3.5" />
                ) : (
                  <CircleDot className="text-dust size-3.5" />
                )}
              </span>
              <div>
                <p className="group-hover:text-amber text-sm font-semibold transition">
                  {event.label}
                </p>
                <p className="text-dust mt-1 text-xs">{event.detail}</p>
              </div>
              <span className="text-dust text-[10px] uppercase">
                {past ? "Past" : "Upcoming"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ApplicationProgress() {
  const workspace = useApplicationWorkspace();

  if (!workspace)
    return (
      <p className="text-dust py-16 text-center text-sm">Measuring progress…</p>
    );
  if (!workspace.applications.length) return <EmptyApplications />;

  const scores = workspace.applications.map(
    (application) =>
      applicationReadiness(application, workspace).application.score,
  );
  const average = Math.round(
    scores.reduce((total, score) => total + score, 0) / scores.length,
  );
  const requirements = workspace.applications.flatMap(
    (item) => item.requirements,
  );
  const covered = requirements.filter(
    (item) => item.matchStrength === "strong",
  ).length;
  const interviews = workspace.applications.filter((item) =>
    ["interviewing", "offer"].includes(item.status),
  ).length;
  const statuses = Object.entries(
    workspace.applications.reduce<Record<string, number>>(
      (counts, application) => {
        counts[application.status] = (counts[application.status] ?? 0) + 1;
        return counts;
      },
      {},
    ),
  );

  return (
    <div className="space-y-10">
      <div>
        <p className="section-label">Progress</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em]">
          A useful view of momentum.
        </h2>
        <p className="text-canvas mt-2 text-sm leading-6">
          Preparation quality and pipeline movement, without vanity metrics.
        </p>
      </div>

      <section className="border-iron/80 grid border-y sm:grid-cols-3">
        <ProgressMetric
          label="Applications"
          value={String(workspace.applications.length)}
          detail="Roles currently tracked"
        />
        <ProgressMetric
          label="Average readiness"
          value={`${average}%`}
          detail="Evidence matched to requirements"
        />
        <ProgressMetric
          label="Interview stage"
          value={String(interviews)}
          detail="Interviewing or offer"
        />
      </section>

      <section className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="text-amber size-4" />
            <h3 className="font-semibold">Requirement coverage</h3>
          </div>
          <div className="mt-6 flex items-end justify-between">
            <p className="text-4xl font-semibold tracking-[-.05em]">
              {covered}
              <span className="text-dust text-lg">
                {" "}
                / {requirements.length}
              </span>
            </p>
            <p className="text-dust text-xs">strong evidence matches</p>
          </div>
          <div className="bg-iron mt-4 h-1.5 rounded-full">
            <div
              className="bg-amber h-full rounded-full"
              style={{
                width: `${requirements.length ? Math.round((covered / requirements.length) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-amber size-4" />
            <h3 className="font-semibold">Pipeline distribution</h3>
          </div>
          <div className="border-iron/80 mt-5 divide-y divide-[var(--iron)] border-y">
            {statuses.map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between py-3 text-sm"
              >
                <span className="text-canvas">
                  {STATUS_LABELS[status as keyof typeof STATUS_LABELS] ??
                    status}
                </span>
                <span className="font-mono text-xs">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProgressMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border-iron/80 px-0 py-6 sm:border-l sm:px-6 sm:first:border-l-0 sm:first:pl-0">
      <p className="text-dust text-[10px] tracking-[.08em] uppercase">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-.04em]">{value}</p>
      <p className="text-dust mt-1 text-xs">{detail}</p>
    </div>
  );
}
