"use client";

import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardCopy,
  Download,
  FileText,
  LoaderCircle,
  Minus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { JobRequirement } from "@/modules/applications/schema";
import type { ResumeVersion } from "@/modules/resume-kitchen/versions";
import {
  createResumeRevision,
  updateResumeVersion,
  type WorkspaceSnapshot,
} from "@/modules/workspace/repository";

/**
 * Tailoring a resume in one pass, rather than a bullet at a time.
 *
 * The per-requirement flow below this asks the candidate to work through a
 * posting requirement by requirement and copy each suggestion somewhere. That
 * is the right tool for filling one gap and the wrong one for the ordinary
 * case, which is "I am applying to this today and my resume is close enough".
 *
 * A job description can come from an application already saved or be pasted
 * for this run alone. The pasted kind is deliberately not written to the
 * workspace: someone tailoring against a posting they have not decided to
 * apply to should not find a half-tracked application waiting for them
 * tomorrow.
 */

interface BulletChange {
  itemId: string;
  itemTitle: string;
  bulletId: string;
  before: string;
  after: string;
}

interface RejectedRewrite {
  itemTitle: string;
  before: string;
  attempted: string;
  inventedNumbers: string[];
}

interface TailoredResponse {
  resume: Pick<ResumeVersion, "headline" | "skills" | "items">;
  changes: BulletChange[];
  rejected: RejectedRewrite[];
  droppedSkills: string[];
  error?: string;
}

type Source = "saved" | "pasted";
type Busy = "" | "reading" | "tailoring" | "pdf";

