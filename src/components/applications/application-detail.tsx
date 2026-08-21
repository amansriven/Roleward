"use client";

import {
  ArrowLeft,
  Calendar,
  Check,
  CircleDot,
  ExternalLink,
  Target,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  assessUrgency,
  describeCountdown,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@/modules/applications/timeline";
import type { ReadinessDimension } from "@/modules/readiness/model";
import {
  applicationReadiness,
  loadWorkspace,
  updateApplication,
  workspaceUpdatedEvent,
  type StoredApplication,
  type WorkspaceSnapshot,
} from "@/modules/workspace/repository";

/**
 * One application, in full.
 *
 * There was no detail view at all: the list was the whole feature, so a
 * candidate could see a readiness percentage but never what it was made of or
 * what to do about it.
 */
export function ApplicationDetail({ id }: { id: string }) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  useEffect(() => {
    const refresh = () => setWorkspace(loadWorkspace(localStorage));
    queueMicrotask(refresh);
    window.addEventListener(workspaceUpdatedEvent, refresh);
    return () => window.removeEventListener(workspaceUpdatedEvent, refresh);
  }, []);

  if (!workspace)
    return <div className="text-dust py-24 text-center text-sm">Opening…</div>;

  const application = workspace.applications.find((item) => item.id === id);
  if (!application)
    return (
      <div className="roleward-card rounded-[22px] py-20 text-center">
        <p className="text-sm font-semibold">That application is not here.</p>
        <Link
          href="/dashboard/applications"
          className="text-canvas mt-3 inline-block text-xs"
        >
          Back to applications
        </Link>
      </div>
    );

  return <Detail application={application} workspace={workspace} />;
}

