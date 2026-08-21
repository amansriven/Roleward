import { ArrowRight, Code2, FileCheck2, LockKeyhole, Mic2 } from "lucide-react";
import Link from "next/link";

import { ProductVisual } from "@/components/brand/product-visual";
import { ReadinessDemo } from "@/components/demos/readiness-demo";
import { ResumeDemo } from "@/components/demos/resume-demo";
import { StageDemo } from "@/components/demos/stage-demo";
import { ZedDemo } from "@/components/demos/zed-demo";
import { Button } from "@/components/ui/button";

const modules = [
  {
    icon: FileCheck2,
    name: "Resume Kitchen",
    copy: "A stronger résumé. Still yours.",
    href: "/resume-kitchen",
    product: "resume",
  },
  {
    icon: Code2,
    name: "Zed",
    copy: "Practice how you think.",
    href: "/zed",
    product: "zed",
  },
  {
    icon: Mic2,
    name: "Stage Fright",
    copy: "Tell the story like you lived it.",
    href: "/stage-fright",
    product: "stage",
  },
] as const;

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-12 lg:py-28">
        <div>
          <p className="section-label">Your route to ready</p>
          <h1 className="mt-6 text-5xl leading-[1.01] font-semibold tracking-[-0.05em] text-balance sm:text-7xl">
            Get where you <br />
            <span className="text-amber">need to be.</span>
          </h1>
          <p className="text-canvas mt-7 max-w-lg text-lg leading-8">
            Choose the role. Backstage builds the preparation path.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/signup">
                Build my plan <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="#demo">Try the demo</Link>
            </Button>
          </div>
          <p className="text-dust mt-10 flex items-center gap-2 font-mono text-[11px] tracking-[0.06em] uppercase">
            <LockKeyhole className="text-sage size-3.5" />
            Private by default
          </p>
        </div>
        <div id="demo" className="scroll-mt-28">
          <ReadinessDemo />
        </div>
      </section>

      <section className="border-iron bg-workshop/60 border-y">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="section-label">The whole route</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                One plan. Three ways forward.
              </h2>
            </div>
            <p className="text-dust text-sm">Résumé · technical · behavioral</p>
          </div>

          <div className="border-iron md:divide-iron mt-12 grid border-y md:grid-cols-3 md:divide-x">
            {modules.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="group border-iron border-b py-7 last:border-b-0 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0"
              >
                <item.icon className="text-amber size-5" />
                <ProductVisual className="mt-7" product={item.product} />
                <div className="mt-6 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">{item.name}</h3>
                    <p className="text-canvas mt-2 text-sm">{item.copy}</p>
                  </div>
                  <ArrowRight className="text-amber size-4 shrink-0 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-24 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
          <div>
            <p className="section-label">Resume Kitchen</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Stronger. Still true.
            </h2>
          </div>
          <ResumeDemo />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <ZedDemo />
          <div className="lg:pl-6">
            <p className="section-label">Zed</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Think it through.
            </h2>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
          <div>
            <p className="section-label">Stage Fright</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Tell it naturally.
            </h2>
          </div>
          <StageDemo />
        </div>
      </section>

      <section className="border-iron bg-raised/60 border-y">
        <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8 lg:py-24">
          <p className="section-label">Your next move</p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-6xl">
            Pick the role. Start the route.
          </h2>
          <Button asChild className="mt-8">
            <Link href="/signup">
              Get started <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
