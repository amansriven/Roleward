import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { PageIntro, Panel } from "@/components/workspace/dashboard-ui";

const requirements = [
  ["Build scalable backend services", "Strong match", "Campus Cart APIs"],
  ["Data structures and algorithms", "Developing", "18 Guru problems"],
  ["Collaborate across teams", "Strong match", "3 verified stories"],
  ["Distributed systems fundamentals", "Evidence gap", "No confirmed evidence"],
] as const;

export default function ApplicationsPage() {
  return (
    <div className="space-y-7">
      <PageIntro
        eyebrow="Applications"
        title="Stripe · Software Engineer"
        copy="A single job workspace connects requirements, evidence, practice, and your application timeline."
        action={
          <button className="bg-amber text-night flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold">
            <Plus className="size-4" /> Add application
          </button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Panel className="overflow-hidden">
          <div className="border-iron/70 flex items-center justify-between border-b p-5">
            <div>
              <p className="font-semibold">Requirement map</p>
              <p className="text-dust mt-1 text-xs">
                8 of 11 requirements have confirmed support
              </p>
            </div>
            <span className="text-sage text-xs">JD confirmed</span>
          </div>
          {requirements.map(([name, status, evidence]) => (
            <div
              key={name}
              className="border-iron/65 grid gap-3 border-t p-5 first:border-t-0 sm:grid-cols-[1fr_120px_180px] sm:items-center"
            >
              <p className="text-sm">{name}</p>
              <span
                className={
                  status === "Strong match"
                    ? "text-sage text-xs"
                    : status === "Developing"
                      ? "text-amber text-xs"
                      : "text-kiln text-xs"
                }
              >
                {status}
              </span>
              <p className="text-dust text-xs">{evidence}</p>
            </div>
          ))}
        </Panel>
        <div className="space-y-5">
          <Panel className="p-5">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="text-amber size-4" />
              <p className="font-semibold">Application timeline</p>
            </div>
            <div className="border-iron mt-5 space-y-5 border-l pl-4">
              <div>
                <p className="text-xs font-medium">Preparing</p>
                <p className="text-dust mt-1 text-[11px]">Current stage</p>
              </div>
              <div>
                <p className="text-canvas text-xs">Application deadline</p>
                <p className="text-dust mt-1 flex items-center gap-1.5 text-[11px]">
                  <CalendarDays className="size-3" /> Aug 24, 2026
                </p>
              </div>
              <div>
                <p className="text-canvas text-xs">Target submit date</p>
                <p className="text-dust mt-1 text-[11px]">Aug 20, 2026</p>
              </div>
            </div>
          </Panel>
          <Panel className="p-5">
            <p className="font-semibold">Preparation checklist</p>
            <ul className="text-canvas mt-4 space-y-3 text-xs">
              <li className="flex gap-2">
                <Check className="text-sage size-3.5" /> Confirm job
                requirements
              </li>
              <li>○ Finish tailored résumé</li>
              <li>○ Complete graph practice</li>
              <li>○ Rehearse conflict story</li>
            </ul>
          </Panel>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          [
            "Resume Kitchen",
            "2 edits to review",
            "/dashboard/resume-kitchen",
            "text-copper",
          ],
          ["Guru", "Graph traversal next", "/dashboard/guru", "text-cobalt"],
          [
            "Stage Fright",
            "1 story to rehearse",
            "/dashboard/stage-fright",
            "text-plum",
          ],
        ].map(([title, copy, href, color]) => (
          <Link
            key={title}
            href={href!}
            className="border-iron bg-workshop/75 rounded-xl border p-4"
          >
            <p className={`text-sm font-semibold ${color}`}>{title}</p>
            <p className="text-dust mt-1 text-xs">{copy}</p>
            <ArrowRight className="text-dust mt-4 size-4" />
          </Link>
        ))}
      </div>
    </div>
  );
}
