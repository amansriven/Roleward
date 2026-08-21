import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  compact = false,
  href = "/",
}: {
  className?: string;
  compact?: boolean;
  href?: string;
}) {
  return (
    <Link
      className={cn(
        "inline-flex items-center gap-2.5 text-xl font-semibold tracking-[-0.035em]",
        compact && "gap-0",
        className,
      )}
      href={href}
      aria-label={
        href === "/dashboard" ? "Backstage dashboard" : "Backstage home"
      }
    >
      <BrandMark className="size-8" />
      <span className={cn("text-linen", compact && "sr-only")}>Backstage</span>
    </Link>
  );
}
