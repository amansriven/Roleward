import Link from "next/link";

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
      <svg
        className="size-7 shrink-0"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="9"
          fill="#191B20"
          stroke="#363941"
        />
        <path
          d="M9 8.5v15M9 9h6.3c3 0 4.7 1.4 4.7 3.5 0 1.55-.9 2.7-2.45 3.2 2.15.45 3.45 1.7 3.45 3.6 0 2.55-2.05 4.2-5.4 4.2H9"
          stroke="#DF7C68"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 15.7h5.1M10 22h5.6"
          stroke="#F5F2ED"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span className={cn("text-linen", compact && "sr-only")}>Backstage</span>
    </Link>
  );
}
