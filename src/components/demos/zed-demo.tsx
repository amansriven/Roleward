"use client";

import { CheckCircle2, Play, Terminal } from "lucide-react";
import { useState } from "react";

import { FeatureIcon } from "@/components/brand/feature-icon";
import { Button } from "@/components/ui/button";

export function ZedDemo() {
  const [ran, setRan] = useState(false);
  const [hint, setHint] = useState(false);
  return (
    <div className="surface overflow-hidden rounded-2xl">
      <div className="border-iron flex items-center justify-between border-b px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Terminal className="text-amber size-4" />
          Two Sum · Warm-up
        </p>
        <span className="text-dust font-mono text-[10px] uppercase">
          JavaScript
        </span>
      </div>
      <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
        <div
          className="bg-[#12110f] p-5 font-mono text-xs leading-6 sm:p-7"
          aria-label="Sample code editor"
        >
          <p>
            <span className="text-dust">01</span>{" "}
            <span className="text-amber">function</span>{" "}
            <span className="text-linen">twoSum(nums, target) {"{"}</span>
          </p>
          <p>
            <span className="text-dust">02</span>　
            <span className="text-amber">const</span> seen = new Map();
          </p>
          <p>
            <span className="text-dust">03</span>　
            <span className="text-amber">for</span> (let i = 0; i &lt;
            nums.length; i++) {"{"}
          </p>
          <p>
            <span className="text-dust">04</span>　　const needed = target -
            nums[i];
          </p>
          <p>
            <span className="text-dust">05</span>　　if (seen.has(needed))
            return [seen.get(needed), i];
          </p>
          <p>
            <span className="text-dust">06</span>　　seen.set(nums[i], i);
          </p>
          <p>
            <span className="text-dust">07</span>　{"}"}
          </p>
          <p>
            <span className="text-dust">08</span> {"}"}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button className="bg-amber" size="sm" onClick={() => setRan(true)}>
              <Play className="size-3.5" />
              Run samples
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setHint(true)}>
              Open hint 1
            </Button>
          </div>
        </div>
        <div className="border-iron border-t p-5 sm:p-7 lg:border-t-0 lg:border-l">
          <div className="flex items-center gap-2.5">
            <FeatureIcon feature="zed" size="md" active />
            <div>
              <p className="text-amber font-mono text-[10px] uppercase">Zed</p>
              <p className="text-dust text-[10px]">Your coding coach</p>
            </div>
          </div>
          <p className="text-canvas mt-3 text-sm leading-6">
            Explain why the map lookup keeps this solution linear.
          </p>
          {hint && (
            <p className="border-iron bg-raised text-linen mt-4 rounded-lg border p-3 text-sm leading-6">
              Hint: consider what one pass stores for future indices.
            </p>
          )}
          {ran && (
            <div
              className="border-sage/40 bg-sage/[0.06] mt-5 rounded-lg border p-4"
              aria-live="polite"
            >
              <p className="text-sage flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="size-4" />4 of 4 sample tests passed
              </p>
              <p className="text-canvas mt-2 text-xs leading-5">
                Next: test duplicate values and describe space complexity.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
