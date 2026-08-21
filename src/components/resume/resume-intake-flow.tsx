"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { finalizeConfirmedEvidence } from "@/modules/evidence/confirmation";
import {
  saveCandidateIdentity,
  saveEvidenceAndRefresh,
  saveOriginalResumeVersion,
} from "@/modules/workspace/repository";
import type { EvidenceItem } from "@/modules/evidence/schema";
import {
  createResumeProcessingJob,
  hashFile,
  resumeDocumentSchema,
  validateResumeFile,
  type ResumeDocument,
} from "@/modules/resume-kitchen/intake";
import type {
  DraftItem,
  DraftSkillGroup,
} from "@/modules/resume-kitchen/grounding";
import { uploadPrivateFile } from "@/modules/uploads/client";

type Step = "upload" | "processing" | "review" | "complete";
const storageKey = "sweet-plus:evidence-library";

/**
 * Everything arrives as "proposed". Nothing is verified until the candidate
 * says so, which is the entire point of the review step.
 */
function toEvidenceItems(items: DraftItem[]): EvidenceItem[] {
  return items.map((item) => ({
    id: crypto.randomUUID(),
    type: item.type,
    title: item.title,
    organization: item.organization,
    summary: item.summary,
    verificationStatus: "proposed" as const,
    claims: item.claims.map((claim) => ({
      id: crypto.randomUUID(),
      type: claim.type,
      content: claim.content,
      verificationStatus: "proposed" as const,
    })),
  }));
}

