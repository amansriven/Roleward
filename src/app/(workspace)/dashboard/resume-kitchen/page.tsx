import Link from "next/link";
import { ResumeKitchenWorkspace } from "@/components/resume/resume-kitchen-workspace";
import { PageIntro } from "@/components/workspace/dashboard-ui";

export default function ResumeKitchenPage() {
  return (
    <div className="theme-resume space-y-7">
      <PageIntro
        eyebrow="Resume Kitchen"
        title="Tailor with proof, not guesswork."
        copy="Your confirmed experience is the pantry. The posting's requirements are the recipe. Every suggestion names the claims it came from, and cannot contain a figure those claims do not."
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
              className="tool-button text-night inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold"
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
