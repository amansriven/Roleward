import type { Metadata } from "next";
import { ArrowRight, FileCheck2, SearchCheck, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { ResumeDemo } from "@/components/demos/resume-demo";
import { ProductVisual } from "@/components/brand/product-visual";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "AI Resume Review & Tailoring",
  description:
    "Review and tailor your resume for internships and jobs with AI suggestions grounded in verified experience, target-role requirements, and editable evidence.",
  path: "/resume-kitchen",
});

const workflow: Array<[LucideIcon, string, string]> = [
  [
    SearchCheck,
    "Extract the requirement",
    "Turn a job description into skills and expectations you can inspect.",
  ],
  [
    ShieldCheck,
    "Confirm the evidence",
    "Approve the projects, metrics, and responsibilities Roleward may use.",
  ],
  [
    FileCheck2,
    "Review the diff",
    "Accept, modify, or reject every role-specific resume change.",
  ],
];

export default function ResumeKitchenPage() {
  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-12 lg:py-28">
        <div>
          <p className="section-label">Resume Kitchen</p>
          <h1 className="mt-5 text-5xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">
            Tailor the resume.
            <br />
            <span className="text-amber">Keep the truth.</span>
          </h1>
          <p className="text-canvas mt-6 text-lg leading-8">
            Get AI resume review and tailoring for internships, new-grad roles,
            and engineering jobs. Match verified experience to a target role,
            strengthen the evidence, and inspect why every suggestion exists.
          </p>
          <Button asChild className="bg-amber mt-8">
            <Link href="/signup">
              Open Resume Kitchen <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <ProductVisual product="resume" priority />
      </section>
      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-8 lg:px-12">
        <div className="mb-7 max-w-xl">
          <p className="section-label">Interactive preview</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
            Trace every revision to evidence.
          </h2>
        </div>
        <ResumeDemo />
      </section>
      <section className="border-iron bg-workshop/60 border-y">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
          <p className="section-label">The workflow</p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {workflow.map(([Icon, title, copy], i) => (
              <article
                key={String(title)}
                className="border-iron border-t pt-6"
              >
                <span className="text-dust font-mono text-xs">0{i + 1}</span>
                <Icon className="text-amber mt-8 size-5" />
                <h2 className="mt-5 text-xl font-semibold">{String(title)}</h2>
                <p className="text-canvas mt-3 text-sm leading-6">
                  {String(copy)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8">
        <h2 className="text-4xl font-semibold tracking-[-0.04em]">
          Stronger is useful. Defensible is essential.
        </h2>
        <p className="text-canvas mx-auto mt-5 max-w-2xl">
          Roleward shows the job requirement, source evidence, rationale, and
          revision together.
        </p>
      </section>
    </main>
  );
}
