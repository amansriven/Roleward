"use client";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChefHat,
  Code2,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel, ReadinessCard, TaskRow } from "./dashboard-ui";
import {
  applicationReadiness,
  getActiveApplication,
  loadWorkspace,
  recommendActions,
  type WorkspaceSnapshot,
} from "@/modules/workspace/repository";

const actionColors = {
  resume: "bg-copper",
  coding: "bg-cobalt",
  stories: "bg-plum",
} as const;
export function LiveDashboard() {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  useEffect(() => {
    queueMicrotask(() => setWorkspace(loadWorkspace(localStorage)));
  }, []);
  if (!workspace)
    return (
      <div className="text-dust py-24 text-center text-sm">
        Opening your workspace…
      </div>
    );
  const app = getActiveApplication(workspace);
  const actions = recommendActions(workspace);
  const primary = actions[0];
  const readiness = app ? applicationReadiness(app) : null;
  return (
    <div className="space-y-8">
      <div>
        <p className="text-canvas text-sm">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
          Here’s the one thing to do next.
        </h1>
      </div>
      {primary && (
        <section className="bg-workshop/80 border-amber/25 relative overflow-hidden rounded-[22px] border p-6 shadow-[0_18px_60px_rgba(0,0,0,.18)] sm:p-8">
          <div className="relative max-w-2xl">
            <div className="text-amber flex items-center gap-2">
              <Sparkles className="size-4" />
              <p className="font-mono text-[10px] tracking-[.1em] uppercase">
                Recommended for you
              </p>
            </div>
            <h2 className="mt-5 text-2xl font-semibold sm:text-3xl">
              {primary.title}
            </h2>
            <p className="text-canvas mt-3 text-sm leading-6">
              {primary.detail}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href={primary.href}
                className="bg-amber text-night inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
              >
                Continue <ArrowRight className="size-4" />
              </Link>
              <span className="text-dust text-xs">
                About {primary.minutes} minutes
              </span>
            </div>
          </div>
        </section>
      )}
      {actions.length > 1 && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">
            Then, when you’re ready
          </h2>
          <p className="text-dust mb-4 text-xs">
            A short plan, ordered by impact.
          </p>
          <Panel className="overflow-hidden">
            {actions.slice(1).map((action, index) => (
              <TaskRow
                key={action.id}
                number={String(index + 1)}
                title={action.title}
                meta={action.detail}
                time={`${action.minutes} min`}
                href={action.href}
                color={actionColors[action.area]}
              />
            ))}
          </Panel>
        </section>
      )}
      {app && readiness && (
        <section>
          <details className="group">
            <summary className="flex list-none items-center justify-between py-2 [&::-webkit-details-marker]:hidden">
              <div>
                <h2 className="text-lg font-semibold">How ready am I?</h2>
                <p className="text-dust mt-1 text-xs">
                  Each score links back to recorded activity.
                </p>
              </div>
              <span className="text-amber text-xs group-open:hidden">
                Show readiness
              </span>
              <span className="text-dust hidden text-xs group-open:block">
                Hide
              </span>
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                href="/dashboard/guru"
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
          </details>
        </section>
      )}
      <section className="border-iron/60 flex items-center justify-between gap-4 border-t pt-6">
        <div className="flex items-start gap-3">
          <BriefcaseBusiness className="text-amber mt-0.5 size-4" />
          <div>
            <p className="text-sm font-medium">
              {app
                ? `${app.companyName} · ${app.roleTitle}`
                : "No target application yet"}
            </p>
            <p className="text-dust mt-1 text-xs">
              {app
                ? `${app.requirements.length} confirmed requirements`
                : `Add a role when you’re ready.`}
            </p>
          </div>
        </div>
        <Link
          href={app ? "/dashboard/applications" : "/dashboard/applications/new"}
          className="text-amber text-xs font-semibold"
        >
          {app ? "Open application" : "Add application"}
        </Link>
      </section>
    </div>
  );
}