export function ResumeIntakeFlow() {
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState("");
  const [resume, setResume] = useState<ResumeDocument | null>(null);
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [droppedCount, setDroppedCount] = useState(0);

  async function receive(file?: File) {
    if (!file) return;
    setError("");
    const problem = validateResumeFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setStep("processing");
    try {
      const contentHash = await hashFile(file);
      const storageKey = await uploadPrivateFile(file, "resume");
      const existingHash = localStorage.getItem("sweet-plus:resume-hash");
      if (existingHash === contentHash) {
        setError(
          "This exact resume has already been processed. Opening its evidence instead of creating a duplicate.",
        );
      }
      const nextResume = resumeDocumentSchema.parse({
        id: crypto.randomUUID(),
        fileName: file.name,
        mediaType: file.type,
        sizeBytes: file.size,
        contentHash,
        storageKey: storageKey ?? undefined,
        status: "review_required",
        createdAt: new Date().toISOString(),
      });
      createResumeProcessingJob(nextResume, "local-preview-user");
      setResume(nextResume);

      // The document itself is read here. Until this existed the review screen
      // showed a fixed sample, and confirming it turned someone else's
      // accomplishments into this candidate's verified background.
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/resume/extract", {
        method: "POST",
        body: form,
      });
      const body = (await response.json().catch(() => null)) as {
        fullName?: string;
        headline?: string;
        skills?: DraftSkillGroup[];
        items?: DraftItem[];
        droppedCount?: number;
        error?: string;
      } | null;
      if (!response.ok || !body?.items?.length) {
        setError(body?.error ?? "We could not read this resume.");
        setStep("upload");
        return;
      }

      if (body.fullName)
        saveCandidateIdentity(
          localStorage,
          body.fullName,
          body.headline ?? "",
          body.skills ?? [],
        );
      setItems(toEvidenceItems(body.items));
      setDroppedCount(body.droppedCount ?? 0);
      localStorage.setItem("sweet-plus:resume-hash", contentHash);
      setStep("review");
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "We could not read this file. Your existing evidence was not changed.",
      );
      setStep("upload");
    }
  }

  function updateClaim(
    itemId: string,
    claimId: string,
    status: "confirmed" | "rejected",
    content?: string,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id !== itemId
          ? item
          : {
              ...item,
              claims: item.claims.map((claim) =>
                claim.id !== claimId
                  ? claim
                  : {
                      ...claim,
                      content: content ?? claim.content,
                      verificationStatus:
                        content && content !== claim.content
                          ? "corrected"
                          : status,
                    },
              ),
            },
      ),
    );
  }

  function saveEvidence() {
    const accepted = finalizeConfirmedEvidence(items);
    const existing = JSON.parse(
      localStorage.getItem(storageKey) ?? "[]",
    ) as EvidenceItem[];
    const byId = new Map(
      [...existing, ...accepted].map((item) => [item.id, item]),
    );
    const baseName = resume?.fileName.replace(/\.(pdf|docx)$/i, "") || "Résumé";
    saveOriginalResumeVersion(localStorage, `${baseName} — Original`, accepted);
    saveEvidenceAndRefresh(localStorage, [...byId.values()]);
    setStep("complete");
  }

  if (step === "upload")
    return (
      <div className="mx-auto max-w-3xl">
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void receive(event.dataTransfer.files[0]);
          }}
          className="border-iron bg-workshop/70 rounded-2xl border p-5 sm:p-8"
        >
          <button
            onClick={() => input.current?.click()}
            className="border-iron bg-night/45 hover:border-copper/60 flex min-h-72 w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center transition-colors"
          >
            <span className="bg-copper/10 text-copper flex size-12 items-center justify-center rounded-xl">
              <UploadCloud className="size-5" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">
              Drop your base résumé here
            </h2>
            <p className="text-canvas mt-2 text-sm">
              or choose a PDF or DOCX file
            </p>
            <span className="text-dust mt-4 font-mono text-[10px] uppercase">
              Maximum 10 MB · private by default
            </span>
          </button>
          <input
            ref={input}
            type="file"
            className="sr-only"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => void receive(event.target.files?.[0])}
          />
          {error && (
            <p className="text-kiln mt-4 flex items-center gap-2 text-xs">
              <AlertCircle className="size-4" />
              {error}
            </p>
          )}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(
            [
              [ShieldCheck, "Your original stays private"],
              [FileText, "Claims are extracted separately"],
              [CheckCircle2, "You verify every fact"],
            ] as const
          ).map(([Icon, text]) => (
            <div
              key={String(text)}
              className="border-iron text-canvas rounded-xl border p-4 text-xs"
            >
              <Icon className="text-sage mb-3 size-4" />
              {String(text)}
            </div>
          ))}
        </div>
      </div>
    );

  if (step === "processing")
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <LoaderCircle className="text-copper mx-auto size-8 animate-spin" />
        <h2 className="mt-6 text-xl font-semibold">
          Reading the structure, not rewriting your story.
        </h2>
        <p className="text-canvas mt-2 text-sm">
          Separating experiences into reviewable claims…
        </p>
      </div>
    );

  if (step === "complete")
    return (
      <div className="border-sage/35 bg-sage/[.06] mx-auto max-w-xl rounded-2xl border p-8 text-center">
        <CheckCircle2 className="text-sage mx-auto size-8" />
        <h2 className="mt-5 text-2xl font-semibold">Evidence confirmed.</h2>
        <p className="text-canvas mt-2 text-sm leading-6">
          Only the facts you approved were added to your Evidence Library.
          Rejected and unreviewed claims were not saved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/dashboard/evidence"
            className="bg-sage text-night rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            View Evidence Library
          </Link>
          <Link
            href="/dashboard/resume-kitchen"
            className="border-iron text-canvas rounded-lg border px-4 py-2.5 text-sm"
          >
            Return to Kitchen
          </Link>
        </div>
      </div>
    );

  const reviewed = items
    .flatMap((item) => item.claims)
    .filter((claim) => claim.verificationStatus !== "proposed").length;
  const total = items.flatMap((item) => item.claims).length;
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="section-label">Evidence confirmation</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em]">
            Check every extracted claim.
          </h1>
          <p className="text-canvas mt-2 text-sm">
            {resume?.fileName} · every claim below was quoted from your file and
            checked against it. Nothing is verified until you say so.
          </p>
          {droppedCount > 0 && (
            <p className="text-dust mt-2 text-xs leading-5">
              {droppedCount} proposed{" "}
              {droppedCount === 1 ? "claim was" : "claims were"} discarded for
              not matching the text of your resume. You are not being shown
              them, because we could not support them.
            </p>
          )}
        </div>
        <p className="text-canvas font-mono text-xs">
          {reviewed} / {total} reviewed
        </p>
      </div>
      {error && (
        <div className="border-amber/30 bg-amber/[.06] text-amber rounded-lg border p-3 text-xs">
          {error}
        </div>
      )}
      {items.map((item) => (
        <section
          key={item.id}
          className="border-iron bg-workshop/75 overflow-hidden rounded-2xl border"
        >
          <div className="border-iron/70 border-b p-5">
            <p className="font-semibold">{item.title}</p>
            <p className="text-dust mt-1 text-xs">
              {item.organization} · {item.type}
            </p>
          </div>
          <div>
            {item.claims.map((claim) => (
              <ClaimReview
                key={claim.id}
                claim={claim}
                onAccept={(content) =>
                  updateClaim(item.id, claim.id, "confirmed", content)
                }
                onReject={() => updateClaim(item.id, claim.id, "rejected")}
              />
            ))}
          </div>
        </section>
      ))}
      <div className="border-iron bg-night/90 sticky bottom-4 flex items-center justify-between rounded-xl border p-4 shadow-2xl">
        <button
          onClick={() => {
            setStep("upload");
            setItems([]);
          }}
          className="text-dust flex items-center gap-2 text-xs"
        >
          <RotateCcw className="size-3.5" /> Start over
        </button>
        <button
          disabled={reviewed !== total}
          onClick={saveEvidence}
          className="bg-copper text-night flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold disabled:opacity-35"
        >
          Save confirmed evidence <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function ClaimReview({
  claim,
  onAccept,
  onReject,
}: {
  claim: EvidenceItem["claims"][number];
  onAccept: (content: string) => void;
  onReject: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(claim.content);
  const decided = claim.verificationStatus !== "proposed";
  return (
    <div
      className={cn(
        "border-iron/60 border-t p-5 first:border-t-0",
        claim.verificationStatus === "rejected" && "opacity-50",
      )}
    >
      <div className="flex items-start gap-4">
        <span className="bg-linen/[.05] text-dust rounded px-2 py-1 font-mono text-[9px] uppercase">
          {claim.type}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="border-copper bg-night min-h-20 w-full rounded-lg border p-3 text-sm leading-6 outline-none"
            />
          ) : (
            <p className="text-sm leading-6">{claim.content}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {!decided && (
              <>
                <button
                  onClick={() => onAccept(content)}
                  className="bg-sage text-night flex items-center gap-1 rounded-md px-3 py-1.5 text-[10px] font-semibold"
                >
                  <Check className="size-3" /> Confirm
                </button>
                <button
                  onClick={() => setEditing(!editing)}
                  className="border-iron text-canvas rounded-md border px-3 py-1.5 text-[10px]"
                >
                  {editing ? "Cancel edit" : "Correct"}
                </button>
                <button
                  onClick={onReject}
                  className="text-dust flex items-center gap-1 px-2 py-1.5 text-[10px]"
                >
                  <X className="size-3" /> Not true
                </button>
              </>
            )}
            {decided && (
              <span
                className={
                  claim.verificationStatus === "rejected"
                    ? "text-kiln text-[10px]"
                    : "text-sage text-[10px]"
                }
              >
                {claim.verificationStatus === "corrected"
                  ? "Corrected and confirmed"
                  : claim.verificationStatus}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
