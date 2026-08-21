import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata;

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(223,124,104,.08),transparent_35%)]">
      <header className="border-iron/70 border-b px-5 py-5 sm:px-8">
        <Logo />
      </header>
      <div className="px-5 py-10 sm:px-8 sm:py-16">{children}</div>
    </main>
  );
}
