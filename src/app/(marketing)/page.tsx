import type { Metadata } from "next";
import { ArrowRight, Code2, FileCheck2, Mic2 } from "lucide-react";
import Link from "next/link";

import { ProductVisual } from "@/components/brand/product-visual";
import { ReadinessDemo } from "@/components/demos/readiness-demo";
import { ResumeDemo } from "@/components/demos/resume-demo";
import { StageDemo } from "@/components/demos/stage-demo";
import { ZedDemo } from "@/components/demos/zed-demo";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { homeStructuredData } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const modules = [
  {
    icon: FileCheck2,
    name: "Resume Kitchen",
    copy: "AI resume tailoring grounded in verified experience.",
    href: "/resume-kitchen",
    product: "resume",
  },
  {
    icon: Code2,
    name: "Zed",
    copy: "Role-aware coding interview practice and feedback.",
    href: "/zed",
    product: "zed",
  },
  {
    icon: Mic2,
    name: "Stage Fright",
    copy: "Behavioral mock interviews grounded in your experience.",
    href: "/stage-fright",
    product: "stage",
  },
] as const;

export default function HomePage() {
  return (
    <main>
      <JsonLd data={homeStructuredData} />
      <section className="relative mx-auto flex min-h-[calc(100svh-5rem)] max-w-7xl items-center justify-center overflow-hidden px-5 py-20 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-x-[12%] top-[18%] h-80 bg-[radial-gradient(ellipse_at_center,rgba(255,122,89,0.12),rgba(255,154,61,0.045)_36%,transparent_70%)] blur-3xl" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <h1 className="text-5xl leading-[0.96] font-semibold tracking-[-0.06em] text-balance sm:text-7xl lg:text-[5.6rem]">
            Your entire job search.
            <span className="roleward-gradient-text">
              {" "}
              One contextualized AI workspace.
            </span>
          </h1>
          <p className="text-canvas mx-auto mt-7 max-w-3xl text-lg leading-8 sm:text-xl">
            Roleward helps you prepare for internships and jobs by connecting
            your applications, LeetCode-style coding practice, resume revisions,
            and interview prep—so one agent understands the role you want and
            what to work on next.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/signup">
                Start preparing <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="#demo">See the platform</Link>
            </Button>
          </div>
        </div>
      </section>

      <section
        id="demo"
        className="border-iron bg-workshop/60 scroll-mt-24 border-y"
      >
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="section-label">The whole route</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                One plan. Three ways forward.
              </h2>
            </div>
            <p className="text-dust text-sm">Resume · technical · behavioral</p>
          </div>

          <div className="mt-12">
            <ReadinessDemo />
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

      <section className="border-iron relative overflow-hidden border-y bg-[radial-gradient(circle_at_50%_120%,rgba(255,122,89,0.14),transparent_42%),linear-gradient(145deg,rgba(23,26,33,0.9),rgba(15,17,22,0.96))]">
        <div className="pointer-events-none absolute inset-x-[20%] bottom-0 h-px bg-[linear-gradient(90deg,transparent,#ff7a59,#ff9a3d,transparent)]" />
        <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8 lg:py-24">
          <p className="section-label">Your next move</p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-6xl">
            Move forward.{" "}
            <span className="roleward-gradient-text">Go further.</span>
          </h2>
          <p className="text-canvas mx-auto mt-5 max-w-xl text-base leading-7">
            Choose the internship or job. Roleward connects your application,
            resume, coding interview practice, and mock interview preparation
            into one focused route.
          </p>
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
