import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AmbientWorkshopBackground } from "@/components/brand/ambient-background";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="isolate min-h-screen px-5 py-6 sm:px-8 sm:py-8">
      <AmbientWorkshopBackground />
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Logo />
          <Link
            className="text-canvas hover:text-linen flex items-center gap-2 text-sm transition-colors"
            href="/"
          >
            <ArrowLeft className="size-4" /> Back to Backstage
          </Link>
        </header>
        <div className="flex flex-1 items-center py-10">{children}</div>
      </div>
    </main>
  );
}
