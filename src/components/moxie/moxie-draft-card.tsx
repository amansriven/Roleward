"use client";

import { Check, Copy, FileText, RotateCcw, Undo2, X } from "lucide-react";
import { useState } from "react";
import type { MoxieDraftBlock } from "@/modules/moxie/blocks";
import {
  applyMoxieDraftBullet,
  findMoxieDraftTarget,
  type MoxieDraftApplication,
} from "@/modules/moxie/apply";

/**
 * Drafts are inert until the user accepts them. Apply shows the exact before
 * and after first, and the change stays undoable afterwards.
 */
export function MoxieDraftCard({
  block,
  onRevise,
}: {
  block: MoxieDraftBlock;
  onRevise?: (draft: MoxieDraftBlock) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [applied, setApplied] = useState<MoxieDraftApplication | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Only a draft naming an existing bullet can be applied.
  const target = block.bulletId ? findMoxieDraftTarget(block.bulletId) : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(block.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_500);
    } catch {
      setError("Could not copy that draft.");
    }
  }

  function accept() {
    if (!block.bulletId) return;
    try {
      setApplied(applyMoxieDraftBullet(block.bulletId, block.text));
      setConfirming(false);
      setError("");
    } catch {
      setError("That resume bullet could not be updated.");
    }
  }

  function undo() {
    if (!applied) return;
    try {
      applyMoxieDraftBullet(applied.bulletId, applied.previousContent);
      setApplied(null);
    } catch {
      setError("That change could not be undone.");
    }
  }

  return (
    <section className="border-iron/80 bg-linen/[.02] my-5 rounded-2xl border p-4">
      <header className="text-dust flex flex-wrap items-center gap-2 font-mono text-[9px] tracking-wider uppercase">
        <FileText className="text-amber size-3.5" />
        {block.label}
        {block.target && (
          <span className="border-iron/80 bg-raised/60 text-canvas rounded-full border px-2 py-0.5 normal-case">
            {block.target}
          </span>
        )}
      </header>

      <p className="text-linen mt-3 text-[13px] leading-6 whitespace-pre-wrap">
        {block.text}
      </p>

      {confirming && target && (
        <div className="border-amber/30 bg-amber/[.05] mt-3 rounded-xl border p-3">
          <p className="text-canvas text-[11px] leading-5">
            Replace this bullet in{" "}
            <span className="text-linen font-semibold">
              {target.versionName}
            </span>
            ?
          </p>
          <div className="mt-2 space-y-1.5">
            <p className="text-dust text-[11px] leading-5 line-through">
              {target.currentContent}
            </p>
            <p className="text-sage text-[11px] leading-5">{block.text}</p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={accept}
              className="bg-amber text-night flex min-h-7 items-center gap-1 rounded-lg px-2.5 text-[10px] font-semibold"
            >
              <Check className="size-3" /> Accept change
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="border-iron text-canvas hover:text-linen flex min-h-7 items-center gap-1 rounded-lg border px-2.5 text-[10px]"
            >
              <X className="size-3" /> Deny
            </button>
          </div>
        </div>
      )}

      <div className="border-iron/50 mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2.5">
        <button
          type="button"
          onClick={() => void copy()}
          className="border-iron text-canvas hover:border-canvas/40 hover:text-linen flex min-h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] transition"
        >
          {copied ? (
            <Check className="text-sage size-3" />
          ) : (
            <Copy className="size-3" />
          )}
          Copy
        </button>
        {onRevise && (
          <button
            type="button"
            onClick={() => onRevise(block)}
            className="border-iron text-canvas hover:border-canvas/40 hover:text-linen flex min-h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] transition"
          >
            <RotateCcw className="size-3" /> Revise
          </button>
        )}
        {applied ? (
          <>
            <span className="text-sage flex items-center gap-1 text-[10px] font-semibold">
              <Check className="size-3" /> Applied to {applied.versionName}
            </span>
            <button
              type="button"
              onClick={undo}
              className="text-dust hover:text-linen ml-auto flex min-h-7 items-center gap-1.5 rounded-lg px-2 text-[10px] transition"
            >
              <Undo2 className="size-3" /> Undo
            </button>
          </>
        ) : (
          target && (
            <button
              type="button"
              onClick={() => setConfirming((current) => !current)}
              className="bg-amber/90 text-night hover:bg-amber ml-auto flex min-h-7 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold transition"
            >
              Apply…
            </button>
          )
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
