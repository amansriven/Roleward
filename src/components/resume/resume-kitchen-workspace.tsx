"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  FileStack,
  FileText,
  Globe2,
  Layers3,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FeatureIcon } from "@/components/brand/feature-icon";
import { cn } from "@/lib/utils";
import type { JobRequirement } from "@/modules/applications/schema";
import type { EvidenceItem } from "@/modules/evidence/schema";
import { PortfolioPublish } from "./portfolio-publish";
import { ResumeVersionManager } from "./resume-version-manager";
import {
  getActiveApplication,
  getActiveResumeVersion,
  loadWorkspace,
  workspaceUpdatedEvent,
  type WorkspaceSnapshot,
} from "@/modules/workspace/repository";

interface Suggestion {
  bullet: string;
  usedClaimIds: string[];
  rationale: string;
}

/**
 * The real Resume Kitchen.
 *
 * What this replaces was a picture of the feature: fixed metrics, a fixed
 * company, a fixed suggested bullet, and buttons that did nothing. Everything
 * here comes from the candidate's own confirmed evidence and the requirements
 * read from the posting they actually saved.
 */
type ResumeKitchenView = "overview" | "versions" | "tailor" | "portfolio";

export function ResumeKitchenWorkspace({
  view = "overview",
}: {
  view?: ResumeKitchenView;
}) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  useEffect(() => {
    const refresh = () => setWorkspace(loadWorkspace(localStorage));
    queueMicrotask(refresh);
    window.addEventListener(workspaceUpdatedEvent, refresh);
    return () => window.removeEventListener(workspaceUpdatedEvent, refresh);
  }, []);

  if (!workspace)
    return (
      <div className="text-dust py-24 text-center text-sm">
        Opening your workspace…
      </div>
    );

  return <Kitchen workspace={workspace} view={view} />;
}

function confirmedClaims(evidence: EvidenceItem[]) {
  return evidence.flatMap((item) =>
    item.claims
      .filter(
        (claim) =>
          claim.verificationStatus === "confirmed" ||
          claim.verificationStatus === "corrected",
      )
      .map((claim) => ({
        id: claim.id,
        content: claim.content,
        itemTitle: [item.title, item.organization].filter(Boolean).join(" — "),
      })),
  );
}

