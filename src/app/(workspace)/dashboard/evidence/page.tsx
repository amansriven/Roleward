import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EvidenceLibrary } from "@/components/resume/evidence-library";
import { PageIntro } from "@/components/workspace/dashboard-ui";
export const metadata: Metadata = { title: "Evidence Library" };
export default function EvidencePage() {
  return (
    <div className="theme-resume space-y-7">
      <PageIntro
        eyebrow="Shared foundation"
        title="Evidence Library"
        copy="The confirmed facts Resume Kitchen, Guru, and Stage Fright may reference. Proposed or rejected claims never appear here."
        action={
          <Link
            href="/dashboard/resume-kitchen/intake"
            className="bg-copper text-night flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold"
          >
            <Plus className="size-4" /> Import résumé
          </Link>
        }
      />
      <EvidenceLibrary />
    </div>
  );
}
