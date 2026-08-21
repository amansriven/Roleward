"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  ChefHat,
  CheckCircle2,
  Code2,
  FileStack,
  Library,
  MessageSquareText,
  Mic2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { PageIntro, Panel, ReadinessCard, TaskRow } from "./dashboard-ui";
import {
  applicationReadiness,
  getActiveApplication,
  getActiveResumeVersion,
  loadWorkspace,
  recommendActions,
  workspaceUpdatedEvent,
  type WorkspaceSnapshot,
} from "@/modules/workspace/repository";

const actionColors = {
  resume: "bg-copper",
  coding: "bg-cobalt",
  stories: "bg-plum",
} as const;
export interface ZedHomeSnapshot {
  attempts: number;
  solved: number;
  recognitionRate: number | null;
  lastCompletedAt: string | null;
}

export function LiveDashboard({ zed }: { zed: ZedHomeSnapshot }) {
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

  const app = getActiveApplication(workspace);
  const resume = getActiveResumeVersion(workspace);
  const actions = recommendActions(workspace);
  const primary = actions[0];
  const readiness = app ? applicationReadiness(app, workspace) : null;
  const claims = workspace.evidence.flatMap((item) => item.claims);
  const confirmed = claims.filter(
    (claim) =>
      claim.verificationStatus === "confirmed" ||
      claim.verificationStatus === "corrected",
  ).length;
  const interviewAverage = workspace.interviewSummaries.length
    ? Math.round(
        workspace.interviewSummaries.reduce(
          (total, item) => total + item.overallScore,
          0,
        ) / workspace.interviewSummaries.length,
      )
    : null;
  const activities = [
    ...workspace.applications.map((item) => ({
      id: `app-${item.id}`,
      date: item.createdAt,
      title: `${item.companyName} added`,
      detail: item.roleTitle,
      href: `/dashboard/applications/${item.id}`,
      icon: BriefcaseBusiness,
    })),
    ...workspace.resumeVersions.map((item) => ({
      id: `resume-${item.id}`,
      date: item.updatedAt,
      title: `${item.name} updated`,
      detail: item.kind === "original" ? "Resume Kitchen" : "Named revision",
      href: "/dashboard/resume-kitchen/versions",
      icon: FileStack,
    })),
    ...workspace.interviewSummaries.map((item) => ({
      id: `interview-${item.id}`,
      date: item.completedAt,
      title: `${item.roleLabel} completed`,
      detail: `Stage Fright · ${item.overallScore}%`,
      href: "/dashboard/stage-fright",
      icon: Mic2,
    })),
    ...(zed.lastCompletedAt
      ? [
          {
            id: "zed-latest",
            date: zed.lastCompletedAt,
            title: "Coding practice completed",
            detail: `Zed · ${zed.solved} solved overall`,
            href: "/dashboard/zed/history",
            icon: Code2,
          },
        ]
      : []),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="space-y-10">
      <PageIntro
        eyebrow="Command center"
        title={
          workspace.candidateName
            ? `Welcome back, ${workspace.candidateName.split(" ")[0]}.`
            : "Your career workspace"
        }
        copy="A live view of your search, career evidence, resume work, technical practice, and interview preparation—connected in one place."
        action={
          <span className="border-sage/25 bg-sage/[.07] text-sage inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase">
            <span className="bg-sage size-1.5 rounded-full" /> Workspace synced
          </span>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(17rem,.55fr)]">
        {primary ? (
          <section className="roleward-card roleward-card-accent relative overflow-hidden rounded-[28px] p-6 sm:p-8">
            <div className="relative max-w-2xl">
              <div className="text-amber flex items-center gap-2">
                <Sparkles className="size-4" />
                <p className="font-mono text-[10px] tracking-[.1em] uppercase">
                  Highest-impact next step
                </p>
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">
                {primary.title}
              </h2>
              <p className="text-canvas mt-3 text-sm leading-6">
                {primary.detail}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={primary.href}
                  className="bg-amber text-night inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-[0_10px_28px_rgba(255,122,89,.18)]"
                >
                  Continue <ArrowRight className="size-4" />
                </Link>
                <span className="text-dust text-xs">
                  About {primary.minutes} minutes
                </span>
              </div>
            </div>
          </section>
        ) : (
          <CompleteState />
        )}
        <section className="roleward-card rounded-[24px] p-5 sm:p-6">
          <p className="section-label">Active target</p>
          {app ? (
            <>
              <h2 className="mt-4 text-xl font-semibold tracking-[-.03em]">
                {app.companyName}
              </h2>
              <p className="text-canvas mt-1 text-sm">{app.roleTitle}</p>
              {readiness && (
                <>
                  <div className="mt-6 flex items-end justify-between">
                    <span className="text-dust text-xs">
                      Application readiness
                    </span>
                    <span className="font-mono text-lg">
                      {readiness.application.score}%
                    </span>
                  </div>
                  <div className="bg-iron mt-2 h-1.5 rounded-full">
                    <div
                      className="bg-amber h-full rounded-full"
                      style={{ width: `${readiness.application.score}%` }}
                    />
                  </div>
                </>
              )}
              <Link
                href={`/dashboard/applications/${app.id}`}
                className="text-amber mt-6 inline-flex items-center gap-2 text-xs font-semibold"
              >
                Open workspace <ArrowRight className="size-3.5" />
              </Link>
            </>
          ) : (
            <>
              <p className="text-canvas mt-4 text-sm leading-6">
                Add a role to connect every preparation tool to one target.
              </p>
              <Link
                href="/dashboard/applications/new"
                className="text-amber mt-5 inline-flex items-center gap-2 text-xs font-semibold"
              >
                Add application <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}
        </section>
      </div>

      <section>
        <div className="mb-4">
          <p className="section-label">Workspace pulse</p>
          <h2 className="mt-2 text-xl font-semibold">
            Context from every product
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <PulseCard
            icon={<BriefcaseBusiness />}
            label="Applications"
            value={String(workspace.applications.length)}
            note={app ? `${app.companyName} active` : "No active target"}
            href="/dashboard/applications"
          />
          <PulseCard
            icon={<Library />}
            label="Evidence"
            value={`${confirmed}/${claims.length}`}
            note="Claims confirmed"
            href="/dashboard/evidence"
          />
          <PulseCard
            icon={<ChefHat />}
            label="Resume"
            value={String(workspace.resumeVersions.length)}
            note={resume?.name ?? "No version yet"}
            href="/dashboard/resume-kitchen"
          />
          <PulseCard
            icon={<Code2 />}
            label="Zed"
            value={`${zed.solved}/${zed.attempts}`}
            note={
              zed.recognitionRate === null
                ? "No practice yet"
                : `${zed.recognitionRate}% recognition`
            }
            href="/dashboard/zed"
          />
          <PulseCard
            icon={<Mic2 />}
            label="Stage Fright"
            value={interviewAverage === null ? "—" : `${interviewAverage}%`}
            note={`${workspace.interviewSummaries.length} completed sessions`}
            href="/dashboard/stage-fright"
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(19rem,.85fr)]">
        <section>
          <h2 className="text-lg font-semibold">Your plan</h2>
          <p className="text-dust mt-1 mb-4 text-xs">
            Ordered by impact across the whole workspace.
          </p>
          <Panel className="overflow-hidden">
            {actions.length > 1 ? (
              actions
                .slice(1)
                .map((action, index) => (
                  <TaskRow
                    key={action.id}
                    number={String(index + 1)}
                    title={action.title}
                    meta={action.detail}
                    time={`${action.minutes} min`}
                    href={action.href}
                    color={actionColors[action.area]}
                  />
                ))
            ) : (
              <div className="text-dust p-6 text-xs">
                Your next actions will appear as your workspace grows.
              </div>
            )}
          </Panel>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <p className="text-dust mt-1 mb-4 text-xs">
            The latest signals from across Roleward.
          </p>
          <Panel className="overflow-hidden">
            {activities.length ? (
              activities.map((activity) => (
                <ActivityRow key={activity.id} {...activity} />
              ))
            ) : (
              <div className="text-dust p-6 text-xs">
                Activity will collect here as you work.
              </div>
            )}
          </Panel>
        </section>
      </div>

      {app && readiness && (
        <section>
          <div className="mb-4">
            <p className="section-label">Target readiness</p>
            <h2 className="mt-2 text-xl font-semibold">
              How prepared you are for {app.companyName}
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <ReadinessCard
              icon={ChefHat}
              label="Resume"
              level={readiness.application.level.replace("_", " ")}
              value={readiness.application.score}
              color="text-copper"
              href="/dashboard/resume-kitchen"
              detail={readiness.application.explanation[0] ?? ""}
            />
            <ReadinessCard
              icon={Code2}
              label="Coding"
              level={readiness.technical.level.replace("_", " ")}
              value={readiness.technical.score}
              color="text-cobalt"
              href="/dashboard/zed"
              detail={readiness.technical.explanation[0] ?? ""}
            />
            <ReadinessCard
              icon={MessageSquareText}
              label="Stories"
              level={readiness.behavioral.level.replace("_", " ")}
              value={readiness.behavioral.score}
              color="text-plum"
              href="/dashboard/stage-fright"
              detail={readiness.behavioral.explanation[0] ?? ""}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function PulseCard({
  icon,
  label,
  value,
  note,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="roleward-card group hover:border-canvas/35 rounded-[20px] p-4 transition-all hover:-translate-y-0.5"
    >
      <div className="text-amber bg-amber/[.07] flex size-8 items-center justify-center rounded-lg [&>svg]:size-4">
        {icon}
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold tracking-[-.04em]">{value}</p>
        <ArrowRight className="text-dust size-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
      <p className="text-canvas mt-1 text-xs font-medium">{label}</p>
      <p className="text-dust mt-1 truncate text-[10px]">{note}</p>
    </Link>
  );
}
function ActivityRow({
  date,
  title,
  detail,
  href,
  icon: Icon,
}: {
  date: string;
  title: string;
  detail: string;
  href: string;
  icon: typeof BriefcaseBusiness;
}) {
  return (
    <Link
      href={href}
      className="border-iron/65 hover:bg-linen/[.025] flex items-center gap-3 border-t px-4 py-3.5 first:border-t-0"
    >
      <span className="border-iron bg-raised text-amber flex size-8 shrink-0 items-center justify-center rounded-lg border">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{title}</p>
        <p className="text-dust mt-1 truncate text-[10px]">{detail}</p>
      </div>
      <time className="text-dust shrink-0 font-mono text-[9px]">
        {new Date(date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
      </time>
    </Link>
  );
}
function CompleteState() {
  return (
    <section className="roleward-card roleward-card-accent rounded-[28px] p-8">
      <CheckCircle2 className="text-sage size-5" />
      <h2 className="mt-4 text-2xl font-semibold">
        Your workspace is in good shape.
      </h2>
      <p className="text-canvas mt-2 text-sm">
        Keep your target and practice signals current.
      </p>
    </section>
  );
}
