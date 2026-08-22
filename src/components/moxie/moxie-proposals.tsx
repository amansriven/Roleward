"use client";

import { Brain, Check, LoaderCircle, Target, X } from "lucide-react";
import { useState } from "react";
import {
  moxieMemoryCategoryLabels,
  type MoxieMemory,
} from "@/modules/moxie/memory";
import type { MoxieGoal } from "@/modules/moxie/goal";
import type { MoxieProposal } from "@/modules/moxie/proposals";

type State = "pending" | "saving" | "saved" | "dismissed";

/**
 * A proposal is inert until confirmed here; the click is the approval that the
 * memory and goal routes record.
 */
export function MoxieProposals({
  proposals,
  sourceMessageId,
  conversationId,
  onSaved,
}: {
  proposals: MoxieProposal[];
  sourceMessageId?: string;
  conversationId?: string;
  onSaved?: () => void;
}) {
  const [states, setStates] = useState<Record<number, State>>({});
  const [error, setError] = useState("");

  async function confirm(proposal: MoxieProposal, index: number) {
    setStates((current) => ({ ...current, [index]: "saving" }));
    setError("");
    const request =
      proposal.kind === "memory"
        ? {
            url: "/api/moxie/memory",
            body: {
              category: proposal.category,
              statement: proposal.statement,
              ...(sourceMessageId ? { sourceMessageId } : {}),
            },
          }
        : {
            url: "/api/moxie/goals",
            body: {
              statement: proposal.statement,
              ...(proposal.targetDate
                ? { targetDate: proposal.targetDate }
                : {}),
              ...(conversationId
                ? { sourceConversationId: conversationId }
                : {}),
              milestones: [],
              linkedEntityIds: [],
            },
          };
    try {
      const response = await fetch(request.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request.body),
      });
      const body = (await response.json().catch(() => null)) as {
        memory?: MoxieMemory;
        goal?: MoxieGoal;
        error?: string;
      } | null;
      if (!response.ok) {
        setError(body?.error ?? "Moxie could not save that.");
        setStates((current) => ({ ...current, [index]: "pending" }));
        return;
      }
      setStates((current) => ({ ...current, [index]: "saved" }));
      onSaved?.();
    } catch {
      setError("Moxie could not reach your workspace.");
      setStates((current) => ({ ...current, [index]: "pending" }));
    }
  }

  const visible = proposals.filter(
    (_, index) => states[index] !== "dismissed",
  ).length;
  if (visible === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {proposals.map((proposal, index) => {
        const state = states[index] ?? "pending";
        if (state === "dismissed") return null;
        const isMemory = proposal.kind === "memory";
        return (
          <div
            key={`${proposal.kind}-${proposal.statement}`}
            className="border-iron/80 bg-linen/[.02] flex items-start gap-3 rounded-xl border px-3 py-2.5"
          >
            <span className="bg-sage/10 text-sage mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg">
              {isMemory ? (
                <Brain className="size-3.5" />
              ) : (
                <Target className="size-3.5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-dust font-mono text-[9px] tracking-wider uppercase">
                {isMemory
                  ? `Remember · ${moxieMemoryCategoryLabels[proposal.category]}`
                  : "Save as goal"}
              </span>
              <p className="text-canvas mt-1 text-xs leading-5">
                {proposal.statement}
                {!isMemory && proposal.targetDate && (
                  <span className="text-dust"> · by {proposal.targetDate}</span>
                )}
              </p>
            </div>
            {state === "saved" ? (
              <span className="text-sage flex shrink-0 items-center gap-1 text-[10px] font-semibold">
                <Check className="size-3.5" /> Saved
              </span>
            ) : (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => void confirm(proposal, index)}
                  disabled={state === "saving"}
                  className="bg-amber text-night flex min-h-7 items-center gap-1 rounded-lg px-2.5 text-[10px] font-semibold transition disabled:opacity-40"
                >
                  {state === "saving" ? (
                    <LoaderCircle className="size-3 animate-spin" />
                  ) : (
                    <Check className="size-3" />
                  )}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setStates((current) => ({
                      ...current,
                      [index]: "dismissed",
                    }))
                  }
                  aria-label={`Dismiss: ${proposal.statement}`}
                  className="text-dust hover:text-linen flex size-7 items-center justify-center rounded-lg transition"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
      {error && (
        <p role="alert" className="text-[11px] text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
