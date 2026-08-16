"use client";

import { CheckCircle2, Database, FileText, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { EvidenceItem } from "@/modules/evidence/schema";

export function EvidenceLibrary() {
  const [items, setItems] = useState<EvidenceItem[] | null>(null);
  useEffect(() => {
    queueMicrotask(() =>
      setItems(
        JSON.parse(
          localStorage.getItem("sweet-plus:evidence-library") ?? "[]",
        ) as EvidenceItem[],
      ),
    );
  }, []);
  if (items === null)
    return (
      <div className="text-dust py-20 text-center text-sm">
        Loading evidence…
      </div>
    );
  if (!items.length)
    return (
      <div className="border-iron bg-workshop/70 rounded-2xl border py-20 text-center">
        <Database className="text-dust mx-auto size-7" />
        <h2 className="mt-5 text-xl font-semibold">
          Your evidence pantry is empty.
        </h2>
        <p className="text-canvas mx-auto mt-2 max-w-md text-sm leading-6">
          Import a résumé and confirm its claims. Nothing enters this library
          without your approval.
        </p>
        <Link
          href="/dashboard/resume-kitchen/intake"
          className="bg-copper text-night mt-6 inline-flex rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          Import résumé
        </Link>
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="border-iron bg-workshop/70 flex items-center gap-3 rounded-xl border px-4 py-3">
        <Search className="text-dust size-4" />
        <span className="text-dust text-sm">
          Search {items.length} experiences and their confirmed claims
        </span>
      </div>
      {items.map((item) => (
        <article
          key={item.id}
          className="border-iron bg-workshop/75 rounded-2xl border p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="text-copper size-4" />
                <h2 className="font-semibold">{item.title}</h2>
              </div>
              <p className="text-dust mt-1 pl-6 text-xs">
                {item.organization} · {item.type}
              </p>
            </div>
            <span className="text-sage flex items-center gap-1 text-[10px]">
              <CheckCircle2 className="size-3" /> user confirmed
            </span>
          </div>
          <p className="text-canvas mt-5 text-sm">{item.summary}</p>
          <ul className="mt-4 space-y-2">
            {item.claims.map((claim) => (
              <li
                key={claim.id}
                className="border-iron/60 text-canvas flex gap-3 rounded-lg border px-3 py-2.5 text-xs"
              >
                <span className="text-dust w-20 shrink-0 font-mono text-[9px] uppercase">
                  {claim.type}
                </span>
                <span>{claim.content}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
