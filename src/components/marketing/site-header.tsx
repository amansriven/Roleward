import { Menu } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const nav = [
  ["Resume Kitchen", "/resume-kitchen"],
  ["Guru", "/guru"],
  ["Stage Fright", "/stage-fright"],
  ["How it works", "/how-it-works"],
  ["Pricing", "/pricing"],
] as const;

export function SiteHeader() {
  return (
    <header className="border-iron/70 bg-night/88 sticky top-0 z-50 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <Logo />
        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Primary navigation"
        >
          {nav.map(([label, href]) => (
            <Link
              key={href}
              className="text-canvas hover:bg-linen/[0.04] hover:text-linen rounded-lg px-3 py-2 text-sm transition-colors"
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Button asChild size="sm" variant="quiet">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Start preparing</Link>
          </Button>
        </div>
        <details className="relative sm:hidden">
          <summary className="border-iron bg-raised flex size-11 list-none items-center justify-center rounded-lg border [&::-webkit-details-marker]:hidden">
            <Menu className="size-5" aria-hidden="true" />
            <span className="sr-only">Open navigation</span>
          </summary>
          <nav
            className="surface absolute top-14 right-0 w-64 rounded-xl p-2"
            aria-label="Mobile navigation"
          >
            {nav.map(([label, href]) => (
              <Link
                key={href}
                className="text-canvas hover:bg-raised hover:text-linen block rounded-lg px-4 py-3 text-sm"
                href={href}
              >
                {label}
              </Link>
            ))}
            <div className="border-iron mt-2 border-t pt-2">
              <Link
                className="text-canvas block rounded-lg px-4 py-3 text-sm"
                href="/login"
              >
                Log in
              </Link>
              <Link
                className="bg-amber text-night block rounded-lg px-4 py-3 text-sm font-semibold"
                href="/signup"
              >
                Start preparing
              </Link>
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}
