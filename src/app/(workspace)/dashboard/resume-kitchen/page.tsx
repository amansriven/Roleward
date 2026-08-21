import Link from "next/link";
import { FeatureIcon } from "@/components/brand/feature-icon";
import { ResumeKitchenWorkspace } from "@/components/resume/resume-kitchen-workspace";
import { PageIntro } from "@/components/workspace/dashboard-ui";

export default function ResumeKitchenPage() {
  return (
    <div className="space-y-8">
      <PageIntro
        icon={<FeatureIcon feature="resume-kitchen" size="lg" active />}
        eyebrow="Your career record"
        title="Resume Kitchen"
        copy="Keep your original résumé untouched, create separately named versions for each role, and trace every suggested change back to experience you confirmed."
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
              Import résumé
            </Link>
          </div>
        }
      />
      <ResumeKitchenWorkspace />
    </div>
  );
}
