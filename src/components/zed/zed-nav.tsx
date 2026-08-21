"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const sections = [
  { label: "Practice", href: "/dashboard/zed" },
  { label: "LeetCode companion", href: "/dashboard/zed/companion" },
  { label: "Progress", href: "/dashboard/zed/progress" },
  { label: "History", href: "/dashboard/zed/history" },
] as const;

export function ZedNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Zed sections"
      className="border-iron/80 -mt-3 overflow-x-auto border-b"
    >
      <div className="flex min-w-max gap-8">
        {sections.map((section) => {
          const active =
            section.href === "/dashboard/zed"
              ? pathname === section.href
              : pathname.startsWith(section.href);
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative py-4 text-sm font-medium transition-colors duration-200",
                active ? "text-linen" : "text-dust hover:text-canvas",
              )}
            >
              {section.label}
              {active && (
                <span className="bg-amber absolute inset-x-0 bottom-0 h-0.5 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
