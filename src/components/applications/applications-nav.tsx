"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  loadWorkspace,
  workspaceUpdatedEvent,
} from "@/modules/workspace/repository";

const links = [
  { label: "Pipeline", href: "/dashboard/applications", count: true },
  {
    label: "Company research",
    href: "/dashboard/applications/research",
  },
  { label: "Timeline", href: "/dashboard/applications/timeline" },
  { label: "Progress", href: "/dashboard/applications/progress" },
] as const;

export function ApplicationsNav() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () =>
      setCount(loadWorkspace(localStorage).applications.length);
    queueMicrotask(refresh);
    window.addEventListener(workspaceUpdatedEvent, refresh);
    return () => window.removeEventListener(workspaceUpdatedEvent, refresh);
  }, []);

  return (
    <nav
      aria-label="Application workspace sections"
      className="surface scrollbar-none overflow-x-auto rounded-xl p-1.5"
    >
      <div className="flex min-w-max gap-1">
        {links.map((item) => {
          const active =
            item.href === "/dashboard/applications"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-all",
                active
                  ? "bg-linen/[.07] text-linen shadow-[inset_0_1px_0_rgba(255,255,255,.04)]"
                  : "text-dust hover:bg-linen/[.025] hover:text-canvas",
              )}
            >
              {item.label}
              {"count" in item && item.count && (
                <span className="bg-linen/[.06] rounded-full px-2 py-0.5 font-mono text-[10px]">
                  {count}
                </span>
              )}
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
