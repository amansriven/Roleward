import type { Metadata } from "next";
import { ArrowRight, Check, FileUp, ListTodo, Target } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "How it works" };

const steps = [
  {
    icon: FileUp,
    title: "Bring the source material",
    copy: "Add your résumé and confirm the experience Sweet+ is allowed to use.",
  },
  {
    icon: Target,
    title: "Add one target job",
    copy: "Paste the description and verify the requirements that matter for the role.",
  },
  {
    icon: ListTodo,
    title: "Follow a focused route",
    copy: "Complete high-impact actions across your résumé, coding, and stories.",
  },
  {
    icon: Check,
    title: "Watch readiness change",
    copy: "Every completed activity updates an explainable preparation view.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main>
      <section className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 lg:py-28">
        <p className="section-label">How Sweet+ works</p>
        <h1 className="mt-5 text-5xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">
          One target job becomes
          <br />
          <span className="text-amber">a preparation route.</span>
        </h1>
        <p className="text-canvas mx-auto mt-6 max-w-2xl text-lg leading-8">
          No opaque score and no generic checklist. Sweet+ shows what changed,
          why it matters, and where to work next.
        </p>
      </section>
      <section className="border-iron bg-workshop/60 border-y">
        <ol className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="border-iron grid gap-5 border-b py-8 last:border-b-0 sm:grid-cols-[4rem_1fr_auto] sm:items-center"
            >
              <span className="text-dust font-mono text-sm">0{index + 1}</span>
              <div>
                <h2 className="text-xl font-semibold">{step.title}</h2>
                <p className="text-canvas mt-2 max-w-xl text-sm leading-6">
                  {step.copy}
                </p>
              </div>
              <step.icon className="text-amber size-5" />
            </li>
          ))}
        </ol>
      </section>
      <section className="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8">
        <h2 className="text-4xl font-semibold tracking-[-0.04em]">
          Your plan should be editable, not mystical.
        </h2>
        <p className="text-canvas mx-auto mt-5 max-w-2xl leading-7">
          Confirm extracted requirements, correct your evidence, and choose
          which recommendations enter your plan.
        </p>
        <Button asChild className="mt-8">
          <Link href="/signup">
            Build my first plan <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </main>
  );
}
