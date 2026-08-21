"use client";

import {
  AlertTriangle,
  Check,
  LoaderCircle,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { EvidenceItem } from "@/modules/evidence/schema";
import { scoreResume, type Finding } from "@/modules/resume-kitchen/scoring";

interface Rewrite {
  improved: string;
  changed: string;
  askFor: string;
  rejected?: boolean;
}

/**
 * The resume's score, and the specific lines responsible for it.
 *
 * Every deduction names the bullets it came from, so the score is a to-do list
 * rather than a verdict. That is also why it is computed here rather than asked
 * of a model: a number that changes between runs cannot be worked through.
 */
export function ResumeScore({
  evidence,
  skillCount = 0,
}: {
  evidence: EvidenceItem[];
  skillCount?: number;
}) {
  const [openFinding, setOpenFinding] = useState<string | null>(null);

  const claims = useMemo(
    () =>
      evidence.flatMap((item) =>
        item.claims
          .filter(
            (claim) =>
              claim.verificationStatus === "confirmed" ||
              claim.verificationStatus === "corrected",
          )
          .map((claim) => ({
            id: claim.id,
            content: claim.content,
            itemId: item.id,
            itemTitle: item.title,
          })),
      ),
    [evidence],
  );

  const score = useMemo(
    () =>
      scoreResume({
        claims,
        hasExperience: evidence.some((item) => item.type === "experience"),
        hasProjects: evidence.some((item) => item.type === "project"),
        skillCount,
      }),
    [claims, evidence, skillCount],
  );

  if (!claims.length) return null;

  return (
    <section className="backstage-card rounded-[22px] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">Resume score</p>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold">{score.total}</p>
          <p
            className={cn(
              "text-[10px] capitalize",
              score.band === "strong" && "text-sage",
              score.band === "getting there" && "text-copper",
              score.band === "needs work" && "text-dust",
            )}
          >
            {score.band}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {score.dimensions.map((dimension) => (
          <div key={dimension.key}>
            <div className="flex justify-between gap-3 text-[11px]">
              <span className="text-canvas">{dimension.label}</span>
              <span className="text-dust font-mono">
                {dimension.score}/{dimension.max}
              </span>
            </div>
            <div className="bg-iron mt-1 h-1 rounded-full">
              <div
                className={cn(
                  "h-full rounded-full",
                  dimension.score / dimension.max >= 0.7
                    ? "bg-sage"
                    : "bg-copper",
                )}
                style={{
                  width: `${(dimension.score / dimension.max) * 100}%`,
                }}
              />
            </div>
            <p className="text-dust mt-1 text-[10px]">{dimension.detail}</p>
          </div>
        ))}
      </div>

      {score.findings.length > 0 && (
        <div className="border-iron/60 mt-5 border-t pt-5">
          <p className="section-label">What to fix</p>
          <div className="mt-3 space-y-2">
            {score.findings.map((finding) => (
              <FindingRow
                key={finding.id}
                finding={finding}
                claims={claims}
                open={openFinding === finding.id}
                onToggle={() =>
                  setOpenFinding(openFinding === finding.id ? null : finding.id)
                }
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function FindingRow({
  finding,
  claims,
  open,
  onToggle,
}: {
  finding: Finding;
  claims: { id: string; content: string; itemTitle: string }[];
  open: boolean;
  onToggle: () => void;
}) {
  const affected = claims.filter((claim) =>
    finding.claimIds.includes(claim.id),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [rewrites, setRewrites] = useState<Record<string, Rewrite>>({});
  const [busy, setBusy] = useState(false);

  /**
   * Rewrites only what was ticked.
   *
   * A finding can name a dozen bullets, and most of them are not the ones the
   * candidate wants touched — some are fine as they are, some they would rather
   * edit themselves. Nothing here is sent to a model without being chosen.
   */
  async function rewriteSelected() {
    setBusy(true);
    try {
      const targets = affected.filter((claim) => selected.includes(claim.id));
      // Sequential rather than parallel: a handful of short calls, and the
      // results appearing one at a time reads as progress rather than a stall.
      for (const claim of targets) {
        const response = await fetch("/api/resume/improve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            bullet: claim.content,
            context: claim.itemTitle,
          }),
        });
        const body = (await response
          .json()
          .catch(() => null)) as Rewrite | null;
        if (body) setRewrites((current) => ({ ...current, [claim.id]: body }));
      }
      setSelected([]);
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <div className="border-iron/60 rounded-xl border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2.5 p-3 text-left"
      >
        <AlertTriangle
          className={cn(
            "mt-0.5 size-3.5 shrink-0",
            finding.severity === "high" ? "text-copper" : "text-dust",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold">
            {finding.title}
          </span>
          {open && (
            <span className="text-dust mt-1 block text-[11px] leading-5">
              {finding.detail}
            </span>
          )}
        </span>
      </button>

      {open && affected.length > 0 && (
        <div className="border-iron/50 border-t p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-dust text-[10px]">
              Pick the ones you want rewritten. The rest are left alone.
            </p>
            {affected.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setSelected(
                    selected.length === affected.length
                      ? []
                      : affected.map((claim) => claim.id),
                  )
                }
                className="text-dust hover:text-canvas shrink-0 text-[10px]"
              >
                {selected.length === affected.length ? "Clear" : "Select all"}
              </button>
            )}
          </div>

          <div className="mt-2.5 space-y-2">
            {affected.map((claim) => (
              <BulletRow
                key={claim.id}
                claim={claim}
                selected={selected.includes(claim.id)}
                onToggle={() => toggle(claim.id)}
                rewrite={rewrites[claim.id]}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => void rewriteSelected()}
            disabled={busy || selected.length === 0}
            className="bg-copper text-night mt-3 inline-flex min-h-8 items-center gap-2 rounded-lg px-3 text-[11px] font-semibold disabled:opacity-40"
          >
            {busy ? (
              <LoaderCircle className="size-3 animate-spin" />
            ) : (
              <Wand2 className="size-3" />
            )}
            {busy
              ? "Rewriting…"
              : selected.length
                ? `Rewrite ${selected.length} selected`
                : "Rewrite selected"}
          </button>
        </div>
      )}
    </div>
  );
}

function BulletRow({
  claim,
  selected,
  onToggle,
  rewrite,
}: {
  claim: { id: string; content: string; itemTitle: string };
  selected: boolean;
  onToggle: () => void;
  rewrite?: Rewrite;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg border p-2.5 transition",
        selected ? "border-copper/50 bg-copper/[.04]" : "border-iron/50",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2.5 text-left"
      >
        <span
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
            selected ? "border-copper bg-copper" : "border-iron",
          )}
        >
          {selected && <Check className="text-night size-3" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-canvas block text-[11px] leading-5">
            {claim.content}
          </span>
          <span className="text-dust mt-1 block text-[10px]">
            {claim.itemTitle}
          </span>
        </span>
      </button>

      {rewrite?.improved && (
        <div className="border-copper/30 bg-copper/[.06] mt-2 rounded-lg border p-2.5">
          <p className="text-sm leading-6">{rewrite.improved}</p>
          <p className="text-dust mt-2 text-[10px] leading-4">
            {rewrite.changed}
          </p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(rewrite.improved);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
            className="border-iron text-canvas mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold"
          >
            {copied ? <Check className="size-2.5" /> : null}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      {rewrite?.askFor && (
        <p className="border-iron/50 text-canvas mt-2 rounded-lg border p-2.5 text-[11px] leading-5">
          <Sparkles className="text-copper mr-1.5 inline size-3" />
          {rewrite.askFor}
          <span className="text-dust mt-1 block text-[10px]">
            We will not guess this for you. Answer it and edit the bullet in
            your evidence library.
          </span>
        </p>
      )}

      {rewrite && !rewrite.improved && !rewrite.askFor && (
        <p className="text-dust mt-2 text-[10px]">
          This one cannot be improved without inventing something, so we left it
          alone.
        </p>
      )}
    </div>
  );
}
