import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      className={cn(
        "inline-flex items-center gap-2.5 text-xl font-semibold tracking-[-0.035em]",
        className,
      )}
      href="/"
      aria-label="Sweet+ home"
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
          fill="#211E1A"
          stroke="#514B43"
        />
        <path
          d="M8 11.5h7.25c2.9 0 4.75 1.35 4.75 3.55 0 2.15-1.8 3.45-4.65 3.45H13.2c-1.55 0-2.45.7-2.45 1.85 0 1.1.9 1.65 2.45 1.65H24"
          stroke="#E8A64B"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M23 8v6M20 11h6"
          stroke="#79A897"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span>
        <span className="text-amber">Swe</span>
        <span className="text-linen">et+</span>
      </span>
    </Link>
  );
}
