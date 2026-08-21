import { BriefcaseBusiness, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ApplicationsNav } from "@/components/applications/applications-nav";
import { PageIntro } from "@/components/workspace/dashboard-ui";

export default function ApplicationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="space-y-8">
      <PageIntro
        icon={
          <span className="border-amber/25 bg-amber/[.07] text-amber flex size-16 shrink-0 items-center justify-center rounded-2xl border shadow-[0_12px_40px_rgba(255,122,89,.08)]">
            <BriefcaseBusiness className="size-7" aria-hidden="true" />
          </span>
        }
        eyebrow="Job search"
        title="Applications"
        copy="Track the role, understand the company, and prepare for what happens next."
        action={
          <Link
            href="/dashboard/applications/new"
            className="bg-amber text-night flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-[0_10px_28px_rgba(255,122,89,.18)] transition-all hover:-translate-y-0.5"
          >
            <Plus className="size-4" /> Add application
          </Link>
        }
      />
      <ApplicationsNav />
      {children}
    </div>
  );
}
