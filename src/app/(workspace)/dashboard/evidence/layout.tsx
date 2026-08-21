import { Library, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EvidenceNav } from "@/components/resume/evidence-nav";
import { PageIntro } from "@/components/workspace/dashboard-ui";

export default function EvidenceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-8">
      <PageIntro
        icon={
          <span className="border-amber/25 bg-amber/[.06] text-amber flex size-16 shrink-0 items-center justify-center rounded-2xl border">
            <Library className="size-7" aria-hidden="true" />
          </span>
        }
        eyebrow="Evidence Library"
        title="Your career record, organized."
        copy="Review one section at a time. Every fact stays separate, editable, and traceable to your resume."
        action={
          <Link
            href="/dashboard/resume-kitchen/intake"
            className="bg-amber text-night flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
          >
            <Plus className="size-4" /> Import resume
          </Link>
        }
      />
      <EvidenceNav />
      {children}
    </div>
  );
}