function fileNameFor(name: string | null, company: string, role: string) {
  return [name, company, role]
    .filter(Boolean)
    .join(" ")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

export function ResumeTailorRun({
  workspace,
  versions,
  initialVersionId,
  initialApplicationId = "",
}: {
  workspace: WorkspaceSnapshot;
  versions: ResumeVersion[];
  initialVersionId: string;
  initialApplicationId?: string;
}) {
  const applications = workspace.applications;
  const [source, setSource] = useState<Source>(
    applications.length ? "saved" : "pasted",
  );
  const [applicationId, setApplicationId] = useState(
    initialApplicationId ||
      workspace.activeApplicationId ||
      applications[0]?.id ||
      "",
  );
  const [versionId, setVersionId] = useState(initialVersionId);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [pasted, setPasted] = useState("");
  const [notes, setNotes] = useState("");
  const [scoped, setScoped] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [tailorHeadline, setTailorHeadline] = useState(true);
  const [tailorSkills, setTailorSkills] = useState(true);
  const [busy, setBusy] = useState<Busy>("");
  const [error, setError] = useState("");
  const [guessed, setGuessed] = useState(false);
  const [result, setResult] = useState<TailoredResponse | null>(null);
  const [savedAs, setSavedAs] = useState("");

  const version =
    versions.find((entry) => entry.id === versionId) ?? versions[0];
  const application =
    applications.find((entry) => entry.id === applicationId) ?? null;
  const targetCompany =
    source === "saved" ? (application?.companyName ?? "") : company.trim();
  const targetRole =
    source === "saved" ? (application?.roleTitle ?? "") : role.trim();

  if (!version) return null;

  async function readPastedRequirements(jobDescription: string) {
    try {
      const response = await fetch("/api/resume/requirements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      });
      const body = (await response.json().catch(() => null)) as {
        requirements?: JobRequirement[];
      } | null;
      if (response.ok && body?.requirements?.length)
        return body.requirements.map((item) => item.content);
    } catch {
      // Falls through to the description on its own.
    }
    return [];
  }

  async function run() {
    if (!version) return;
    setError("");
    setGuessed(false);
    setSavedAs("");

    const jobDescription =
      source === "saved" ? (application?.jobDescription ?? "") : pasted.trim();
    if (jobDescription.length < 80) {
      setError(
        source === "saved"
          ? "That application has no job description saved to tailor against."
          : "Paste the job description itself, at least 80 characters.",
      );
      return;
    }

    if (scoped && !picked.length && !tailorHeadline && !tailorSkills) {
      setError("Tick at least one bullet, or switch back to the whole resume.");
      return;
    }

    let requirements =
      source === "saved"
        ? (application?.requirements ?? []).map((item) => item.content)
        : [];

    if (source === "pasted") {
      setBusy("reading");
      requirements = await readPastedRequirements(jobDescription);
      // The description alone still tailors, it just does it less sharply.
      if (!requirements.length) setGuessed(true);
    }

    setBusy("tailoring");
    try {
      const response = await fetch("/api/resume/tailor-resume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resume: {
            headline: version.headline,
            skills: version.skills,
            items: version.items,
          },
          target: {
            companyName: targetCompany,
            roleTitle: targetRole,
            jobDescription,
            requirements,
          },
          extraContext: notes.trim(),
          scope: scoped
            ? {
                bulletIds: picked,
                headline: tailorHeadline,
                skills: tailorSkills,
              }
            : undefined,
        }),
      });
      const body = (await response
        .json()
        .catch(() => null)) as TailoredResponse | null;
      if (!response.ok || !body?.resume) {
        setError(body?.error ?? "We could not tailor this resume.");
        return;
      }
      setResult(body);
    } catch {
      setError("We could not reach the tailor.");
    } finally {
      setBusy("");
    }
  }

  async function download() {
    if (!result || !version) return;
    setError("");
    setBusy("pdf");
    try {
      const response = await fetch("/api/resume/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: workspace.candidateName ?? "",
          contact: version.contact ?? workspace.candidateContact,
          headline: result.resume.headline,
          skills: result.resume.skills,
          items: result.resume.items,
          fileName:
            fileNameFor(workspace.candidateName, targetCompany, targetRole) ||
            "resume",
        }),
      });
      if (!response.ok) {
        setError("We could not build the PDF.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${
        fileNameFor(workspace.candidateName, targetCompany, targetRole) ||
        "resume"
      }.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("We could not build the PDF.");
    } finally {
      setBusy("");
    }
  }

  function saveVersion() {
    if (!result || !version) return;
    const name =
      [targetCompany, targetRole].filter(Boolean).join(" — ") ||
      `Tailored ${new Date().toLocaleDateString()}`;
    const revision = createResumeRevision(
      localStorage,
      version.id,
      name.slice(0, 120),
      source === "saved" ? (application?.id ?? undefined) : undefined,
    );
    updateResumeVersion(localStorage, revision.id, {
      headline: result.resume.headline,
      skills: result.resume.skills,
      items: result.resume.items,
    });
    setSavedAs(revision.name);
  }

  const working = busy !== "";
  const extras =
    (tailorHeadline ? 1 : 0) + (tailorSkills ? 1 : 0) > 0
      ? [tailorHeadline && "headline", tailorSkills && "skills"]
          .filter(Boolean)
          .join(" and ")
      : "";
  const scopeLabel =
    [
      picked.length
        ? `${picked.length} ${picked.length === 1 ? "bullet" : "bullets"}`
        : "",
      extras,
    ]
      .filter(Boolean)
      .join(" plus ") || "nothing yet";

  return (
    <section className="roleward-card overflow-hidden rounded-[26px]">
      <div className="border-iron/70 border-b p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="text-amber size-4" />
          <p className="font-semibold">Tailor the whole resume</p>
        </div>
        <p className="text-dust mt-1 max-w-2xl text-xs leading-5">
          Pick a role, add anything the resume does not already say, and get the
          same document back rewritten for it. Your entries, their order, and
          their layout stay exactly as they are.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <p className="text-dust text-[10px] font-semibold uppercase">
            Tailor against
          </p>
          <div className="border-iron/70 mt-2 inline-flex rounded-lg border p-1">
            <SourceTab
              active={source === "saved"}
              disabled={!applications.length}
              onClick={() => setSource("saved")}
            >
              A saved application
            </SourceTab>
            <SourceTab
              active={source === "pasted"}
              onClick={() => setSource("pasted")}
            >
              A new job description
            </SourceTab>
          </div>
          {!applications.length && (
            <p className="text-dust mt-2 text-[11px]">
              You have no saved applications yet, so paste a description below.
            </p>
          )}
        </div>

        {source === "saved" ? (
          <label className="block">
            <span className="text-dust text-[10px] font-semibold uppercase">
              Application
            </span>
            <Select value={applicationId} onValueChange={setApplicationId}>
              <SelectTrigger className="mt-1.5 min-h-10 rounded-lg text-xs">
                <SelectValue placeholder="Choose an application" />
              </SelectTrigger>
              <SelectContent>
                {applications.map((entry) => (
                  <SelectItem
                    key={entry.id}
                    value={entry.id}
                    className="text-xs"
                  >
                    {entry.roleTitle} · {entry.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-dust mt-1.5 block text-[11px] leading-5">
              {application
                ? `${application.requirements.length} requirement${
                    application.requirements.length === 1 ? "" : "s"
                  } already read from this posting.`
                : "Pick the role you are tailoring for."}
            </span>
          </label>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Company (optional)"
                value={company}
                onChange={setCompany}
                placeholder="Stripe"
              />
              <Field
                label="Role (optional)"
                value={role}
                onChange={setRole}
                placeholder="Software Engineer, New Grad"
              />
            </div>
            <label className="block">
              <span className="text-dust text-[10px] font-semibold uppercase">
                Job description
              </span>
              <textarea
                value={pasted}
                onChange={(event) => setPasted(event.target.value)}
                placeholder="Paste the full job description here…"
                className="border-iron bg-night/45 text-linen focus:border-amber mt-1.5 min-h-40 w-full rounded-xl border p-3 text-xs leading-5 outline-none"
              />
              <span className="text-dust mt-1.5 block text-[11px] leading-5">
                Used for this tailoring only. Nothing is added to your saved
                applications.
              </span>
            </label>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[16rem_1fr]">
          <label className="block">
            <span className="text-dust text-[10px] font-semibold uppercase">
              Start from
            </span>
            <Select value={version.id} onValueChange={setVersionId}>
              <SelectTrigger className="mt-1.5 min-h-10 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((entry) => (
                  <SelectItem
                    key={entry.id}
                    value={entry.id}
                    className="text-xs"
                  >
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-dust mt-1.5 block text-[11px]">
              {version.items.reduce(
                (count, item) => count + item.bullets.length,
                0,
              )}{" "}
              bullets across {version.items.length}{" "}
              {version.items.length === 1 ? "entry" : "entries"}
            </span>
          </label>

          <label className="block">
            <span className="text-dust text-[10px] font-semibold uppercase">
              Anything else we should know
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={4000}
              placeholder="New work since this resume, numbers you can back up, what to emphasise or leave out…"
              className="border-iron bg-night/45 text-linen focus:border-amber mt-1.5 min-h-28 w-full rounded-xl border p-3 text-xs leading-5 outline-none"
            />
            <span className="text-dust mt-1.5 block text-[11px] leading-5">
              This is the only new material the rewrite may draw on. A figure
              you put here can be used; one you do not is never invented.
            </span>
          </label>
        </div>

        <div>
          <p className="text-dust text-[10px] font-semibold uppercase">
            How much to rewrite
          </p>
          <div className="border-iron/70 mt-2 inline-flex rounded-lg border p-1">
            <SourceTab active={!scoped} onClick={() => setScoped(false)}>
              The whole resume
            </SourceTab>
            <SourceTab active={scoped} onClick={() => setScoped(true)}>
              Choose what to tailor
            </SourceTab>
          </div>

          {scoped && (
            <ScopePicker
              version={version}
              picked={picked}
              onPicked={setPicked}
              headline={tailorHeadline}
              onHeadline={setTailorHeadline}
              skills={tailorSkills}
              onSkills={setTailorSkills}
            />
          )}
        </div>

        {error && (
          <p className="text-kiln flex items-start gap-2 text-xs">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void run()}
            disabled={working}
            className="bg-amber text-night inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:opacity-50"
          >
            {busy === "reading" || busy === "tailoring" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {busy === "reading"
              ? "Reading the posting…"
              : busy === "tailoring"
                ? "Rewriting your resume…"
                : result
                  ? "Tailor again"
                  : scoped
                    ? `Tailor ${scopeLabel}`
                    : "Tailor and build the PDF"}
          </button>
          {result && !working && (
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setSavedAs("");
              }}
              className="text-dust hover:text-canvas inline-flex items-center gap-1.5 text-xs"
            >
              <RotateCcw className="size-3.5" /> Start over
            </button>
          )}
        </div>
      </div>

      {result && (
        <TailoredReview
          result={result}
          guessed={guessed}
          busy={busy}
          savedAs={savedAs}
          onDownload={() => void download()}
          onSave={saveVersion}
        />
      )}
    </section>
  );
}

function TailoredReview({
  result,
  guessed,
  busy,
  savedAs,
  onDownload,
  onSave,
}: {
  result: TailoredResponse;
  guessed: boolean;
  busy: Busy;
  savedAs: string;
  onDownload: () => void;
  onSave: () => void;
}) {
  const [copied, setCopied] = useState("");
  const total = result.resume.items.reduce(
    (count, item) => count + item.bullets.length,
    0,
  );

  function copy(text: string, key: string) {
    void navigator.clipboard?.writeText(text);
    setCopied(key);
  }

  function copyAll() {
    copy(result.changes.map((change) => `• ${change.after}`).join("\n"), "all");
  }

  return (
    <div className="border-iron/70 border-t">
      <div className="border-iron/60 flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            {result.changes.length} of {total}{" "}
            {total === 1 ? "bullet" : "bullets"} rewritten
          </p>
          <p className="text-dust mt-1 text-xs leading-5">
            Take the whole document, or just the lines. The PDF is your full
            resume with only these rewrites applied; copying gives you the
            bullets alone to paste wherever you keep them.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={busy === "pdf"}
            className="bg-amber text-night inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold disabled:opacity-50"
          >
            {busy === "pdf" ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Download PDF
          </button>
          <button
            type="button"
            onClick={copyAll}
            disabled={!result.changes.length}
            className="border-iron text-canvas hover:text-linen inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-xs font-semibold disabled:opacity-40"
          >
            <ClipboardCopy className="size-3.5" />
            {copied === "all" ? "Copied" : "Copy bullets"}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={Boolean(savedAs)}
            className="border-iron text-canvas hover:text-linen inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-xs font-semibold disabled:opacity-40"
          >
            <Save className="size-3.5" />
            {savedAs ? "Saved" : "Save as a version"}
          </button>
        </div>
      </div>

      {savedAs && (
        <p className="text-sage border-iron/60 border-b px-5 py-3 text-[11px]">
          Saved as “{savedAs}”. Your original is untouched.
        </p>
      )}

      {guessed && (
        <p className="border-iron/60 text-dust border-b px-5 py-3 text-[11px] leading-5">
          We could not pull a clean requirement list out of that description, so
          the rewrite worked from the description itself. It is still grounded
          in your own experience.
        </p>
      )}

      {result.rejected.length > 0 && (
        <div className="border-iron/60 bg-kiln/[.05] border-b p-5">
          <p className="text-kiln flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck className="size-3.5" />
            {result.rejected.length}{" "}
            {result.rejected.length === 1 ? "rewrite was" : "rewrites were"}{" "}
            discarded
          </p>
          <p className="text-dust mt-1 text-[11px] leading-5">
            Each one asserted a figure your resume and your notes do not
            contain, so the original bullet was kept instead. Add the real
            number above if you can back it up.
          </p>
          <ul className="mt-3 space-y-2">
            {result.rejected.map((entry) => (
              <li key={entry.attempted} className="text-[11px] leading-5">
                <span className="text-dust">{entry.itemTitle}: </span>
                <span className="text-canvas line-through">
                  {entry.attempted}
                </span>
                <span className="text-kiln">
                  {" "}
                  ({entry.inventedNumbers.join(", ")} unsupported)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.droppedSkills.length > 0 && (
        <p className="border-iron/60 text-dust border-b px-5 py-3 text-[11px] leading-5">
          Left out of the skills list because you have never listed them:{" "}
          {result.droppedSkills.join(", ")}.
        </p>
      )}

      {result.changes.length === 0 ? (
        <p className="text-dust p-5 text-xs leading-5">
          Nothing needed changing. Your resume already speaks to this posting —
          download it as it stands, or add more detail above and try again.
        </p>
      ) : (
        <div className="p-5">
          <p className="text-dust flex items-center gap-2 text-[10px] font-semibold uppercase">
            <FileText className="size-3" /> What changed
          </p>
          <ul className="mt-4 space-y-4">
            {result.changes.map((change) => (
              <li
                key={change.bulletId}
                className="border-iron/60 rounded-xl border p-4"
              >
                <p className="text-dust text-[10px] font-semibold uppercase">
                  {change.itemTitle}
                </p>
                <p className="text-dust mt-2 text-[11px] leading-5 line-through">
                  {change.before}
                </p>
                <p className="text-canvas mt-2 flex items-start gap-2 text-xs leading-5">
                  <ArrowRight className="text-copper mt-0.5 size-3 shrink-0" />
                  {change.after}
                </p>
                <button
                  type="button"
                  onClick={() => copy(change.after, change.bulletId)}
                  className="text-dust hover:text-canvas mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold"
                >
                  <ClipboardCopy className="size-3" />
                  {copied === change.bulletId ? "Copied" : "Copy this bullet"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Entry-level and bullet-level checkboxes over one resume version.
 *
 * Ticking an entry ticks its bullets, because "redo my Acme internship" is the
 * request people actually have; the bullet rows are there for the narrower
 * one. Nothing is preselected — an empty scope is a question, not a default,
 * and the whole-resume tab is one click away for anyone who wanted everything.
 */
function ScopePicker({
  version,
  picked,
  onPicked,
  headline,
  onHeadline,
  skills,
  onSkills,
}: {
  version: ResumeVersion;
  picked: string[];
  onPicked: (value: string[]) => void;
  headline: boolean;
  onHeadline: (value: boolean) => void;
  skills: boolean;
  onSkills: (value: boolean) => void;
}) {
  const [open, setOpen] = useState<string[]>([]);
  const chosen = new Set(picked);

  function toggleBullets(ids: string[], on: boolean) {
    const next = new Set(chosen);
    for (const id of ids)
      if (on) next.add(id);
      else next.delete(id);
    onPicked([...next]);
  }

  const everyBullet = version.items.flatMap((item) =>
    item.bullets.map((bullet) => bullet.id),
  );

  return (
    <div className="border-iron/60 mt-3 rounded-xl border">
      <div className="border-iron/50 flex flex-wrap items-center justify-between gap-3 border-b p-3">
        <p className="text-dust text-[11px]">
          {picked.length
            ? `${picked.length} of ${everyBullet.length} bullets selected`
            : "Nothing selected yet"}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => toggleBullets(everyBullet, picked.length === 0)}
            className="text-dust hover:text-canvas text-[10px] font-semibold"
          >
            {picked.length ? "Clear all" : "Select all"}
          </button>
        </div>
      </div>

      <div className="divide-iron/50 divide-y">
        {version.items.map((item) => {
          const ids = item.bullets.map((bullet) => bullet.id);
          const selected = ids.filter((id) => chosen.has(id)).length;
          const all = ids.length > 0 && selected === ids.length;
          const expanded = open.includes(item.id);

          return (
            <div key={item.id}>
              <div className="flex items-center gap-3 p-3">
                <Tick
                  checked={all}
                  partial={selected > 0 && !all}
                  disabled={!ids.length}
                  label={`Tailor ${item.title}`}
                  onChange={() => toggleBullets(ids, !all)}
                />
                <button
                  type="button"
                  onClick={() =>
                    setOpen((current) =>
                      current.includes(item.id)
                        ? current.filter((entry) => entry !== item.id)
                        : [...current, item.id],
                    )
                  }
                  disabled={!ids.length}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      {item.title}
                      {item.organization ? ` · ${item.organization}` : ""}
                    </span>
                    <span className="text-dust block text-[10px]">
                      {ids.length
                        ? `${ids.length} ${ids.length === 1 ? "bullet" : "bullets"}${
                            selected ? ` · ${selected} selected` : ""
                          }`
                        : "No bullets to rewrite"}
                    </span>
                  </span>
                  {ids.length > 0 && (
                    <ChevronDown
                      className={cn(
                        "text-dust size-3.5 shrink-0 transition-transform",
                        expanded && "rotate-180",
                      )}
                    />
                  )}
                </button>
              </div>

              {expanded && (
                <ul className="border-iron/40 space-y-2 border-t p-3 pl-10">
                  {item.bullets.map((bullet) => (
                    <li key={bullet.id} className="flex items-start gap-3">
                      <Tick
                        checked={chosen.has(bullet.id)}
                        label={`Tailor bullet: ${bullet.content.slice(0, 60)}`}
                        onChange={() =>
                          toggleBullets([bullet.id], !chosen.has(bullet.id))
                        }
                      />
                      <span className="text-canvas flex-1 text-[11px] leading-5">
                        {bullet.content}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-iron/50 flex flex-wrap gap-5 border-t p-3">
        <label className="flex items-center gap-2.5">
          <Tick
            checked={headline}
            label="Tailor the headline"
            onChange={() => onHeadline(!headline)}
          />
          <span className="text-[11px]">
            Headline
            <span className="text-dust ml-1.5">
              {version.headline || "none set"}
            </span>
          </span>
        </label>
        <label className="flex items-center gap-2.5">
          <Tick
            checked={skills}
            label="Reorder the skills"
            onChange={() => onSkills(!skills)}
          />
          <span className="text-[11px]">
            Skills
            <span className="text-dust ml-1.5">reorder for this role</span>
          </span>
        </label>
      </div>
    </div>
  );
}

function Tick({
  checked,
  partial,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  partial?: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={partial ? "mixed" : checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-30",
        checked || partial ? "border-amber bg-amber text-night" : "border-iron",
      )}
    >
      {checked && <Check className="size-2.5" strokeWidth={3} />}
      {!checked && partial && <Minus className="size-2.5" strokeWidth={3} />}
    </button>
  );
}

function SourceTab({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "min-h-9 rounded-md px-3 text-xs font-semibold transition-colors disabled:opacity-35",
        active
          ? "bg-linen/[.07] text-linen"
          : "text-dust hover:text-canvas disabled:hover:text-dust",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-dust text-[10px] font-semibold uppercase">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="border-iron bg-night/45 text-linen focus:border-amber mt-1.5 min-h-10 w-full rounded-lg border px-3 text-xs outline-none"
      />
    </label>
  );
}
