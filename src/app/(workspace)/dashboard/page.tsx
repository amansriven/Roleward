import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  ChefHat,
  Code2,
  Flame,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  Panel,
  ReadinessCard,
  TaskRow,
} from "@/components/workspace/dashboard-ui";

export default function DashboardPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="section-label">Saturday, August 15</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
            Good morning, Aman.
          </h1>
          <p className="text-canvas mt-2 text-sm">
            Three focused steps will move your Stripe application forward today.
          </p>
        </div>
        <div className="text-canvas flex items-center gap-2 text-xs">
          <Flame className="text-amber size-4" />
          <strong className="text-linen">4 day</strong> preparation rhythm
        </div>
      </div>
      <Panel className="border-amber/35 relative overflow-hidden bg-[linear-gradient(120deg,rgba(232,166,75,.12),rgba(33,30,26,.9)_56%)] p-6 sm:p-7">
        <Sparkles className="text-amber absolute top-6 right-6 size-5" />
        <p className="text-amber font-mono text-[10px] tracking-[.1em] uppercase">
          Best next action
        </p>
        <div className="mt-4 max-w-2xl">
          <h2 className="text-xl font-semibold sm:text-2xl">
            Strengthen your API performance bullet
          </h2>
          <p className="text-canvas mt-2 text-sm leading-6">
            Stripe asks for scalable backend experience. You have matching
            project evidence, but the outcome is missing from your résumé.
          </p>
          <Link
            href="/dashboard/resume-kitchen"
            className="bg-amber text-night mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold"
          >
            Open in Resume Kitchen <ArrowRight className="size-4" />
          </Link>
        </div>
      </Panel>
      <div className="grid gap-4 md:grid-cols-3">
        <ReadinessCard
          icon={ChefHat}
          label="Application readiness"
          level="Nearly ready"
          value={78}
          color="text-copper"
          href="/dashboard/resume-kitchen"
          detail="2 requirements need stronger evidence"
        />
        <ReadinessCard
          icon={Code2}
          label="Technical readiness"
          level="Developing"
          value={62}
          color="text-cobalt"
          href="/dashboard/guru"
          detail="Graph traversal is your highest-value gap"
        />
        <ReadinessCard
          icon={MessageSquareText}
          label="Behavioral readiness"
          level="Nearly ready"
          value={74}
          color="text-plum"
          href="/dashboard/stage-fright"
          detail="Conflict and failure stories need rehearsal"
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
        <Panel>
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="font-semibold">Today’s route</p>
              <p className="text-dust mt-1 text-xs">
                About 55 minutes · ordered by impact
              </p>
            </div>
            <span className="text-sage text-xs">0 of 3 complete</span>
          </div>
          <TaskRow
            number="01"
            title="Revise API performance bullet"
            meta="Resume Kitchen · Stripe requirement"
            time="10 min"
            href="/dashboard/resume-kitchen"
            color="bg-copper"
          />
          <TaskRow
            number="02"
            title="Practice Number of Islands"
            meta="Guru · Graph traversal"
            time="30 min"
            href="/dashboard/guru"
            color="bg-cobalt"
          />
          <TaskRow
            number="03"
            title="Rehearse a conflict story"
            meta="Stage Fright · Collaboration"
            time="15 min"
            href="/dashboard/stage-fright"
            color="bg-plum"
          />
        </Panel>
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="text-amber size-4" />
            <p className="font-semibold">Stripe</p>
          </div>
          <p className="text-canvas mt-1 text-sm">
            Software Engineer, New Grad
          </p>
          <div className="border-iron/70 mt-5 space-y-4 border-y py-4">
            <div className="flex justify-between text-xs">
              <span className="text-dust">Stage</span>
              <span>Preparing</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-dust">Deadline</span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3" /> Aug 24 · 9 days
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-dust">Coverage</span>
              <span>8 of 11 requirements</span>
            </div>
          </div>
          <Link
            href="/dashboard/applications"
            className="text-amber mt-4 inline-flex items-center gap-2 text-xs font-semibold"
          >
            View application workspace <ArrowRight className="size-3" />
          </Link>
        </Panel>
      </div>
    </div>
  );
}
