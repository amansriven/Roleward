"use client";
import { ArrowRight, BriefcaseBusiness, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  applicationReadiness,
  getActiveApplication,
  loadWorkspace,
  setActiveApplication,
  workspaceUpdatedEvent,
  type WorkspaceSnapshot,
} from "@/modules/workspace/repository";
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
      <p className="text-dust py-20 text-center text-sm">
        Loading applications…
      </p>
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
  return (
    <div className="space-y-3">
      {workspace.applications.map((app) => {
        const ready = applicationReadiness(app);
        const isActive = app.id === active?.id;
        return (
          <button
            key={app.id}
            onClick={() => {
              setActiveApplication(localStorage, app.id);
              setWorkspace(loadWorkspace(localStorage));
            }}
            className={`border-iron bg-workshop/70 flex w-full items-center gap-4 rounded-2xl border p-5 text-left ${isActive ? "border-amber/45" : "hover:border-canvas/40"}`}
          >
            <span className="bg-amber/10 text-amber flex size-10 items-center justify-center rounded-xl">
              <BriefcaseBusiness className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">
                  {app.companyName} · {app.roleTitle}
                </p>
                {isActive && (
                  <span className="text-sage text-[9px] uppercase">Active</span>
                )}
              </div>
              <p className="text-dust mt-1 text-xs">
                {app.requirements.length} requirements ·{" "}
                {ready.application.score}% readiness
              </p>
            </div>
            <ArrowRight className="text-dust size-4" />
          </button>
        );
      })}
    </div>
  );
}
