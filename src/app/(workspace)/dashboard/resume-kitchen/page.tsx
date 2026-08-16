import Link from "next/link";
import { CheckCircle2, FileText, ShieldCheck, Sparkles } from "lucide-react";
import {
  CheckItem,
  Metric,
  PageIntro,
  Panel,
} from "@/components/workspace/dashboard-ui";

export default function ResumeKitchenPage() {
  return (
    <div className="theme-resume space-y-7">
      <PageIntro
        eyebrow="Resume Kitchen"
        title="Tailor with proof, not guesswork."
        copy="Your verified experience is the pantry. Stripe’s requirements are the recipe. Review every suggested change before it reaches your tailored résumé."
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <Metric
            label="Requirement coverage"
            value="8 / 11"
            note="3 gaps to review"
          />
        </Panel>
        <Panel className="p-5">
          <Metric
            label="Verified ingredients"
            value="24"
            note="Across 6 experiences"
          />
        </Panel>
        <Panel className="p-5">
          <Metric
            label="Tailored versions"
            value="3"
            note="Latest saved 2h ago"
          />
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_.5fr]">
        <Panel className="overflow-hidden">
          <div className="border-iron/70 flex items-center justify-between border-b p-5">
            <div>
              <p className="font-semibold">Recipe card · Stripe</p>
              <p className="text-dust mt-1 text-xs">
                Suggestions ranked by requirement impact
              </p>
            </div>
            <span className="border-copper/40 bg-copper/10 text-copper rounded-full border px-2.5 py-1 text-[10px]">
              2 ready to review
            </span>
          </div>
          <article className="p-5 sm:p-6">
            <div className="text-copper flex items-center gap-2 text-xs">
              <Sparkles className="size-4" /> HIGH-IMPACT REVISION
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              Backend engineering · Campus Cart
            </h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="border-iron bg-night/45 rounded-xl border p-4">
                <p className="text-dust font-mono text-[10px] uppercase">
                  Original
                </p>
                <p className="text-canvas mt-3 text-sm leading-6">
                  Built backend APIs for a campus marketplace using Node.js and
                  PostgreSQL.
                </p>
              </div>
              <div className="border-copper/35 bg-copper/[.06] rounded-xl border p-4">
                <p className="text-copper font-mono text-[10px] uppercase">
                  Suggested
                </p>
                <p className="mt-3 text-sm leading-6">
                  Built and optimized 12 Node.js APIs for a campus marketplace,
                  cutting median response time 38% for 800+ student users.
                </p>
              </div>
            </div>
            <div className="border-iron/70 mt-4 rounded-xl border p-4">
              <div className="flex gap-3">
                <ShieldCheck className="text-sage mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">
                    Why this is safe to use
                  </p>
                  <p className="text-dust mt-1 text-xs leading-5">
                    Supported by your confirmed Campus Cart metrics: 12
                    endpoints, 38% latency reduction, and 812 monthly users.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="bg-linen/[.05] text-canvas rounded-md px-2 py-1 text-[10px]">
                  Scalable services
                </span>
                <span className="bg-linen/[.05] text-canvas rounded-md px-2 py-1 text-[10px]">
                  Node.js
                </span>
                <span className="bg-linen/[.05] text-canvas rounded-md px-2 py-1 text-[10px]">
                  Performance
                </span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="bg-copper text-night rounded-lg px-4 py-2.5 text-xs font-semibold">
                Accept revision
              </button>
              <button className="border-iron text-canvas rounded-lg border px-4 py-2.5 text-xs">
                Edit first
              </button>
              <button className="text-dust px-3 py-2.5 text-xs">Dismiss</button>
            </div>
          </article>
        </Panel>
        <div className="space-y-5">
          <Panel className="p-5">
            <div className="flex items-center gap-2">
              <FileText className="text-copper size-4" />
              <p className="font-semibold">Stripe version</p>
            </div>
            <p className="text-dust mt-1 text-xs">Based on Base Resume · v4</p>
            <ul className="mt-5 space-y-3">
              <CheckItem done>Contact and education</CheckItem>
              <CheckItem done>Core technical skills</CheckItem>
              <CheckItem>Review 2 suggested bullets</CheckItem>
              <CheckItem>Resolve 1 evidence gap</CheckItem>
              <CheckItem>Export and inspect PDF</CheckItem>
            </ul>
            <button className="border-iron text-canvas mt-5 w-full rounded-lg border py-2.5 text-xs">
              Preview résumé
            </button>
          </Panel>
          <Panel className="p-5">
            <CheckCircle2 className="text-sage size-4" />
            <p className="mt-3 text-sm font-semibold">
              Original always recoverable
            </p>
            <p className="text-dust mt-2 text-xs leading-5">
              Accepted changes create a new version. They never overwrite your
              base résumé.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