function Detail({
  application,
  workspace,
}: {
  application: StoredApplication;
  workspace: WorkspaceSnapshot;
}) {
  const readiness = applicationReadiness(application, workspace);
  const urgency = assessUrgency({
    status: application.status,
    deadline: application.deadline,
    interviewDate: application.interviewDate,
    readinessScore: readiness.application.score,
  });

  const claimsById = new Map(
    workspace.evidence.flatMap((item) =>
      item.claims.map((claim) => [claim.id, { claim, item }] as const),
    ),
  );

  const required = application.requirements.filter(
    (item) => item.importance === "required",
  );
  const gaps = required.filter((item) => item.matchStrength !== "strong");

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/applications"
        className="text-dust hover:text-canvas flex items-center gap-2 text-xs"
      >
        <ArrowLeft className="size-3.5" /> All applications
      </Link>

      <header className="roleward-card roleward-card-accent flex flex-wrap items-start justify-between gap-4 rounded-[24px] p-6 sm:p-7">
        <div className="min-w-0">
          <p className="section-label">Application workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em]">
            {application.companyName}
          </h1>
          <p className="text-canvas mt-1 text-sm">{application.roleTitle}</p>
          {application.sourceUrl && (
            <a
              href={application.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-dust hover:text-canvas mt-2 inline-flex items-center gap-1.5 text-[11px]"
            >
              Original posting <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        {urgency.headline && (
          <span className="border-copper/40 bg-copper/10 text-copper rounded-full border px-3 py-1 text-[11px] font-semibold">
            {urgency.headline}
          </span>
        )}
      </header>

      <section className="roleward-card rounded-[22px] p-5 sm:p-6">
        <p className="section-label">Status</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() =>
                updateApplication(localStorage, application.id, { status })
              }
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition",
                application.status === status
                  ? "border-amber bg-amber/10 text-linen"
                  : "border-iron text-canvas hover:text-linen",
              )}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <DateField
            label="Application deadline"
            value={application.deadline ?? ""}
            note={describeCountdown(urgency.daysToDeadline, "Deadline")}
            onChange={(value) =>
              updateApplication(localStorage, application.id, {
                deadline: value || undefined,
              })
            }
          />
          <DateField
            label="Interview date"
            value={application.interviewDate ?? ""}
            note={describeCountdown(urgency.daysToInterview, "Interview")}
            onChange={(value) =>
              updateApplication(localStorage, application.id, {
                interviewDate: value || undefined,
              })
            }
          />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Dimension label="Application" dimension={readiness.application} />
        <Dimension label="Technical" dimension={readiness.technical} />
        <Dimension label="Behavioral" dimension={readiness.behavioral} />
      </div>

      {gaps.length > 0 && (
        <section className="border-copper/30 bg-copper/[.04] rounded-2xl border p-5">
          <div className="flex items-center gap-2">
            <Target className="text-copper size-4" />
            <p className="text-sm font-semibold">
              {gaps.length} required {gaps.length === 1 ? "gap" : "gaps"} before
              this is ready
            </p>
          </div>
          <p className="text-dust mt-2 text-xs leading-5">
            These are requirements the posting calls essential and your
            confirmed evidence does not answer. Worth knowing now rather than in
            the room.
          </p>
          <Link
            href="/dashboard/resume-kitchen"
            className="text-copper mt-3 inline-block text-xs font-semibold"
          >
            Work on these in Resume Kitchen →
          </Link>
        </section>
      )}

      <section className="roleward-card overflow-hidden rounded-[22px]">
        <div className="border-iron/70 border-b p-5">
          <p className="font-semibold">Requirements</p>
          <p className="text-dust mt-1 text-xs">
            Read from the posting, matched against evidence you confirmed.
          </p>
        </div>
        {application.requirements.map((requirement) => {
          const supporting = requirement.supportingClaimIds
            .map((claimId) => claimsById.get(claimId))
            .filter(Boolean);
          return (
            <div
              key={requirement.id}
              className="border-iron/60 border-t p-5 first:border-t-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm">{requirement.content}</p>
                  <p className="text-dust mt-1 text-[10px] capitalize">
                    {requirement.category} · {requirement.importance}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 text-[11px] font-semibold",
                    requirement.matchStrength === "strong" && "text-sage",
                    requirement.matchStrength === "weak" && "text-copper",
                    requirement.matchStrength === "none" && "text-dust",
                  )}
                >
                  {requirement.matchStrength === "strong" ? (
                    <Check className="size-3" />
                  ) : requirement.matchStrength === "none" ? (
                    <X className="size-3" />
                  ) : (
                    <CircleDot className="size-3" />
                  )}
                  {requirement.matchStrength === "strong"
                    ? "Evidence"
                    : requirement.matchStrength === "weak"
                      ? "Partial"
                      : "None"}
                </span>
              </div>
              {supporting.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {supporting.map((entry) => (
                    <li
                      key={entry!.claim.id}
                      className="text-canvas text-[11px] leading-5"
                    >
                      · {entry!.claim.content}{" "}
                      <span className="text-dust">({entry!.item.title})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function DateField({
  label,
  value,
  note,
  onChange,
}: {
  label: string;
  value: string;
  note: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-dust flex items-center gap-1.5 text-[11px]">
        <Calendar className="size-3" />
        {label}
      </span>
      <input
        type="date"
        value={value.slice(0, 10)}
        onChange={(event) => onChange(event.target.value)}
        className="border-iron bg-night/40 text-canvas mt-2 w-full rounded-lg border px-3 py-2 text-xs outline-none"
      />
      {note && (
        <span className="text-dust mt-1.5 block text-[10px]">{note}</span>
      )}
    </label>
  );
}

function Dimension({
  label,
  dimension,
}: {
  label: string;
  dimension: ReadinessDimension;
}) {
  return (
    <section className="roleward-card rounded-[22px] p-5">
      <div className="flex items-baseline justify-between">
        <p className="section-label">{label}</p>
        <p className="font-mono text-lg font-semibold">{dimension.score}%</p>
      </div>
      <div className="bg-iron mt-3 h-1.5 rounded-full">
        <div
          className="bg-amber h-full rounded-full"
          style={{ width: `${dimension.score}%` }}
        />
      </div>
      <ul className="mt-4 space-y-1.5">
        {dimension.explanation.map((line) => (
          <li key={line} className="text-dust text-[11px] leading-5">
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
