import type { ReactNode } from "react";
import { Code2 } from "lucide-react";
import { PageIntro } from "@/components/workspace/dashboard-ui";
import { ZedNav } from "@/components/zed/zed-nav";

export default function ZedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-8">
      <PageIntro
        icon={
          <span className="border-amber/25 bg-amber/[.07] text-amber flex size-16 shrink-0 items-center justify-center rounded-2xl border shadow-[0_12px_40px_rgba(255,122,89,.08)]">
            <Code2 className="size-7" aria-hidden="true" />
          </span>
        }
        eyebrow="Zed · Technical coach"
        title="Build interview instincts."
        copy="Recognize the pattern, commit to a plan, solve under pressure, and turn every attempt into a clearer signal."
      />
      <ZedNav />
      {children}
    </div>
  );
}
