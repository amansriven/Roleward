"use client";

import { Mic2 } from "lucide-react";
import { useState } from "react";

const stages = [
  "Stage Fright",
  "Finding Your Voice",
  "Rehearsal Mode",
  "Under the Spotlight",
  "Stage Ready",
] as const;

export function StageDemo() {
  const [stage, setStage] = useState(2);
  return (
    <div className="surface rounded-2xl p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label">Behavioral progression</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em]">
            From Stage Fright to Stage Ready
          </h3>
        </div>
        <Mic2 className="text-amber size-5" />
      </div>
      <div className="before:bg-iron relative mt-8 grid grid-cols-5 gap-2 before:absolute before:top-4 before:right-[10%] before:left-[10%] before:h-px">
        {stages.map((label, index) => (
          <button
            key={label}
            onClick={() => setStage(index)}
            aria-pressed={stage === index}
            className="group relative flex min-h-24 flex-col items-center gap-3 text-center"
          >
            <span
              className={`relative z-10 flex size-8 items-center justify-center rounded-full border font-mono text-[10px] transition-all ${index <= stage ? "border-amber/40 text-night bg-[var(--text-amber)]" : "border-iron bg-workshop text-dust"}`}
            >
              {index + 1}
            </span>
            <span
              className={`text-[10px] leading-4 sm:text-xs ${stage === index ? "text-linen" : "text-dust"}`}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
      <div className="border-iron bg-raised mt-5 rounded-xl border p-4">
        <p className="text-amber font-mono text-[10px] uppercase">
          Current focus
        </p>
        <p className="text-canvas mt-2 text-sm leading-6">
          {stage < 2
            ? "Capture one real project story without worrying about perfect structure."
            : stage < 4
              ? "Rehearse your ownership story and make the outcome measurable."
              : "You have broad story coverage. Keep your delivery natural and specific."}
        </p>
      </div>
    </div>
  );
}
