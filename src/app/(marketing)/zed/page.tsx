import type { Metadata } from "next";
import { ArrowRight, BrainCircuit, Gauge, MessagesSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { ZedDemo } from "@/components/demos/zed-demo";
import { ProductVisual } from "@/components/brand/product-visual";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Zed",
  description:
    "Guided coding interview practice connected to your target role.",
};

const observations: Array<[LucideIcon, string, string]> = [
  [
    BrainCircuit,
    "Reasoning",
    "How clearly you frame the problem and choose a workable approach.",
  ],
  [
    Gauge,
    "Testing",
    "Whether you find edge cases, verify assumptions, and read failures.",
  ],
  [
    MessagesSquare,
    "Communication",
    "How well you explain complexity, alternatives, and tradeoffs.",
  ],
];

export default function ZedPage() {
  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-12 lg:py-28">
        <div>
          <p className="section-label">Zed</p>
          <h1 className="mt-5 text-5xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">
            Practice the thinking,
            <br />
            <span className="text-amber">not the answer.</span>
          </h1>
          <p className="text-canvas mt-6 text-lg leading-8">
            Build patterns, explain tradeoffs, test edge cases, and ask for the
            smallest useful hint.
          </p>
          <Button asChild className="bg-amber mt-8">
            <Link href="/signup">
              Practice with Zed <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <ProductVisual product="zed" priority />
      </section>
      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-8 lg:px-12">
        <div className="mb-7 max-w-xl">
          <p className="section-label">Interactive preview</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
            Test the approach, then explain it.
          </h2>
        </div>
        <ZedDemo />
      </section>
      <section className="border-iron bg-workshop/60 border-y">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
          <p className="section-label">What Zed observes</p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {observations.map(([Icon, title, copy], i) => (
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
