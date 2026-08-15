import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";

import { AmbientWorkshopBackground } from "@/components/brand/ambient-background";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="isolate flex min-h-screen items-center justify-center px-5 py-12">
      <AmbientWorkshopBackground />
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <span className="text-dust flex items-center gap-2 font-mono text-[10px] tracking-[0.06em] uppercase">
            <LockKeyhole className="text-sage size-3.5" />
            Private workspace
          </span>
        </div>
        <div className="surface rounded-2xl p-7 sm:p-9">{children}</div>
        <p className="text-dust mt-6 text-center text-xs leading-5">
          Your résumé, stories, attempts, and recordings are treated as
          sensitive candidate data.
        </p>
      </div>
    </main>
  );
}
