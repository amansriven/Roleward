"use client";

import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";

const plans = {
  Frontend: {
    score: 68,
    gap: "React performance",
    next: "Profile one rendering problem in Guru",
  },
  Backend: {
    score: 61,
    gap: "SQL joins",
    next: "Practice one SQL join problem in Guru",
  },
  Fullstack: {
    score: 65,
    gap: "System boundaries",
    next: "Map one API flow in Guru",
  },
} as const;

type Role = keyof typeof plans;

export function ReadinessDemo() {
  const [role, setRole] = useState<Role>("Frontend");
  const plan = plans[role];

  return (
    <div className="surface overflow-hidden rounded-2xl">
      <div className="border-iron flex items-center justify-between border-b px-5 py-4">
        <div>
          <p className="text-amber font-mono text-xs tracking-[0.08em] uppercase">
            Target workspace
          </p>
          <p className="text-canvas mt-1 text-sm">Software Engineer Intern</p>
        </div>
        <span className="border-sage/40 bg-sage/[0.08] text-sage rounded-full border px-3 py-1 font-mono text-[10px] uppercase">
          Plan synced
        </span>
      </div>
      <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[1fr_1.25fr]">
        <div>
          <p className="text-linen text-sm font-medium">Choose a role focus</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(plans) as Role[]).map((item) => (
              <button
                key={item}
                aria-pressed={role === item}
                onClick={() => setRole(item)}
                className={`min-h-11 rounded-lg border px-4 text-sm transition-colors ${role === item ? "border-amber bg-amber text-night" : "border-iron bg-raised text-canvas hover:border-canvas"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-8 flex items-end gap-3">
            <strong className="text-5xl font-semibold tracking-[-0.04em]">
              {plan.score}
            </strong>
            <span className="text-dust pb-1 font-mono text-xs">
              / 100 readiness
            </span>
          </div>
          <div className="bg-iron mt-4 h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-amber h-full rounded-full transition-all duration-500"
              style={{ width: `${plan.score}%` }}
            />
          </div>
        </div>
        <div className="border-iron bg-night/50 rounded-xl border p-5">
          <p className="text-dust font-mono text-[10px] tracking-[0.08em] uppercase">
            Highest-impact gap
          </p>
          <p className="mt-2 text-xl font-semibold tracking-[-0.02em]">
            {plan.gap}
          </p>
          <div className="bg-iron my-5 h-px" />
          <p className="text-canvas flex gap-3 text-sm leading-6">
            <Check
              className="text-sage mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            {plan.next}
          </p>
          <p className="text-amber mt-4 flex items-center gap-2 text-sm font-semibold">
            See today’s plan{" "}
            <ArrowRight className="size-4" aria-hidden="true" />
          </p>
        </div>
      </div>
    </div>
  );
}
