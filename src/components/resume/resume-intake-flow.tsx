"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  ExternalLink,
  Link2,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  contactHasValues,
  type CandidateContact,
  type ResumeLink,
} from "@/modules/candidates/contact";
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
const storageKey = "backstage:evidence-library";

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
    period: item.period,
    location: item.location,
    links: item.links ?? [],
    education: item.education,
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
  const [identity, setIdentity] = useState<{
    fullName: string;
    headline: string;
    skills: DraftSkillGroup[];
  }>({ fullName: "", headline: "", skills: [] });
  const [contact, setContact] = useState<CandidateContact | null>(null);
  const [contactConfirmed, setContactConfirmed] = useState(false);
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
      const existingHash = localStorage.getItem("backstage:resume-hash");
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
        contact?: CandidateContact | null;
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
      setIdentity({
        fullName: body.fullName ?? "",
        headline: body.headline ?? "",
        skills: body.skills ?? [],
      });
      setContact(body.contact ?? null);
      setContactConfirmed(false);
      setItems(toEvidenceItems(body.items));
      setDroppedCount(body.droppedCount ?? 0);
      localStorage.setItem("backstage:resume-hash", contentHash);
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

  function updateItem(itemId: string, next: EvidenceItem) {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? next : item)),
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
    const baseName = resume?.fileName.replace(/\.(pdf|docx)$/i, "") || "Resume";
    saveCandidateIdentity(
      localStorage,
      identity.fullName,
      identity.headline,
      identity.skills,
      contactConfirmed ? contact : undefined,
    );
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
          className="backstage-card rounded-[22px] p-5 sm:p-8"
        >
          <button
            onClick={() => input.current?.click()}
            className="border-iron bg-night/45 hover:border-copper/60 flex min-h-72 w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center transition-colors"
          >
            <span className="bg-copper/10 text-copper flex size-12 items-center justify-center rounded-xl">
              <UploadCloud className="size-5" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">
              Drop your base resume here
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

  const reviewed =
    items
      .flatMap((item) => item.claims)
      .filter((claim) => claim.verificationStatus !== "proposed").length +
    items.filter(
      (item) =>
        ((item.type === "education" && item.education) || item.links.length) &&
        item.verificationStatus !== "proposed",
    ).length +
    (contact && contactConfirmed ? 1 : 0);
  const total =
    items.flatMap((item) => item.claims).length +
    items.filter(
      (item) =>
        (item.type === "education" && item.education) || item.links.length,
    ).length +
    (contact ? 1 : 0);
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
      {contact && (
        <ContactReview
          contact={contact}
          confirmed={contactConfirmed}
          onChange={(next) => {
            setContact(next);
            setContactConfirmed(true);
          }}
          onConfirm={() => setContactConfirmed(true)}
        />
      )}
      {items.map((item) => (
        <section
          key={item.id}
          className="border-iron bg-workshop/75 overflow-hidden rounded-2xl border"
        >
          <div className="border-iron/70 border-b p-5">
            <p className="font-semibold">{item.title}</p>
            <p className="text-dust mt-1 text-xs">
              {[item.organization, item.period, item.location]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div>
            {item.type === "education" && item.education && (
              <EducationReview
                item={item}
                onChange={(next) => updateItem(item.id, next)}
              />
            )}
            {item.links.length > 0 && (
              <ItemLinksReview
                item={item}
                onChange={(next) => updateItem(item.id, next)}
              />
            )}
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
            setContact(null);
            setContactConfirmed(false);
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

function ContactReview({
  contact,
  confirmed,
  onChange,
  onConfirm,
}: {
  contact: CandidateContact;
  confirmed: boolean;
  onChange: (contact: CandidateContact | null) => void;
  onConfirm: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    location: contact.location ?? "",
    linkedinUrl: contact.linkedinUrl ?? "",
    githubUrl: contact.githubUrl ?? "",
    websiteUrl: contact.websiteUrl ?? "",
  });

  function save() {
    setError("");
    const links = [draft.linkedinUrl, draft.githubUrl, draft.websiteUrl].filter(
      Boolean,
    );
    if (
      links.some((value) => {
        try {
          return !["http:", "https:"].includes(new URL(value).protocol);
        } catch {
          return true;
        }
      })
    ) {
      setError("Use complete http or https links.");
      return;
    }
    const next: CandidateContact = {
      email: draft.email.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      location: draft.location.trim() || undefined,
      linkedinUrl: draft.linkedinUrl.trim() || undefined,
      githubUrl: draft.githubUrl.trim() || undefined,
      websiteUrl: draft.websiteUrl.trim() || undefined,
    };
    onChange(contactHasValues(next) ? next : null);
    setEditing(false);
  }

  return (
    <section className="border-amber/25 bg-amber/[.035] overflow-hidden rounded-2xl border">
      <div className="border-iron/70 flex items-center gap-3 border-b p-5">
        <Link2 className="text-amber size-4" />
        <div>
          <p className="font-semibold">Contact & links</p>
          <p className="text-dust mt-1 text-xs">
            Confirm what can travel with your resume and public portfolio.
          </p>
        </div>
      </div>
      {editing ? (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {(
            [
              ["Email", "email"],
              ["Phone", "phone"],
              ["Location", "location"],
              ["LinkedIn", "linkedinUrl"],
              ["GitHub", "githubUrl"],
              ["Personal website", "websiteUrl"],
            ] as const
          ).map(([label, key]) => (
            <EducationInput
              key={key}
              label={label}
              value={draft[key]}
              onChange={(value) =>
                setDraft((current) => ({ ...current, [key]: value }))
              }
            />
          ))}
          {error && <p className="text-kiln text-xs sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={save}
              className="bg-sage text-night rounded-md px-3 py-1.5 text-[10px] font-semibold"
            >
              Save and confirm
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-dust text-[10px]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <EducationDetail label="Email" value={contact.email} />
            <EducationDetail label="Phone" value={contact.phone} />
            <EducationDetail label="Location" value={contact.location} />
            <EducationDetail label="LinkedIn" value={contact.linkedinUrl} />
            <EducationDetail label="GitHub" value={contact.githubUrl} />
            <EducationDetail label="Website" value={contact.websiteUrl} />
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            {!confirmed && (
              <button
                type="button"
                onClick={onConfirm}
                className="bg-sage text-night flex items-center gap-1 rounded-md px-3 py-1.5 text-[10px] font-semibold"
              >
                <Check className="size-3" /> Confirm contact details
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="border-iron text-canvas rounded-md border px-3 py-1.5 text-[10px]"
            >
              Correct details
            </button>
            {confirmed && (
              <span className="text-sage px-2 py-1.5 text-[10px]">
                Confirmed
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ItemLinksReview({
  item,
  onChange,
}: {
  item: EvidenceItem;
  onChange: (item: EvidenceItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [value, setValue] = useState(
    item.links.map((link) => `${link.label} | ${link.url}`).join("\n"),
  );
  const confirmed = item.verificationStatus !== "proposed";

  function save() {
    setError("");
    const links: ResumeLink[] = [];
    for (const line of value.split(/\r?\n/).filter((entry) => entry.trim())) {
      const [label, ...urlParts] = line.split("|");
      const url = urlParts.join("|").trim();
      try {
        const parsed = new URL(url);
        if (!label?.trim() || !["http:", "https:"].includes(parsed.protocol))
          throw new Error("invalid");
        links.push({ label: label.trim(), url: parsed.toString() });
      } catch {
        setError(
          "Use one link per line in the format: Label | https://example.com",
        );
        return;
      }
    }
    onChange({ ...item, links, verificationStatus: "corrected" });
    setEditing(false);
  }

  return (
    <div className="border-iron/60 border-b p-5">
      <p className="section-label">Project links</p>
      {editing ? (
        <>
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={Math.max(3, item.links.length + 1)}
            className="border-iron bg-night/45 mt-3 w-full rounded-lg border p-3 font-mono text-xs leading-6 outline-none"
          />
          {error && <p className="text-kiln mt-2 text-xs">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={save}
              className="bg-sage text-night rounded-md px-3 py-1.5 text-[10px] font-semibold"
            >
              Save and confirm
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-dust text-[10px]"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="border-iron text-canvas inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
              >
                {link.label} <ExternalLink className="size-3" />
              </a>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!confirmed && (
              <button
                type="button"
                onClick={() =>
                  onChange({ ...item, verificationStatus: "confirmed" })
                }
                className="bg-sage text-night flex items-center gap-1 rounded-md px-3 py-1.5 text-[10px] font-semibold"
              >
                <Check className="size-3" /> Confirm project links
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="border-iron text-canvas rounded-md border px-3 py-1.5 text-[10px]"
            >
              Correct links
            </button>
            {confirmed && (
              <span className="text-sage px-2 py-1.5 text-[10px]">
                Confirmed
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EducationReview({
  item,
  onChange,
}: {
  item: EvidenceItem;
  onChange: (item: EvidenceItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [school, setSchool] = useState(item.organization ?? "");
  const [degree, setDegree] = useState(item.education?.degree ?? item.title);
  const [field, setField] = useState(item.education?.fieldOfStudy ?? "");
  const [minor, setMinor] = useState(item.education?.minor ?? "");
  const [gpa, setGpa] = useState(item.education?.gpa ?? "");
  const [period, setPeriod] = useState(item.period ?? "");
  const [location, setLocation] = useState(item.location ?? "");
  const [coursework, setCoursework] = useState(
    item.education?.coursework.join(", ") ?? "",
  );
  const [honors, setHonors] = useState(item.education?.honors.join(", ") ?? "");
  const decided = item.verificationStatus !== "proposed";

  function fields(value: string) {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function save(status: "confirmed" | "corrected") {
    onChange({
      ...item,
      title: degree.trim() || item.title,
      organization: school.trim() || undefined,
      period: period.trim() || undefined,
      location: location.trim() || undefined,
      education: {
        degree: degree.trim() || undefined,
        fieldOfStudy: field.trim() || undefined,
        minor: minor.trim() || undefined,
        gpa: gpa.trim() || undefined,
        coursework: fields(coursework),
        honors: fields(honors),
      },
      verificationStatus: status,
    });
    setEditing(false);
  }

  if (editing)
    return (
      <div className="border-iron/60 grid gap-4 border-b p-5 sm:grid-cols-2">
        <EducationInput label="School" value={school} onChange={setSchool} />
        <EducationInput label="Degree" value={degree} onChange={setDegree} />
        <EducationInput
          label="Field of study"
          value={field}
          onChange={setField}
        />
        <EducationInput label="Minor" value={minor} onChange={setMinor} />
        <EducationInput label="GPA" value={gpa} onChange={setGpa} />
        <EducationInput label="Dates" value={period} onChange={setPeriod} />
        <EducationInput
          label="Location"
          value={location}
          onChange={setLocation}
        />
        <EducationInput
          label="Coursework"
          value={coursework}
          onChange={setCoursework}
          wide
        />
        <EducationInput
          label="Honors"
          value={honors}
          onChange={setHonors}
          wide
        />
        <div className="flex gap-2 sm:col-span-2">
          <button
            type="button"
            onClick={() => save("corrected")}
            className="bg-sage text-night rounded-md px-3 py-1.5 text-[10px] font-semibold"
          >
            Save and confirm
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-dust text-[10px]"
          >
            Cancel
          </button>
        </div>
      </div>
    );

  return (
    <div className="border-iron/60 border-b p-5">
      <p className="section-label">Education details</p>
      <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <EducationDetail label="School" value={item.organization} />
        <EducationDetail
          label="Degree"
          value={item.education?.degree ?? item.title}
        />
        <EducationDetail label="Field" value={item.education?.fieldOfStudy} />
        <EducationDetail label="Minor" value={item.education?.minor} />
        <EducationDetail label="GPA" value={item.education?.gpa} />
        <EducationDetail label="Dates" value={item.period} />
        <EducationDetail
          label="Coursework"
          value={item.education?.coursework.join(" · ")}
          wide
        />
        <EducationDetail
          label="Honors"
          value={item.education?.honors.join(" · ")}
          wide
        />
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        {!decided && (
          <button
            type="button"
            onClick={() => save("confirmed")}
            className="bg-sage text-night flex items-center gap-1 rounded-md px-3 py-1.5 text-[10px] font-semibold"
          >
            <Check className="size-3" /> Confirm education
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="border-iron text-canvas rounded-md border px-3 py-1.5 text-[10px]"
        >
          Correct details
        </button>
        {decided && (
          <span className="text-sage px-2 py-1.5 text-[10px]">Confirmed</span>
        )}
      </div>
    </div>
  );
}

function EducationDetail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: string;
  wide?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : ""}>
      <dt className="text-dust text-[10px] uppercase">{label}</dt>
      <dd className="text-canvas mt-1 text-sm leading-5">{value}</dd>
    </div>
  );
}

function EducationInput({
  label,
  value,
  onChange,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="text-dust text-[10px] uppercase">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-iron bg-night/40 text-canvas mt-1.5 w-full rounded-lg border px-3 py-2 text-xs outline-none"
      />
    </label>
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