function Kitchen({
  workspace,
  view,
}: {
  workspace: WorkspaceSnapshot;
  view: ResumeKitchenView;
}) {
  const application = getActiveApplication(workspace);
  const activeVersion = getActiveResumeVersion(workspace);
  const claims = useMemo(
    () => confirmedClaims(workspace.evidence),
    [workspace.evidence],
  );

  const requirements = application?.requirements ?? [];
  const covered = requirements.filter(
    (item) => item.matchStrength === "strong",
  ).length;
  const gaps = requirements.filter(
    (item) => item.importance === "required" && item.matchStrength !== "strong",
  );

  if (!workspace.evidence.length)
    return (
      <Empty
        icon={<FeatureIcon feature="resume-kitchen" size="lg" active />}
        title="Start with your résumé"
        copy="Everything here is built from experience you have confirmed. Import a résumé and check what we read from it."
        href="/dashboard/resume-kitchen/intake"
        action="Import résumé"
      />
    );

  if (view === "versions")
    return (
      <div className="space-y-6">
        <SectionHeading
          eyebrow="Versions"
          title="Your résumé workspace"
          copy="The original stays unchanged. Create and name revisions here, then edit each one independently."
        />
        <ResumeVersionManager workspace={workspace} />
      </div>
    );

  if (view === "tailor") {
    if (!application)
      return (
        <Empty
          icon={
            <span className="border-amber/30 bg-amber/10 text-amber inline-flex size-11 items-center justify-center rounded-xl border">
              <WandSparkles className="size-[18px]" strokeWidth={1.8} />
            </span>
          }
          title="Add the role you are targeting"
          copy={`You have ${claims.length} confirmed ${claims.length === 1 ? "claim" : "claims"}. Add a job posting and we will compare its requirements with your actual experience.`}
          href="/dashboard/applications/new"
          action="Add an application"
        />
      );

    return (
      <div className="space-y-7">
        <SectionHeading
          eyebrow="Tailor"
          title={`${application.roleTitle} at ${application.companyName}`}
          copy="Work through the requirements from this posting. Every suggestion must trace back to a claim you confirmed."
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Requirement coverage"
            value={`${covered} / ${requirements.length}`}
            note={
              gaps.length
                ? `${gaps.length} required ${gaps.length === 1 ? "gap" : "gaps"}`
                : "Every requirement matched"
            }
          />
          <Stat
            label="Confirmed claims"
            value={String(claims.length)}
            note={`Across ${workspace.evidence.length} ${workspace.evidence.length === 1 ? "entry" : "entries"}`}
          />
          <Stat
            label="Active version"
            value={activeVersion?.name ?? "Original résumé"}
            note={
              activeVersion?.kind === "revision"
                ? "Named revision"
                : "Protected original"
            }
          />
        </div>

        <div className="grid gap-7 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,.45fr)]">
          <div className="space-y-4">
            <div>
              <p className="font-semibold">Requirements from this posting</p>
              <p className="text-dust mt-1 max-w-2xl text-xs leading-5">
                Open one requirement at a time. If your evidence cannot support
                a bullet, Resume Kitchen will leave it blank.
              </p>
            </div>
            {requirements.map((requirement) => (
              <RequirementCard
                key={requirement.id}
                requirement={requirement}
                evidence={workspace.evidence}
                claims={claims}
              />
            ))}
            {requirements.length === 0 && (
              <p className="text-dust text-xs">
                No requirements were read from this posting.
              </p>
            )}
          </div>

          <aside className="space-y-4">
            <section className="backstage-card rounded-[22px] p-5">
              <FileText className="text-copper size-4" />
              <p className="mt-3 text-sm font-semibold">Evidence ready</p>
              <p className="text-dust mt-2 text-xs leading-5">
                {claims.length} confirmed{" "}
                {claims.length === 1 ? "claim is" : "claims are"} available for
                tailoring.
              </p>
              <Link
                href="/dashboard/evidence"
                className="text-copper mt-4 inline-flex items-center gap-1.5 text-xs font-semibold"
              >
                Review evidence <ArrowRight className="size-3" />
              </Link>
            </section>

            <section className="border-iron/75 rounded-[22px] border p-5">
              <ShieldCheck className="text-sage size-4" />
              <p className="mt-3 text-sm font-semibold">No invented claims</p>
              <p className="text-dust mt-2 text-xs leading-5">
                Unsupported figures and claims are rejected before they reach
                your résumé.
              </p>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  if (view === "portfolio")
    return (
      <div className="space-y-6">
        <SectionHeading
          eyebrow="Portfolio"
          title="A public page you control"
          copy="Publish only the experience you confirmed. Nothing goes live until you choose to publish it."
        />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,.75fr)]">
          <PortfolioPublish
            name={workspace.candidateName}
            headline={workspace.candidateHeadline}
            skills={workspace.candidateSkills}
            evidence={workspace.evidence}
          />
          <section className="border-iron/75 rounded-[22px] border p-5">
            <p className="section-label">What gets shared</p>
            <ul className="mt-4 space-y-3 text-sm">
              <PublishRule text="Your name, headline, and skills" />
              <PublishRule text="Only claims you confirmed or corrected" />
              <PublishRule text="No drafts or rejected claims" />
            </ul>
            <p className="text-dust mt-5 text-xs leading-5">
              You can update the page or take it down without losing its link.
            </p>
          </section>
        </div>
      </div>
    );

  const revisions = workspace.resumeVersions.filter(
    (version) => version.kind === "revision",
  ).length;

  return (
    <div className="space-y-9">
      <SectionHeading
        eyebrow="Overview"
        title="Everything has its place"
        copy="Choose the part of your résumé you want to work on. Your original and every named revision stay separate."
      />

      <section>
        <p className="section-label">At a glance</p>
        <div className="border-iron/75 divide-iron/75 mt-4 grid divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Summary
            label="Current version"
            value={activeVersion?.name ?? "Original résumé"}
            note={
              activeVersion?.kind === "revision"
                ? "Named revision"
                : "Original protected"
            }
          />
          <Summary
            label="Saved revisions"
            value={String(revisions)}
            note={
              revisions === 1
                ? "One version beside the original"
                : `${revisions} versions beside the original`
            }
          />
          <Summary
            label="Target role"
            value={application?.companyName ?? "Not selected"}
            note={application?.roleTitle ?? "Add an application when ready"}
          />
        </div>
      </section>

      <section>
        <div>
          <p className="section-label">Where to go next</p>
          <h2 className="mt-2 text-xl font-semibold">Pick one job to do.</h2>
        </div>
        <div className="border-iron/75 divide-iron/75 mt-4 divide-y border-y">
          <KitchenDestination
            icon={FileStack}
            title="Manage résumé versions"
            copy="Open the original, create a named revision, or continue editing one."
            href="/dashboard/resume-kitchen/versions"
          />
          <KitchenDestination
            icon={WandSparkles}
            title={
              application ? "Tailor to your active role" : "Tailor to a role"
            }
            copy={
              application
                ? `${application.roleTitle} at ${application.companyName}`
                : "Add a target role, then match its requirements to your evidence."
            }
            href="/dashboard/resume-kitchen/tailor"
          />
          <KitchenDestination
            icon={Globe2}
            title="Publish your portfolio"
            copy="Share a clean page built only from confirmed experience."
            href="/dashboard/resume-kitchen/portfolio"
          />
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="section-label">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em] sm:text-3xl">
        {title}
      </h2>
      <p className="text-canvas mt-2 text-sm leading-6">{copy}</p>
    </div>
  );
}

