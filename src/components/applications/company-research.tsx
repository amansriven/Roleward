"use client";

import {
  ArrowRight,
  Building2,
  ExternalLink,
  LoaderCircle,
  MessageCircleQuestion,
  Newspaper,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  companyResearchSchema,
  type CompanyResearch,
} from "@/modules/applications/company-research";
import {
  loadWorkspace,
  workspaceUpdatedEvent,
  type StoredApplication,
} from "@/modules/workspace/repository";

interface SavedResearch {
  research: CompanyResearch;
  generatedAt: string;
}

function storageKey(applicationId: string) {
  return `roleward:company-research:${applicationId}`;
}

function loadSavedResearch(applicationId: string): SavedResearch | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(storageKey(applicationId)) ?? "null",
    ) as {
      research?: unknown;
      generatedAt?: unknown;
    } | null;
    const research = companyResearchSchema.safeParse(value?.research);
    return research.success && typeof value?.generatedAt === "string"
      ? { research: research.data, generatedAt: value.generatedAt }
      : null;
  } catch {
    return null;
  }
}

export function CompanyResearchWorkspace() {
  const [applications, setApplications] = useState<StoredApplication[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [result, setResult] = useState<SavedResearch | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const refresh = () => {
      const workspace = loadWorkspace(localStorage);
      setApplications(workspace.applications);
      const nextId =
        workspace.activeApplicationId ?? workspace.applications[0]?.id ?? "";
      setSelectedId(nextId);
      setResult(nextId ? loadSavedResearch(nextId) : null);
    };
    queueMicrotask(refresh);
    window.addEventListener(workspaceUpdatedEvent, refresh);
    return () => window.removeEventListener(workspaceUpdatedEvent, refresh);
  }, []);

  const application = useMemo(
    () => applications.find((item) => item.id === selectedId) ?? null,
    [applications, selectedId],
  );

  async function researchCompany() {
    if (!application) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/applications/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyName: application.companyName,
          roleTitle: application.roleTitle,
          location: application.location,
          sourceUrl: application.sourceUrl,
          jobDescription: application.jobDescription,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        research?: unknown;
        generatedAt?: string;
        error?: string;
      } | null;
      const parsed = companyResearchSchema.safeParse(body?.research);
      if (!response.ok || !parsed.success || !body?.generatedAt) {
        setError(body?.error ?? "Roleward could not complete that research.");
        return;
      }
      const next = { research: parsed.data, generatedAt: body.generatedAt };
      localStorage.setItem(storageKey(application.id), JSON.stringify(next));
      setResult(next);
    } catch {
      setError("Roleward could not reach the research service.");
    } finally {
      setBusy(false);
    }
  }

  if (!applications.length)
    return (
      <section className="border-iron/80 border-y py-16 text-center">
        <Building2 className="text-amber mx-auto size-6" />
        <h2 className="mt-4 text-xl font-semibold">
          Save a role to research it
        </h2>
        <p className="text-canvas mx-auto mt-2 max-w-md text-sm leading-6">
          Company research uses the actual posting to find relevant news,
          company context, and stronger interview questions.
        </p>
        <Link
          href="/dashboard/applications/new"
          className="text-amber mt-5 inline-flex items-center gap-2 text-sm font-semibold"
        >
          Add an application <ArrowRight className="size-4" />
        </Link>
      </section>
    );

  const research = result?.research;

  return (
    <div className="space-y-10">
      <section className="border-iron/80 flex flex-col justify-between gap-5 border-b pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="section-label">Company research</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em]">
            Know the company before the conversation.
          </h2>
          <p className="text-canvas mt-2 max-w-2xl text-sm leading-6">
            Roleward connects current company events to this specific role, then
            turns the research into useful interview angles.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-72">
          <label
            htmlFor="research-application"
            className="text-dust text-[10px] uppercase"
          >
            Application
          </label>
          <select
            id="research-application"
            value={selectedId}
            onChange={(event) => {
              const nextId = event.target.value;
              setSelectedId(nextId);
              setResult(loadSavedResearch(nextId));
              setError("");
            }}
            className="border-iron bg-night min-h-11 rounded-lg border px-3 text-sm"
          >
            {applications.map((item) => (
              <option key={item.id} value={item.id}>
                {item.companyName} · {item.roleTitle}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{application?.companyName}</p>
          <p className="text-dust mt-1 text-xs">
            {application?.roleTitle}
            {application?.location ? ` · ${application.location}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void researchCompany()}
          disabled={busy}
          className="bg-amber text-night flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : research ? (
            <RefreshCw className="size-4" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {busy
            ? "Researching…"
            : research
              ? "Refresh research"
              : "Research company"}
        </button>
      </div>

      {error && (
        <p className="border-kiln/30 bg-kiln/[.05] text-canvas rounded-lg border px-4 py-3 text-xs">
          {error}
        </p>
      )}

      {!research ? (
        <section className="border-iron/80 border-y py-14">
          <p className="text-dust max-w-xl text-sm leading-6">
            Run the briefing when you are ready. Research is saved to this
            application so you can return to it and refresh it before an
            interview.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,.6fr)]">
            <div>
              <p className="section-label">Briefing</p>
              <p className="mt-4 text-lg leading-8">
                {research.companySummary}
              </p>
            </div>
            <div className="border-iron/80 border-l pl-6">
              <p className="text-xs font-semibold">What they appear to value</p>
              <ul className="text-canvas mt-4 space-y-3 text-sm leading-6">
                {research.whatTheyValue.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-amber">—</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="border-iron/80 border-t pt-8">
            <div className="flex items-center gap-2">
              <Newspaper className="text-amber size-4" />
              <h3 className="font-semibold">Recent signals</h3>
            </div>
            <div className="mt-5 divide-y divide-[var(--iron)]">
              {research.recentEvents.map((event) => (
                <article
                  key={`${event.headline}-${event.sourceUrl}`}
                  className="grid gap-3 py-6 first:pt-0 lg:grid-cols-[8rem_1fr]"
                >
                  <p className="text-dust font-mono text-[10px] uppercase">
                    {event.date}
                  </p>
                  <div>
                    <h4 className="font-semibold">{event.headline}</h4>
                    <p className="text-canvas mt-2 text-sm leading-6">
                      {event.summary}
                    </p>
                    <p className="mt-3 text-xs leading-5">
                      <span className="text-amber font-semibold">
                        Why it matters:{" "}
                      </span>
                      <span className="text-canvas">{event.whyItMatters}</span>
                    </p>
                    <a
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-dust hover:text-linen mt-3 inline-flex items-center gap-1.5 text-[11px]"
                    >
                      {event.sourceTitle} <ExternalLink className="size-3" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-10 border-t border-[var(--iron)] pt-8 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber size-4" />
                <h3 className="font-semibold">Interview angles</h3>
              </div>
              <div className="mt-5 space-y-6">
                {research.interviewAngles.map((angle) => (
                  <article key={angle.topic}>
                    <h4 className="text-sm font-semibold">{angle.topic}</h4>
                    <p className="text-dust mt-1 text-xs leading-5">
                      {angle.why}
                    </p>
                    <p className="text-canvas mt-2 text-sm leading-6">
                      “{angle.question}”
                    </p>
                  </article>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <MessageCircleQuestion className="text-amber size-4" />
                <h3 className="font-semibold">Questions worth asking</h3>
              </div>
              <ol className="mt-5 space-y-4">
                {research.questionsToAsk.map((question, index) => (
                  <li
                    key={question}
                    className="grid grid-cols-[1.5rem_1fr] gap-2 text-sm leading-6"
                  >
                    <span className="text-dust font-mono text-[10px]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-canvas">{question}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <footer className="border-iron/80 text-dust flex flex-col gap-2 border-t pt-5 text-[10px] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Refreshed {new Date(result.generatedAt).toLocaleString()} · Verify
              time-sensitive details at the source.
            </span>
            <span>{research.sources.length} sources reviewed</span>
          </footer>
        </>
      )}
    </div>
  );
}
