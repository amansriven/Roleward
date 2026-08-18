"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Link2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { EvidenceItem } from "@/modules/evidence/schema";
import type { JobRequirement } from "@/modules/applications/schema";
import {
  extractRequirements,
  hashDescription,
  matchRequirements,
  targetApplicationSchema,
  type TargetApplication,
} from "@/modules/applications/workflow";
import { assessReadiness } from "@/modules/readiness/model";
import { saveApplication } from "@/modules/workspace/repository";

type Step = "job" | "requirements" | "map";
const sampleDescription =
  "We are looking for a Software Engineer to build scalable backend services and APIs using Node.js and TypeScript. You will work with PostgreSQL databases, apply strong data structures and algorithms fundamentals, and collaborate with cross-functional engineering teams. Experience designing reliable distributed systems is preferred.";

export function ApplicationIntakeFlow() {
  const [step, setStep] = useState<Step>("job");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [application, setApplication] = useState<TargetApplication | null>(
    null,
  );
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [extracting, setExtracting] = useState(false);
  /** True when the posting could not be read and the keyword guess was used. */
  const [fellBack, setFellBack] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    setError("");
    try {
      const contentHash = await hashDescription(description);
      const existing = localStorage.getItem("sweet-plus:job-hash");
      if (existing === contentHash) {
        setError(
          "You already added this exact job description. We’ll reuse its requirement snapshot.",
        );
      }
      const next = targetApplicationSchema.parse({
        id: crypto.randomUUID(),
        companyName: company,
        roleTitle: role,
        sourceUrl: "",
        deadline: deadline || undefined,
        status: "preparing",
        jobDescription: description,
        contentHash,
        createdAt: new Date().toISOString(),
      });
      setApplication(next);
      localStorage.setItem("sweet-plus:job-hash", contentHash);
      setStep("requirements");

      // Read from the posting itself. The keyword table this replaced returned
      // the same five canned requirements whenever it failed to match, so a
      // posting for one kind of role produced requirements for another.
      setExtracting(true);
      try {
        const response = await fetch("/api/resume/requirements", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jobDescription: description }),
        });
        const body = (await response.json().catch(() => null)) as {
          requirements?: JobRequirement[];
          error?: string;
        } | null;
        if (response.ok && body?.requirements?.length)
          setRequirements(body.requirements);
        else {
          // Falling back is better than an empty screen, but the candidate is
          // told these were guessed rather than read.
          setRequirements(extractRequirements(description));
          setFellBack(true);
        }
      } catch {
        setRequirements(extractRequirements(description));
        setFellBack(true);
      } finally {
        setExtracting(false);
      }
    } catch {
      setError(
        "Add a company, role, and at least a short job description (80 characters). ",
      );
    }
  }
  function update(id: string, patch: Partial<JobRequirement>) {
    setRequirements((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }
  function buildMap() {
    const confirmed = requirements.filter((item) => item.confirmed);
    if (!confirmed.length) {
      setError("Confirm at least one requirement before continuing.");
      return;
    }
    const evidence = JSON.parse(
      localStorage.getItem("sweet-plus:evidence-library") ?? "[]",
    ) as EvidenceItem[];
    const matched = matchRequirements(confirmed, evidence);
    setRequirements(matched);
    if (application) {
      saveApplication(localStorage, { ...application, requirements: matched });
    }
    setStep("map");
  }

  if (step === "job")
    return (
      <div className="mx-auto max-w-3xl">
        <p className="section-label">New application</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">
          What role are you preparing for?
        </h1>
        <p className="text-canvas mt-2 text-sm">
          Paste the posting once. We’ll turn it into a clear preparation map.
        </p>
        <div className="border-iron bg-workshop/70 mt-8 space-y-5 rounded-2xl border p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Company"
              value={company}
              onChange={setCompany}
              placeholder="Stripe"
            />
            <Field
              label="Role"
              value={role}
              onChange={setRole}
              placeholder="Software Engineer, New Grad"
            />
          </div>
          <Field
            label="Application deadline (optional)"
            value={deadline}
            onChange={setDeadline}
            type="date"
          />
          <label className="block">
            <span className="text-xs font-medium">Job description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Paste the full job description here…"
              className="border-iron bg-night/45 text-linen focus:border-amber mt-2 min-h-52 w-full rounded-xl border p-4 text-sm leading-6 outline-none"
            />
          </label>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <button
              onClick={() => {
                setCompany("Stripe");
                setRole("Software Engineer, New Grad");
                setDescription(sampleDescription);
              }}
              className="text-dust hover:text-canvas text-left text-xs"
            >
              Use an example posting
            </button>
            <button
              onClick={() => void analyze()}
              className="bg-amber text-night flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold"
            >
              Find the requirements <ArrowRight className="size-4" />
            </button>
          </div>
          {error && (
            <p className="text-kiln flex items-center gap-2 text-xs">
              <CircleAlert className="size-4" />
              {error}
            </p>
          )}
        </div>
      </div>
    );

  if (step === "requirements") {
    const confirmed = requirements.filter((item) => item.confirmed).length;
    return (
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => setStep("job")}
          className="text-dust flex items-center gap-2 text-xs"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>
        <p className="section-label mt-7">Review requirements</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">
          Did we understand the role?
        </h1>
        <p className="text-canvas mt-2 text-sm">
          Confirm what matters. Remove anything the posting doesn’t actually ask
          for.
        </p>
        {error && <p className="text-kiln mt-4 text-xs">{error}</p>}
        {fellBack && (
          <p className="border-kiln/30 bg-kiln/5 text-canvas mt-4 rounded-lg border p-3 text-xs leading-5">
            We could not read this posting closely, so these are a rough guess
            from keywords rather than what the description actually says. Edit
            or remove anything that does not belong.
          </p>
        )}
        {extracting && requirements.length === 0 && (
          <p className="text-dust mt-7 text-xs">Reading the posting…</p>
        )}
        <div className="border-iron bg-workshop/70 mt-7 overflow-hidden rounded-2xl border">
          {requirements.map((item) => (
            <div
              key={item.id}
              className="border-iron/60 flex items-start gap-4 border-t p-5 first:border-t-0"
            >
              <button
                aria-label={
                  item.confirmed
                    ? "Unconfirm requirement"
                    : "Confirm requirement"
                }
                onClick={() => update(item.id, { confirmed: !item.confirmed })}
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                  item.confirmed
                    ? "border-sage bg-sage text-night"
                    : "border-iron",
                )}
              >
                {item.confirmed && <Check className="size-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <input
                  value={item.content}
                  onChange={(event) =>
                    update(item.id, { content: event.target.value })
                  }
                  className="w-full bg-transparent text-sm font-medium outline-none"
                />
                <div className="mt-2 flex gap-2">
                  <select
                    value={item.importance}
                    onChange={(event) =>
                      update(item.id, {
                        importance: event.target
                          .value as JobRequirement["importance"],
                      })
                    }
                    className="border-iron bg-night text-canvas rounded-md border px-2 py-1 text-[10px]"
                  >
                    <option value="required">Required</option>
                    <option value="preferred">Preferred</option>
                    <option value="inferred">Inferred</option>
                  </select>
                  <span className="bg-linen/[.04] text-dust rounded px-2 py-1 text-[10px]">
                    {item.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="text-dust text-xs">{confirmed} confirmed</p>
          <button
            onClick={buildMap}
            className="bg-amber text-night flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
          >
            Build my readiness map <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  const strong = requirements.filter(
    (item) => item.matchStrength === "strong",
  ).length;
  const readiness = assessReadiness({
    requirements,
    resumeReviewed: false,
    resumeExported: false,
    technicalCoverage: 0,
    technicalRecencyDays: null,
    behavioralCompetenciesCovered: 0,
    behavioralRehearsals: 0,
  });
  return (
    <div className="space-y-7">
      <div className="max-w-2xl">
        <div className="text-sage flex items-center gap-2">
          <CheckCircle2 className="size-4" />
          <p className="font-mono text-[10px] tracking-[.1em] uppercase">
            Preparation map ready
          </p>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">
          {application?.companyName} · {application?.roleTitle}
        </h1>
        <p className="text-canvas mt-2 text-sm">
          Every match below points to evidence you confirmed yourself.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniMetric
          label="Required evidence"
          value={`${strong} / ${requirements.filter((item) => item.importance === "required").length}`}
        />
        <MiniMetric
          label="Application readiness"
          value={`${readiness.application.score}%`}
        />
        <MiniMetric
          label="Current level"
          value={readiness.application.level.replace("_", " ")}
        />
      </div>
      <section className="border-iron bg-workshop/70 overflow-hidden rounded-2xl border">
        <div className="border-iron/60 border-b p-5">
          <h2 className="font-semibold">Requirement map</h2>
          <p className="text-dust mt-1 text-xs">
            What the role asks for and what currently supports it.
          </p>
        </div>
        {requirements.map((item) => (
          <div
            key={item.id}
            className="border-iron/60 grid gap-3 border-t p-5 first:border-t-0 sm:grid-cols-[1fr_110px_1fr] sm:items-center"
          >
            <p className="text-sm">{item.content}</p>
            <span
              className={cn(
                "text-xs",
                item.matchStrength === "strong"
                  ? "text-sage"
                  : item.matchStrength === "weak"
                    ? "text-amber"
                    : "text-kiln",
              )}
            >
              {item.matchStrength === "none"
                ? "Evidence gap"
                : `${item.matchStrength} match`}
            </span>
            <p className="text-dust flex items-center gap-2 text-xs">
              <Link2 className="size-3" />
              {item.supportingClaimIds.length
                ? `${item.supportingClaimIds.length} confirmed claim linked`
                : "No confirmed claim yet"}
            </p>
          </div>
        ))}
      </section>
      <div className="border-amber/25 bg-amber/[.05] flex flex-col justify-between gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="text-amber size-4" /> Your best next step
          </p>
          <p className="text-canvas mt-1 text-xs">
            Strengthen the first required evidence gap before tailoring your
            résumé.
          </p>
        </div>
        <Link
          href="/dashboard/resume-kitchen"
          className="text-amber inline-flex items-center gap-2 text-sm font-semibold"
        >
          Continue to Resume <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="border-iron bg-night/45 focus:border-amber mt-2 min-h-11 w-full rounded-lg border px-3 text-sm outline-none"
      />
    </label>
  );
}
function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-iron bg-workshop/70 rounded-xl border p-4">
      <p className="text-dust text-[10px] tracking-[.08em] uppercase">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold capitalize">{value}</p>
    </div>
  );
}
