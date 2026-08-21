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
      className="surface -mt-3 overflow-x-auto rounded-xl p-1.5"
    >
      <div className="flex min-w-max gap-1">
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
                "relative flex min-h-10 items-center rounded-lg px-4 text-xs font-semibold transition-all",
                active
                  ? "bg-linen/[.07] text-linen shadow-[inset_0_1px_0_rgba(255,255,255,.04)]"
                  : "text-dust hover:bg-linen/[.025] hover:text-canvas",
              )}
            >
              {section.label}
              {active && (
                <span className="bg-amber absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
