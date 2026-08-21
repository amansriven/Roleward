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
        "inline-flex items-center gap-2.5 text-[1.28rem] font-semibold tracking-[-0.045em]",
        compact && "gap-0",
        className,
      )}
      href={href}
      aria-label={
        href === "/dashboard" ? "Roleward dashboard" : "Roleward home"
      }
    >
      <BrandMark className="size-8.5" />
      <span className={cn("text-linen", compact && "sr-only")}>Roleward</span>
    </Link>
  );
}
