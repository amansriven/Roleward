import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EvidenceLibrary } from "@/components/resume/evidence-library";
import { FeatureIcon } from "@/components/brand/feature-icon";
import { PageIntro } from "@/components/workspace/dashboard-ui";
export const metadata: Metadata = { title: "Evidence Library" };
export default function EvidencePage() {
  return (
    <div className="space-y-8">
      <PageIntro
        icon={<FeatureIcon feature="evidence" size="lg" active />}
        eyebrow="Shared foundation"
        title="Evidence Library"
        copy="The verified experience every Backstage feature can use. Edit the wording, confirm what is accurate, or remove anything you do not want used in a résumé or interview."
        action={
          <Link
            href="/dashboard/resume-kitchen/intake"
            className="bg-amber text-night flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
          >
            <Plus className="size-4" /> Import résumé
          </Link>
        }
      />
      <EvidenceLibrary />
    </div>
  );
}
