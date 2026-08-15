"use client";

import { Check, FileText } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ResumeDemo() {
  const [seasoned, setSeasoned] = useState(false);
  return (
    <div className="surface overflow-hidden rounded-2xl">
      <div className="border-iron flex items-center justify-between border-b px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="tool-accent size-4" aria-hidden="true" />
          Résumé suggestion
        </p>
        <span className="text-dust font-mono text-[10px] tracking-[0.08em] uppercase">
          Requirement 04
        </span>
      </div>
      <div className="grid md:grid-cols-[1.15fr_0.85fr]">
        <div className="p-5 sm:p-7">
          <p className="text-dust font-mono text-[10px] uppercase">
            Current bullet
          </p>
          <p className="border-iron text-canvas mt-3 border-l-2 pl-4 text-sm leading-7">
            Led a team project and improved the onboarding experience.
          </p>
          {seasoned && (
            <div className="border-sage/40 bg-sage/[0.06] mt-6 rounded-xl border p-4">
              <p className="text-sage font-mono text-[10px] uppercase">
                Evidence-backed revision
              </p>
              <p className="text-linen mt-2 text-sm leading-7">
                Led a five-person engineering team to rebuild onboarding for 40
                students, reducing setup time from two days to four hours.
              </p>
            </div>
          )}
          <Button
            className="tool-button mt-6"
            onClick={() => setSeasoned(true)}
            disabled={seasoned}
          >
            {seasoned ? "Suggestion ready" : "Season this bullet"}
          </Button>
        </div>
        <div className="border-iron bg-raised border-t p-5 sm:p-7 md:border-t-0 md:border-l">
          <p className="tool-accent font-mono text-[10px] uppercase">
            Why this is safe
          </p>
          <ul className="text-canvas mt-4 space-y-4 text-sm leading-6">
            <li className="flex gap-3">
              <Check className="text-sage mt-1 size-4 shrink-0" />
              Matches leadership requirement
            </li>
            <li className="flex gap-3">
              <Check className="text-sage mt-1 size-4 shrink-0" />
              Uses only verified metrics
            </li>
            <li className="flex gap-3">
              <Check className="text-sage mt-1 size-4 shrink-0" />
              Evidence: 40 students, five teams
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
