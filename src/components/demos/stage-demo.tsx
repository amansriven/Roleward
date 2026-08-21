"use client";

import { Check, Mic2 } from "lucide-react";
import { useState } from "react";

const stages = [
  {
    label: "Stage Fright",
    focus:
      "Capture one real project story without worrying about perfect structure.",
  },
  {
    label: "Finding Your Voice",
    focus:
      "Shape the story around your decisions, ownership, and contribution.",
  },
  {
    label: "Rehearsal Mode",
    focus: "Rehearse your ownership story and make the outcome measurable.",
  },
  {
    label: "Under the Spotlight",
    focus:
      "Practice delivering the story clearly under realistic follow-up questions.",
  },
  {
    label: "Stage Ready",
    focus:
      "Keep your delivery natural, specific, and adaptable to the interviewer.",
  },
] as const;

export function StageDemo() {
  const [stage, setStage] = useState(2);
  const activeStage = stages[stage]!;

  return (
    <div className="surface overflow-hidden rounded-2xl">
      <div className="border-iron flex items-start justify-between gap-5 border-b px-5 py-5 sm:px-7 sm:py-6">
        <div className="max-w-xl">
          <p className="section-label">Behavioral progression</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
            From Stage Fright to Stage Ready
          </h3>
        </div>
        <span className="border-amber/30 text-amber flex size-11 shrink-0 items-center justify-center rounded-xl border bg-[linear-gradient(145deg,rgba(255,122,89,0.16),rgba(255,154,61,0.05))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_30px_rgba(255,122,89,0.08)]">
          <Mic2 className="size-5" aria-hidden="true" />
        </span>
      </div>

      <div className="p-5 sm:p-7">
        <div className="relative overflow-x-auto pb-1">
          <div className="absolute top-5 right-[10%] left-[10%] h-px bg-[#30343d]">
            <div
              className="h-px bg-[linear-gradient(90deg,var(--amber),var(--sunset))] shadow-[0_0_10px_rgba(255,122,89,0.32)] transition-[width] duration-500"
              style={{ width: `${(stage / (stages.length - 1)) * 100}%` }}
            />
          </div>
          <div className="relative grid min-w-[38rem] grid-cols-5 gap-2">
            {stages.map((item, index) => {
              const isActive = stage === index;
              const isComplete = index < stage;

              return (
                <button
                  key={item.label}
                  onClick={() => setStage(index)}
                  aria-pressed={isActive}
                  className="group flex min-h-28 flex-col items-center gap-3 text-center"
                >
                  <span
                    className={`relative z-10 flex size-10 items-center justify-center rounded-full border font-mono text-[11px] transition-all duration-300 ${
                      isActive
                        ? "border-amber bg-amber text-night ring-amber/10 shadow-[0_0_24px_rgba(255,122,89,0.28)] ring-4"
                        : isComplete
                          ? "border-amber/50 text-amber bg-[#211815]"
                          : "text-dust group-hover:border-dust/60 group-hover:text-canvas border-[#343842] bg-[#15181e]"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={`max-w-28 text-xs leading-5 transition-colors ${
                      isActive
                        ? "text-linen font-medium"
                        : "text-dust group-hover:text-canvas"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-iron mt-6 rounded-xl border bg-[linear-gradient(135deg,rgba(255,122,89,0.06),rgba(23,26,33,0.88)_36%)] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-amber font-mono text-[10px] tracking-[0.08em] uppercase">
              Step {stage + 1} of {stages.length}
            </p>
            <p className="mt-2 text-sm font-semibold">{activeStage.label}</p>
          </div>
          <p className="text-canvas mt-3 max-w-2xl text-sm leading-6 sm:mt-0 sm:text-right">
            {activeStage.focus}
          </p>
        </div>
      </div>
    </div>
  );
}
