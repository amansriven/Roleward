import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import Link from "next/link";
import { ResumeKitchenNav } from "@/components/resume/resume-kitchen-nav";
import { PageIntro } from "@/components/workspace/dashboard-ui";

export default function ResumeKitchenLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="space-y-8">
      <PageIntro
        icon={
          <span className="border-amber/25 bg-amber/[.06] text-amber flex size-16 shrink-0 items-center justify-center rounded-2xl border">
            <FileText className="size-7" aria-hidden="true" />
          </span>
        }
        eyebrow="Resume Kitchen"
        title="One resume. Clear versions."
        copy="Keep the original safe, name every revision, and tailor one role at a time."
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/evidence"
              className="text-canvas hover:text-linen text-xs"
            >
              View evidence
            </Link>
            <Link
              href="/dashboard/resume-kitchen/intake"
              className="bg-amber text-night inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold"
            >
              Import resume
            </Link>
          </div>
        }
      />
      <ResumeKitchenNav />
      {children}
    </div>
  );
}
