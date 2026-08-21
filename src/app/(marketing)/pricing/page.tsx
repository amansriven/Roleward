import type { Metadata } from "next";
import { Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pricing" };

const plans = [
  {
    name: "Foundation",
    price: "$0",
    note: "Learn the workflow before committing.",
    features: [
      "One active target job",
      "One tailored résumé version",
      "Selected Zed problems",
      "Stage Fright story bank",
    ],
    action: "Start free",
    featured: false,
  },
  {
    name: "Backstage",
    price: "$12",
    note: "For an active internship or new-grad search.",
    features: [
      "Unlimited target-job workspaces",
      "Full résumé version history",
      "Complete Zed practice modes",
      "Adaptive Stage Fright rehearsals",
      "Weekly preparation route",
    ],
    action: "Start with Backstage",
    featured: true,
  },
] as const;

export default function PricingPage() {
  return (
    <main>
      <section className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 lg:py-28">
        <p className="section-label">Simple pricing</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-[-0.045em] text-balance sm:text-6xl">
          Pay for focused preparation,
          <br />
          <span className="text-amber">not anxiety.</span>
        </h1>
        <p className="text-canvas mx-auto mt-6 max-w-xl text-lg leading-8">
          Start with the core workflow. Upgrade when Backstage becomes part of
          an active search.
        </p>
      </section>
      <section className="mx-auto grid max-w-5xl gap-5 px-5 pb-24 sm:px-8 md:grid-cols-2">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`surface relative rounded-2xl p-7 sm:p-9 ${plan.featured ? "border-amber/40" : ""}`}
          >
            {plan.featured && (
              <div className="bg-amber absolute inset-x-0 top-0 h-1 rounded-t-2xl" />
            )}
            <p className="text-amber font-mono text-xs tracking-[0.08em] uppercase">
              {plan.name}
            </p>
            <div className="mt-6 flex items-baseline gap-2">
              <strong className="text-5xl font-semibold tracking-[-0.04em]">
                {plan.price}
              </strong>
              {plan.price !== "$0" && (
                <span className="text-dust text-sm">/ month</span>
              )}
            </div>
            <p className="text-canvas mt-4 min-h-12 text-sm leading-6">
              {plan.note}
            </p>
            <Button
              asChild
              className="mt-7 w-full"
              variant={plan.featured ? "primary" : "secondary"}
            >
              <Link href="/signup">{plan.action}</Link>
            </Button>
            <ul className="border-iron mt-8 space-y-4 border-t pt-7">
              {plan.features.map((feature) => (
                <li key={feature} className="text-canvas flex gap-3 text-sm">
                  <Check className="text-sage size-4 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
