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
      className="border-iron/80 flex scrollbar-none gap-7 overflow-x-auto border-b"
    >
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
              "relative flex min-h-12 shrink-0 items-center gap-2 text-sm transition",
              active ? "text-linen" : "text-dust hover:text-canvas",
            )}
          >
            {item.label}
            {"count" in item && item.count && (
              <span className="bg-linen/[.06] rounded-full px-2 py-0.5 font-mono text-[10px]">
                {count}
              </span>
            )}
            {active && (
              <span className="bg-amber absolute inset-x-0 -bottom-px h-0.5 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
