import {
  ArrowRight,
  Check,
  Code2,
  FileText,
  MessageSquareText,
} from "lucide-react";

import { FeatureIcon } from "@/components/brand/feature-icon";
import { cn } from "@/lib/utils";

function ResumeVisual() {
  return (
    <div className="grid h-full grid-cols-[.72fr_1.28fr] gap-3 p-5 sm:p-7">
      <div className="space-y-3">
        <div className="bg-copper/70 h-2 w-16 rounded-full" />
        <div className="bg-iron h-1.5 w-full rounded-full" />
        <div className="bg-iron h-1.5 w-4/5 rounded-full" />
        <div className="border-iron bg-night/60 mt-6 rounded-lg border p-3">
          <p className="text-dust font-mono text-[8px] tracking-wider uppercase">
            Evidence
          </p>
          <p className="text-canvas mt-2 text-[10px] leading-4">
            12 APIs · 38% faster · 812 users
          </p>
        </div>
      </div>
      <div className="border-copper/35 bg-linen/[.035] relative rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <FileText className="text-copper size-3.5" />
          <span className="text-[10px] font-semibold">Experience</span>
        </div>
        <div className="mt-4 space-y-2">
          <div className="bg-canvas/20 h-1.5 w-full rounded" />
          <div className="bg-canvas/20 h-1.5 w-11/12 rounded" />
          <div className="bg-copper/60 h-1.5 w-4/5 rounded" />
        </div>
        <div className="border-sage/30 bg-sage/10 text-sage absolute right-3 bottom-3 flex items-center gap-1 rounded-md border px-2 py-1 text-[8px]">
          <Check className="size-2.5" /> verified
        </div>
      </div>
    </div>
  );
}

function ZedVisual() {
  return (
    <div className="grid h-full grid-cols-[1.2fr_.8fr] gap-3 p-5 sm:p-7">
      <div className="border-cobalt/35 rounded-xl border bg-[#18191e] p-4 font-mono">
        <div className="text-canvas flex items-center gap-2 text-[9px]">
          <Code2 className="text-cobalt size-3" /> solution.ts
        </div>
        <div className="mt-5 space-y-2 text-[9px]">
          <p>
            <span className="text-plum">function</span>{" "}
            <span className="text-cobalt">traverse</span>(grid) &#123;
          </p>
          <p className="text-dust pl-3">{"// visit each node once"}</p>
          <p className="text-canvas pl-3">const seen = new Set();</p>
          <p>&#125;</p>
        </div>
        <div className="mt-6 flex gap-1.5">
          <span className="bg-sage size-1.5 rounded-full" />
          <span className="bg-sage size-1.5 rounded-full" />
          <span className="bg-sage size-1.5 rounded-full" />
          <span className="bg-iron size-1.5 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <FeatureIcon feature="zed" size="md" active />
          <div>
            <p className="text-dust font-mono text-[8px] uppercase">
              Zed recommends
            </p>
            <p className="mt-1 text-xs font-semibold">Graph traversal</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="bg-iron h-1.5 rounded-full">
            <div className="bg-cobalt h-full w-[62%] rounded-full" />
          </div>
          <p className="text-canvas text-[9px]">62% mastery</p>
        </div>
      </div>
    </div>
  );
}

function StageVisual() {
  return (
    <div className="grid h-full grid-cols-[.85fr_1.15fr] gap-4 p-5 sm:p-7">
      <div className="flex flex-col justify-between">
        <div>
          <p className="text-dust font-mono text-[8px] uppercase">Story bank</p>
          <p className="mt-2 text-sm font-semibold">7 true stories</p>
        </div>
        <div className="space-y-1.5">
          {["Leadership", "Conflict", "Impact"].map((item, index) => (
            <div
              key={item}
              className="border-iron bg-night/50 flex items-center justify-between rounded-md border px-2.5 py-2 text-[9px]"
            >
              <span>{item}</span>
              <span className={index === 1 ? "text-amber" : "text-sage"}>
                {index === 1 ? "practice" : "ready"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="border-plum/35 bg-plum/[.055] rounded-xl border p-4">
        <MessageSquareText className="text-plum size-4" />
        <p className="mt-4 text-xs leading-5 font-semibold">
          Tell me about a time you disagreed with a teammate.
        </p>
        <div className="mt-5 space-y-2">
          <div className="bg-canvas/15 h-1.5 w-full rounded" />
          <div className="bg-canvas/15 h-1.5 w-5/6 rounded" />
          <div className="bg-canvas/15 h-1.5 w-2/3 rounded" />
        </div>
        <div className="text-plum mt-5 flex items-center gap-1 text-[9px] font-semibold">
          Rehearse <ArrowRight className="size-3" />
        </div>
      </div>
    </div>
  );
}

const visuals = {
  resume: ResumeVisual,
  zed: ZedVisual,
  stage: StageVisual,
} as const;

export function ProductVisual({
  product,
  className,
}: {
  product: keyof typeof visuals;
  className?: string;
  priority?: boolean;
}) {
  const Visual = visuals[product];
  return (
    <figure
      className={cn(
        "border-amber/40 bg-workshop relative aspect-[4/3] overflow-hidden rounded-2xl border shadow-[inset_0_1px_rgba(242,235,221,.04)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(242,235,221,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(242,235,221,.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
      <div className="relative h-full">
        <Visual />
      </div>
      <div className="ring-linen/5 pointer-events-none absolute inset-0 ring-1 ring-inset" />
    </figure>
  );
}