function Summary({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="min-w-0 px-1 py-5 first:pl-0 sm:px-6 sm:first:pl-0">
      <p className="text-dust text-[11px] tracking-[.08em] uppercase">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-semibold">{value}</p>
      <p className="text-dust mt-1 truncate text-xs">{note}</p>
    </div>
  );
}

function KitchenDestination({
  icon: Icon,
  title,
  copy,
  href,
}: {
  icon: typeof Layers3;
  title: string;
  copy: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group hover:bg-linen/[.025] flex items-center gap-4 py-5 transition-colors sm:px-3"
    >
      <span className="border-iron bg-raised text-copper flex size-10 shrink-0 items-center justify-center rounded-xl border">
        <Icon className="size-4" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="group-hover:text-amber block text-sm font-semibold transition-colors">
          {title}
        </span>
        <span className="text-dust mt-1 block text-xs leading-5">{copy}</span>
      </span>
      <ArrowRight className="text-dust size-4 shrink-0 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function PublishRule({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check className="text-sage mt-0.5 size-4 shrink-0" />
      <span>{text}</span>
    </li>
  );
}

function RequirementCard({
  requirement,
  evidence,
  claims,
}: {
  requirement: JobRequirement;
  evidence: EvidenceItem[];
  claims: { id: string; content: string; itemTitle: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState("");

  const supporting = evidence
    .flatMap((item) => item.claims)
    .filter((claim) => requirement.supportingClaimIds.includes(claim.id));

  async function draft() {
    setOpen(true);
    if (suggestions || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/resume/tailor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requirement: requirement.content, claims }),
      });
      const body = (await response.json().catch(() => null)) as {
        suggestions?: Suggestion[];
        rejected?: unknown[];
        error?: string;
      } | null;
      if (!response.ok) {
        setError(body?.error ?? "We could not draft a suggestion.");
        return;
      }
      setSuggestions(body?.suggestions ?? []);
    } catch {
      setError("We could not reach the tailor.");
    } finally {
      setBusy(false);
    }
  }

  const strength = requirement.matchStrength;

  return (
    <article className="backstage-card rounded-[22px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{requirement.content}</p>
          <p className="text-dust mt-1 text-[11px] capitalize">
            {requirement.category} · {requirement.importance}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
            strength === "strong" && "border-sage/40 text-sage",
            strength === "weak" && "border-copper/40 text-copper",
            strength === "none" && "border-iron text-dust",
          )}
        >
          {strength === "strong"
            ? "Evidence found"
            : strength === "weak"
              ? "Partial"
              : "No evidence"}
        </span>
      </div>

      {supporting.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {supporting.map((claim) => (
            <li key={claim.id} className="flex items-start gap-2 text-[11px]">
              <Check className="text-sage mt-0.5 size-3 shrink-0" />
              <span className="text-canvas">{claim.content}</span>
            </li>
          ))}
        </ul>
      )}

      {strength === "none" && (
        <div className="border-iron/70 mt-4 flex gap-3 rounded-xl border p-3">
          <AlertTriangle className="text-copper mt-0.5 size-3.5 shrink-0" />
          <p className="text-dust text-[11px] leading-5">
            Nothing you have confirmed speaks to this. That is worth knowing
            before the interview rather than after — it is a gap to go and fill,
            not a line to write around.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void draft()}
        disabled={busy || claims.length === 0}
        className="text-copper mt-4 inline-flex items-center gap-1.5 text-xs font-semibold disabled:opacity-40"
      >
        {busy ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <Sparkles className="size-3.5" />
        )}
        Draft a bullet for this
        {!busy && <ChevronRight className="size-3" />}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          {suggestions?.length === 0 && !error && (
            <p className="text-dust text-[11px] leading-5">
              Your confirmed experience does not support a bullet for this
              requirement. Rather than stretch one, we wrote nothing.
            </p>
          )}
          {suggestions?.map((suggestion) => (
            <div
              key={suggestion.bullet}
              className="border-copper/35 bg-copper/[.06] rounded-xl border p-4"
            >
              <p className="text-copper font-mono text-[10px] uppercase">
                Suggested
              </p>
              <p className="mt-2 text-sm leading-6">{suggestion.bullet}</p>
              <p className="text-dust mt-3 text-[11px] leading-5">
                {suggestion.rationale}
              </p>
              <div className="border-iron/50 mt-3 border-t pt-3">
                <p className="text-dust text-[10px]">
                  Built from {suggestion.usedClaimIds.length} confirmed{" "}
                  {suggestion.usedClaimIds.length === 1 ? "claim" : "claims"}:
                </p>
                <ul className="mt-1.5 space-y-1">
                  {suggestion.usedClaimIds.map((id) => (
                    <li key={id} className="text-canvas text-[10px]">
                      · {claims.find((claim) => claim.id === id)?.content ?? id}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard?.writeText(suggestion.bullet)
                }
                className="border-iron text-canvas hover:text-linen mt-3 rounded-lg border px-3 py-1.5 text-[11px] font-semibold"
              >
                Copy bullet
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <section className="backstage-card rounded-[22px] p-5">
      <p className="section-label">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold">{value}</p>
      <p className="text-dust mt-1 text-xs">{note}</p>
    </section>
  );
}

function Empty({
  icon,
  title,
  copy,
  href,
  action,
}: {
  icon?: ReactNode;
  title: string;
  copy: string;
  href: string;
  action: string;
}) {
  return (
    <section className="backstage-card rounded-[22px] p-8 text-center">
      {icon && <div className="mb-5 flex justify-center">{icon}</div>}
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-canvas mx-auto mt-2 max-w-md text-sm leading-6">
        {copy}
      </p>
      <Link
        href={href}
        className="bg-amber text-night mt-6 inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold"
      >
        {action}
      </Link>
    </section>
  );
}
