"use client";

import {
  Check,
  Database,
  FileText,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { EvidenceItem } from "@/modules/evidence/schema";
import {
  loadWorkspace,
  saveEvidenceAndRefresh,
  workspaceUpdatedEvent,
  type WorkspaceSnapshot,
} from "@/modules/workspace/repository";

type Filter = "all" | "confirmed" | "proposed";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "confirmed",
  corrected: "you edited this",
  proposed: "not confirmed",
  rejected: "rejected",
};

/**
 * The evidence library.
 *
 * It is the one store the rest of the product reads from: Resume Kitchen
 * tailors from it, Stage Fright grounds its questions in it, and the portfolio
 * publishes it. That makes what is in here consequential, which is why it is
 * editable and deletable rather than a read-only list of what a parser
 * happened to find.
 */
export function EvidenceLibrary() {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const refresh = () => setWorkspace(loadWorkspace(localStorage));
    queueMicrotask(refresh);
    window.addEventListener(workspaceUpdatedEvent, refresh);
    return () => window.removeEventListener(workspaceUpdatedEvent, refresh);
  }, []);

  // Stabilised, or the filtering below re-runs on every render.
  const items = useMemo(() => workspace?.evidence ?? [], [workspace?.evidence]);

  /** Which requirements each claim is currently supporting, across every application. */
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const application of workspace?.applications ?? [])
      for (const requirement of application.requirements)
        for (const claimId of requirement.supportingClaimIds)
          counts.set(claimId, (counts.get(claimId) ?? 0) + 1);
    return counts;
  }, [workspace?.applications]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .map((item) => ({
        ...item,
        claims: item.claims.filter((claim) => {
          if (filter === "confirmed")
            return (
              claim.verificationStatus === "confirmed" ||
              claim.verificationStatus === "corrected"
            );
          if (filter === "proposed")
            return claim.verificationStatus === "proposed";
          return true;
        }),
      }))
      .filter((item) => {
        if (!needle) return item.claims.length > 0;
        const haystack = [
          item.title,
          item.organization ?? "",
          item.summary,
          item.type,
          ...item.claims.map((claim) => claim.content),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle) && item.claims.length > 0;
      });
  }, [items, query, filter]);

  function persist(next: EvidenceItem[]) {
    // Saving re-runs requirement matching, so deleting a claim immediately
    // shows up as a gap on any application that was relying on it.
    saveEvidenceAndRefresh(localStorage, next);
    setWorkspace(loadWorkspace(localStorage));
  }

  if (workspace === null)
    return (
      <div className="text-dust py-20 text-center text-sm">
        Loading evidence…
      </div>
    );

  if (!items.length)
    return (
      <div className="backstage-card rounded-[22px] py-20 text-center">
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

  const claimCount = items.reduce(
    (count, item) => count + item.claims.length,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="border-iron bg-workshop/70 flex flex-1 items-center gap-3 rounded-xl border px-4">
          <Search className="text-dust size-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${items.length} entries and ${claimCount} claims`}
            aria-label="Search evidence"
            className="text-canvas placeholder:text-dust w-full bg-transparent py-3 text-sm outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-dust hover:text-canvas shrink-0"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="border-iron bg-workshop/70 flex shrink-0 items-center gap-1 rounded-xl border p-1">
          {(["all", "confirmed", "proposed"] as Filter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold capitalize transition",
                filter === option
                  ? "bg-copper/15 text-linen"
                  : "text-dust hover:text-canvas",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 && (
        <p className="text-dust py-12 text-center text-sm">
          Nothing matches {query ? `"${query}"` : "that filter"}.
        </p>
      )}

      {visible.map((item) => (
        <EvidenceCard
          key={item.id}
          item={item}
          usage={usage}
          onChange={(next) =>
            persist(items.map((entry) => (entry.id === item.id ? next : entry)))
          }
          onDelete={() =>
            persist(items.filter((entry) => entry.id !== item.id))
          }
        />
      ))}
    </div>
  );
}

function EvidenceCard({
  item,
  usage,
  onChange,
  onDelete,
}: {
  item: EvidenceItem;
  usage: Map<string, number>;
  onChange: (item: EvidenceItem) => void;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <article className="border-iron bg-workshop/75 rounded-2xl border p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="text-copper size-4 shrink-0" />
            <h2 className="truncate font-semibold">{item.title}</h2>
          </div>
          <p className="text-dust mt-1 pl-6 text-xs">
            {[item.organization, item.type].filter(Boolean).join(" · ")}
          </p>
        </div>

        {confirmingDelete ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-dust text-[10px]">Delete this entry?</span>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md bg-red-500/15 px-2 py-1 text-[10px] font-semibold text-red-400"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-dust hover:text-canvas text-[10px]"
            >
              Keep
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete ${item.title}`}
            className="text-dust hover:text-canvas shrink-0"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      <p className="text-canvas mt-5 text-sm">{item.summary}</p>

      <ul className="mt-4 space-y-2">
        {item.claims.map((claim) => (
          <ClaimRow
            key={claim.id}
            claim={claim}
            usedBy={usage.get(claim.id) ?? 0}
            onChange={(next) =>
              onChange({
                ...item,
                claims: item.claims.map((entry) =>
                  entry.id === claim.id ? next : entry,
                ),
              })
            }
            onDelete={() =>
              onChange({
                ...item,
                claims: item.claims.filter((entry) => entry.id !== claim.id),
              })
            }
          />
        ))}
      </ul>
    </article>
  );
}

function ClaimRow({
  claim,
  usedBy,
  onChange,
  onDelete,
}: {
  claim: EvidenceItem["claims"][number];
  usedBy: number;
  onChange: (claim: EvidenceItem["claims"][number]) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(claim.content);

  const confirmed =
    claim.verificationStatus === "confirmed" ||
    claim.verificationStatus === "corrected";

  function save() {
    const content = draft.trim();
    if (!content) return;
    onChange({
      ...claim,
      content,
      // Editing is confirming in your own words, which is the strongest signal
      // this library holds — it is the wording the candidate chose.
      verificationStatus:
        content === claim.content ? claim.verificationStatus : "corrected",
    });
    setEditing(false);
  }

  return (
    <li className="border-iron/60 rounded-lg border px-3 py-2.5">
      <div className="flex gap-3">
        <span className="text-dust w-20 shrink-0 pt-0.5 font-mono text-[9px] uppercase">
          {claim.type}
        </span>

        {editing ? (
          <div className="min-w-0 flex-1">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              aria-label="Edit claim"
              className="border-iron bg-night/40 text-canvas w-full rounded-md border p-2 text-xs outline-none"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={save}
                className="bg-copper text-night rounded-md px-2.5 py-1 text-[10px] font-semibold"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(claim.content);
                  setEditing(false);
                }}
                className="text-dust hover:text-canvas text-[10px]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-canvas text-xs leading-5">{claim.content}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className={cn(
                  "flex items-center gap-1 text-[9px]",
                  confirmed ? "text-sage" : "text-dust",
                )}
              >
                {confirmed && <Check className="size-2.5" />}
                {STATUS_LABELS[claim.verificationStatus] ??
                  claim.verificationStatus}
              </span>
              {usedBy > 0 && (
                <span className="text-copper text-[9px]">
                  supporting {usedBy} requirement{usedBy === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        )}

        {!editing && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit claim"
              className="text-dust hover:text-canvas"
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete claim"
              className="text-dust hover:text-canvas"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
