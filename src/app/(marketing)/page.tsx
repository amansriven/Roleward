import {
  ArrowRight,
  BriefcaseBusiness,
  Code2,
  FileCheck2,
  LockKeyhole,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";

import { ProductVisual } from "@/components/brand/product-visual";
import { ZedDemo } from "@/components/demos/zed-demo";
import { ReadinessDemo } from "@/components/demos/readiness-demo";
import { ResumeDemo } from "@/components/demos/resume-demo";
import { StageDemo } from "@/components/demos/stage-demo";
import { Button } from "@/components/ui/button";

const modules = [
  {
    icon: FileCheck2,
    index: "01",
    name: "Resume Kitchen",
    copy: "Turn verified experience into role-specific résumé evidence.",
    href: "/resume-kitchen",
    product: "resume",
  },
  {
    icon: Code2,
    index: "02",
    name: "Zed",
    copy: "Practice the reasoning and coding patterns your target role will test.",
    href: "/zed",
    product: "zed",
  },
  {
    icon: MessageSquareText,
    index: "03",
    name: "Stage Fright",
    copy: "Build a reusable story bank and rehearse without memorizing scripts.",
    href: "/stage-fright",
    product: "stage",
  },
] as const;

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-12 lg:py-28">
        <div>
          <p className="section-label">Job-specific engineering prep</p>
          <h1 className="mt-6 text-5xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-7xl">
            One role in.
            <br />
            <span className="text-amber">A prep route out.</span>
          </h1>
          <p className="text-canvas mt-7 max-w-xl text-lg leading-8">
            Backstage connects your résumé, coding practice, and behavioral
            stories to the engineering role you actually want—then tells you
            what matters next.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/signup">
                Build my prep plan <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="#demo">Try the role demo</Link>
            </Button>
          </div>
          <div className="text-dust mt-10 flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] tracking-[0.06em] uppercase">
            <span className="flex items-center gap-2">
              <LockKeyhole className="text-sage size-3.5" />
              Private by default
            </span>
            <span>Evidence before generation</span>
          </div>
        </div>
        <div id="demo" className="scroll-mt-28">
          <ReadinessDemo />
        </div>
      </section>

      <section className="border-iron bg-workshop/60 border-y">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="max-w-2xl">
            <p className="section-label">One connected system</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
              Stop preparing in three disconnected tabs.
            </h2>
            <p className="text-canvas mt-5 text-base leading-7">
              Every workspace shares the same target job and verified
              experience, so the plan changes as you improve.
            </p>
          </div>
          <div className="border-iron md:divide-iron mt-12 grid border-y md:grid-cols-3 md:divide-x">
            {modules.map((item) => (
              <article
                key={item.name}
                className="group border-iron border-b py-7 last:border-b-0 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0"
              >
                <div className="flex items-center justify-between">
                  <item.icon className="text-amber size-5" />
                  <span className="text-dust font-mono text-xs">
                    {item.index}
                  </span>
                </div>
                <ProductVisual className="mt-7" product={item.product} />
                <h3 className="mt-6 text-xl font-semibold">{item.name}</h3>
                <p className="text-canvas mt-3 text-sm leading-6">
                  {item.copy}
                </p>
                <Link
                  className="text-amber mt-6 inline-flex items-center gap-2 text-sm font-semibold"
                  href={item.href}
                >
                  Explore workspace{" "}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-24 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div>
            <p className="section-label">Resume Kitchen</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Write stronger bullets without inventing a thing.
            </h2>
            <p className="text-canvas mt-5 text-base leading-7">
              Every revision points back to experience you confirmed. You decide
              what gets accepted.
            </p>
            <Link
              className="text-amber mt-6 inline-flex items-center gap-2 text-sm font-semibold"
              href="/resume-kitchen"
            >
              See evidence-first tailoring <ArrowRight className="size-4" />
            </Link>
          </div>
          <ResumeDemo />
        </div>
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <ZedDemo />
          <div className="lg:pl-6">
            <p className="section-label">Zed</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              A coach for the part between stuck and solved.
            </h2>
            <p className="text-canvas mt-5 text-base leading-7">
              Zed tracks how you reason, test, communicate, and use hints—not
              only whether the final code passes.
            </p>
            <Link
              className="text-amber mt-6 inline-flex items-center gap-2 text-sm font-semibold"
              href="/zed"
            >
              Practice with intention <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div>
            <p className="section-label">Stage Fright</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Walk into the story you already lived.
            </h2>
            <p className="text-canvas mt-5 text-base leading-7">
              Turn real projects into flexible interview stories, then rehearse
              until the structure feels natural.
            </p>
            <Link
              className="text-amber mt-6 inline-flex items-center gap-2 text-sm font-semibold"
              href="/stage-fright"
            >
              Find your voice <ArrowRight className="size-4" />
            </Link>
          </div>
          <StageDemo />
        </div>
      </section>

      <section className="border-iron bg-raised/60 border-y">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-20">
          <div>
            <p className="section-label">How the plan stays honest</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em]">
              Your evidence is the source of truth.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border-iron bg-night/50 rounded-xl border p-5">
              <BriefcaseBusiness className="text-amber size-5" />
              <h3 className="mt-6 font-semibold">Job context travels</h3>
              <p className="text-canvas mt-2 text-sm leading-6">
                Skills, deadlines, and requirements remain visible across every
                activity.
              </p>
            </div>
            <div className="border-iron bg-night/50 rounded-xl border p-5">
              <LockKeyhole className="text-sage size-5" />
              <h3 className="mt-6 font-semibold">Private by default</h3>
              <p className="text-canvas mt-2 text-sm leading-6">
                Résumés, stories, attempts, and recordings are treated as
                sensitive candidate data.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-24 text-center sm:px-8 lg:py-32">
        <p className="section-label">Ready when you are</p>
        <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
          Bring one résumé and one target job.
        </h2>
        <p className="text-canvas mx-auto mt-5 max-w-2xl text-lg leading-8">
          Backstage will turn them into a preparation route you can understand,
          edit, and complete.
        </p>
        <Button asChild className="mt-8">
          <Link href="/signup">
            Create my workspace <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </main>
  );
}
