"use client";

import { Check, ExternalLink, Globe, LoaderCircle, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import type { EvidenceItem } from "@/modules/evidence/schema";
import type { CandidateContact } from "@/modules/candidates/contact";
import { deriveHandle } from "@/modules/portfolio/handle";
import type { Portfolio } from "@/modules/portfolio/schema";
import type { CandidateSkillGroup } from "@/modules/workspace/repository";

/**
 * Publishing a portfolio built from confirmed evidence.
 *
 * Off by default and opt-in every time. Content on a shared domain is the
 * operator's problem as much as the candidate's, so nothing goes public
 * because a page was visited — only because a button was pressed.
 */
export function PortfolioPublish({
  name,
  headline,
  skills,
  contact,
  evidence,
}: {
  name: string | null;
  headline: string | null;
  skills: CandidateSkillGroup[];
  contact: CandidateContact | null;
  evidence: EvidenceItem[];
}) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/portfolio")
      .then((response) => response.json())
      .then((body: { portfolio?: Portfolio | null }) => {
        if (active) setPortfolio(body.portfolio ?? null);
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Only confirmed claims travel. A proposed claim is one the candidate has not
  // agreed to yet, and this page is the most public thing the product makes.
  const items = evidence
    .map((item) => ({
      type: item.type,
      title: item.title,
      organization: item.organization,
      period: item.period,
      location: item.location,
      links: item.links,
      education: item.education,
      summary: item.summary,
      claims: item.claims
        .filter(
          (claim) =>
            claim.verificationStatus === "confirmed" ||
            claim.verificationStatus === "corrected",
        )
        .map((claim) => ({ content: claim.content })),
    }))
    .filter(
      (item) =>
        item.claims.length > 0 ||
        Boolean(item.education) ||
        item.links.length > 0,
    );

  const ready = Boolean(name) && items.length > 0;
  const url = portfolio
    ? `${typeof window === "undefined" ? "" : window.location.origin}/p/${portfolio.handle}`
    : name
      ? `/p/${deriveHandle(name) || "your-name"}`
      : null;

  async function send(action: "publish" | "unpublish") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          action === "publish"
            ? {
                action,
                name,
                headline: headline ?? "",
                contact,
                skills,
                items,
              }
            : { action },
        ),
      });
      const body = (await response.json().catch(() => null)) as {
        portfolio?: Portfolio | null;
        error?: string;
      } | null;
      if (!response.ok) {
        setError(body?.error ?? "That did not work.");
        return;
      }
      setPortfolio(body?.portfolio ?? null);
    } catch {
      setError("We could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  const live = portfolio?.published === true;

  return (
    <section className="roleward-card rounded-[22px] p-5">
      <div className="flex items-center gap-2">
        {live ? (
          <Globe className="text-sage size-4" />
        ) : (
          <Lock className="text-dust size-4" />
        )}
        <p className="font-semibold">Portfolio page</p>
      </div>

      {!ready ? (
        <p className="text-dust mt-2 text-xs leading-5">
          {name
            ? "Confirm some claims from your resume and this can go live."
            : "Import a resume so we know your name, and this can go live."}
        </p>
      ) : (
        <>
          <p className="text-dust mt-2 text-xs leading-5">
            {live
              ? "Live. Every line on it comes from a claim you confirmed."
              : `Publish ${items.length} confirmed ${items.length === 1 ? "entry" : "entries"} as a page you can send to employers. Nothing proposed is included.`}
          </p>

          {url && (
            <p className="border-iron/70 text-canvas mt-4 truncate rounded-lg border px-3 py-2 font-mono text-[11px]">
              {url.replace(/^https?:\/\//, "")}
            </p>
          )}

          {error && <p className="mt-3 text-[11px] text-red-400">{error}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void send("publish")}
              disabled={busy}
              className="bg-copper text-night inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold disabled:opacity-40"
            >
              {busy ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Globe className="size-3.5" />
              )}
              {live ? "Update page" : "Publish page"}
            </button>

            {live && portfolio && (
              <>
                <a
                  href={`/p/${portfolio.handle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="border-iron text-canvas hover:text-linen inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold"
                >
                  View <ExternalLink className="size-3" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(url ?? "");
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  }}
                  className="border-iron text-canvas hover:text-linen inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold"
                >
                  {copied ? <Check className="size-3" /> : null}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  onClick={() => void send("unpublish")}
                  disabled={busy}
                  className="text-dust hover:text-canvas px-2 text-xs disabled:opacity-40"
                >
                  Take it down
                </button>
              </>
            )}
          </div>

          {live && (
            <p className="text-dust mt-3 text-[10px] leading-4">
              Taking it down keeps your address, so republishing later returns
              you to the same link.
            </p>
          )}
        </>
      )}
    </section>
  );
}
