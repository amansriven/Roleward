import type { Metadata } from "next";
import { ArrowRight, Layers3, Mic2, Route } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { StageDemo } from "@/components/demos/stage-demo";
import { ProductVisual } from "@/components/brand/product-visual";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Stage Fright",
  description:
    "Behavioral interview preparation from Stage Fright to Stage Ready.",
};

const rehearsalLoop: Array<[LucideIcon, string, string]> = [
  [
    Layers3,
    "Capture",
    "Turn real projects, conflicts, and decisions into reusable story material.",
  ],
  [
    Route,
    "Structure",
    "Strengthen situation, action, and result without forcing a rigid script.",
  ],
  [
    Mic2,
    "Rehearse",
    "Practice follow-ups and improve specificity while preserving your voice.",
  ],
];

export default function StageFrightPage() {
  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-12 lg:py-28">
        <div>
          <p className="section-label">Stage Fright</p>
          <h1 className="mt-5 text-5xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">
            Walk into the story
            <br /> <span className="text-amber">you already lived.</span>
          </h1>
          <p className="text-canvas mt-6 text-lg leading-8">
            Build flexible stories from real experiences, cover the competencies
            that matter, and rehearse without sounding rehearsed.
          </p>
          <Button asChild className="bg-amber mt-8">
            <Link href="/signup">
              Start my story bank <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <ProductVisual product="stage" priority />
      </section>
      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-8 lg:px-12">
        <div className="mb-7 max-w-xl">
          <p className="section-label">Interactive preview</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
            Move from capture to confident delivery.
          </h2>
        </div>
        <StageDemo />
      </section>
      <section className="border-iron bg-workshop/60 border-y">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
          <p className="section-label">A calmer rehearsal loop</p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {rehearsalLoop.map(([Icon, title, copy], i) => (
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
    </main>
  );
}
