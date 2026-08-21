import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { EvidenceNav } from "@/components/resume/evidence-nav";
import { PageIntro } from "@/components/workspace/dashboard-ui";

export default function EvidenceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-8">
      <PageIntro
        icon={
          <span className="border-amber/25 bg-amber/[.05] flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border">
            <Image
              src="/brand/evidence-avatar.png"
              alt="The Evidence Library owl archivist"
              width={64}
              height={64}
              className="shrink-0 object-cover object-top"
              priority
            />
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
