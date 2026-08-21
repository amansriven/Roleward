"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const sections = [
  { label: "Overview", href: "/dashboard/evidence" },
  { label: "Experience", href: "/dashboard/evidence/experience" },
  { label: "Projects", href: "/dashboard/evidence/projects" },
  { label: "Education", href: "/dashboard/evidence/education" },
  { label: "Activities", href: "/dashboard/evidence/activities" },
  { label: "Skills", href: "/dashboard/evidence/skills" },
] as const;

export function EvidenceNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Evidence Library sections"
      className="border-iron/80 -mt-3 overflow-x-auto border-b"
    >
      <div className="flex min-w-max gap-7">
        {sections.map((section) => {
          const active =
            section.href === "/dashboard/evidence"
              ? pathname === section.href
              : pathname.startsWith(section.href);
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative py-4 text-sm font-medium transition-colors",
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
