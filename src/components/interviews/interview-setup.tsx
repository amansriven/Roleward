"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  Mic,
  Type,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { INTERVIEW_PLANS, LENGTH_MINUTES } from "@/modules/interviews/plan";
import {
  interviewTypeSchema,
  type CodingDifficulty,
  type InterviewIntensity,
  type InterviewLength,
  type InterviewModality,
  type InterviewType,
  type RoleTarget,
} from "@/modules/interviews/schema";
import {
  loadWorkspace,
  type StoredApplication,
} from "@/modules/workspace/repository";

type Step = "type" | "role" | "format";
type RoleMode = "application" | "pasted" | "url" | "generic";

const TYPE_ORDER: InterviewType[] = [
  "behavioral",
  "coding",
  "recruiter_screen",
  "resume_deep_dive",
  "system_design",
  "pm_case",
];
const LENGTHS: InterviewLength[] = ["quick", "standard", "full"];
const INTENSITIES: InterviewIntensity[] = ["gentle", "realistic", "demanding"];
const INTENSITY_COPY: Record<InterviewIntensity, string> = {
  gentle: "Encouraging. Hints when you stall.",
  realistic: "Neutral, like the real thing.",
  demanding: "Pushes back. Asks for numbers.",
};
const DIFFICULTIES: CodingDifficulty[] = ["easy", "medium", "hard"];

function Choice({
  selected,
  onClick,
  title,
  detail,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group border-iron bg-workshop/60 hover:border-canvas/30 relative min-h-[94px] rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5",
        selected
          ? "border-amber/45 bg-amber/[.055] shadow-[0_12px_30px_rgba(0,0,0,.12),inset_0_1px_0_rgba(255,255,255,.035)]"
          : "hover:bg-linen/[.02]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border transition",
            selected
              ? "border-amber bg-amber text-night"
              : "border-iron group-hover:border-canvas/40 text-transparent",
          )}
        >
          <Check className="size-3" />
        </span>
      </div>
      <p className="text-dust mt-1.5 text-xs leading-5">{detail}</p>
    </button>
  );
}

export function InterviewSetup() {
  const router = useRouter();
  const search = useSearchParams();
  const [step, setStep] = useState<Step>("type");
  const [type, setType] = useState<InterviewType>("behavioral");
  const [applications, setApplications] = useState<StoredApplication[]>([]);
  const [roleMode, setRoleMode] = useState<RoleMode>("generic");
  const [applicationId, setApplicationId] = useState("");
  const [pasted, setPasted] = useState("");
  const [url, setUrl] = useState("");
  const [genericLabel, setGenericLabel] = useState("Software Engineering role");
  const [length, setLength] = useState<InterviewLength>("standard");
  const [intensity, setIntensity] = useState<InterviewIntensity>("realistic");
  const [modality, setModality] = useState<InterviewModality>("text");
  const [difficulty, setDifficulty] = useState<CodingDifficulty>("medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const requested = interviewTypeSchema.safeParse(search.get("type"));
      if (requested.success) setType(requested.data);
      const workspace = loadWorkspace(localStorage);
      setApplications(workspace.applications);
      if (workspace.applications.length) {
        setRoleMode("application");
        setApplicationId(
          workspace.activeApplicationId ?? workspace.applications[0]!.id,
        );
      }
    });
  }, [search]);

  function buildRoleTarget(): RoleTarget | null {
    if (roleMode === "application")
      return applicationId ? { kind: "application", applicationId } : null;
    if (roleMode === "pasted")
      return pasted.trim().length >= 40
        ? { kind: "pasted", jobDescription: pasted.trim() }
        : null;
    if (roleMode === "url") return null;
    return genericLabel.trim().length >= 2
      ? { kind: "generic", label: genericLabel.trim() }
      : null;
  }

  async function resolveUrlTarget(): Promise<RoleTarget | null> {
    const response = await fetch("/api/jobs/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: url.trim() }),
    });
    const body = (await response.json().catch(() => null)) as {
      description?: string;
      error?: string;
    } | null;
    if (!response.ok || !body?.description) {
      setError(
        body?.error ??
          "Roleward could not read that link. Paste the description instead.",
      );
      return null;
    }
    return {
      kind: "url",
      url: url.trim(),
      resolvedDescription: body.description,
    };
  }

  async function start() {
    setError("");
    setBusy(true);
    try {
      const roleTarget =
        roleMode === "url" ? await resolveUrlTarget() : buildRoleTarget();
      if (!roleTarget) {
        if (roleMode !== "url") setError("Choose or describe a role first.");
        return;
      }
      const response = await fetch("/api/interviews/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          modality,
          intensity,
          length,
          roleTarget,
          ...(type === "coding" ? { difficulty } : {}),
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        session?: { id: string };
        error?: string;
      } | null;
      if (!response.ok || !body?.session) {
        setError(body?.error ?? "Roleward could not start that interview.");
        return;
      }
      router.push(`/dashboard/stage-fright/session/${body.session.id}`);
    } catch {
      setError("Something went wrong starting the interview.");
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = step === "type" ? 0 : step === "role" ? 1 : 2;

  const steps = [
    { label: "Interview", detail: "Choose a format" },
    { label: "Role context", detail: "Personalize questions" },
    { label: "Session", detail: "Set the pace" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 lg:space-y-8">
      <div className="border-iron/80 border-b pb-7">
        <p className="section-label">Stage Fright · New rehearsal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-[2.5rem]">
          Build the room before you enter it.
        </h1>
        <p className="text-canvas mt-3 max-w-2xl text-sm leading-6">
          Give your interviewer just enough context to make every question feel
          relevant to the conversation you are preparing for.
        </p>
      </div>

      <nav aria-label="Interview setup progress" className="grid grid-cols-3">
        {steps.map((item, index) => {
          const active = index === stepIndex;
          const complete = index < stepIndex;
          return (
            <div key={item.label} className="relative pr-3 last:pr-0">
              {index < steps.length - 1 && (
                <span className="bg-iron absolute top-4 right-0 left-8 h-px">
                  <span
                    className={cn(
                      "bg-amber block h-full transition-all duration-500",
                      complete ? "w-full" : "w-0",
                    )}
                  />
                </span>
              )}
              <div className="relative flex items-start gap-2.5">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] transition-all duration-300",
                    complete
                      ? "border-amber bg-amber text-night"
                      : active
                        ? "border-amber/60 bg-amber/[.08] text-amber shadow-[0_0_0_4px_rgba(255,122,89,.05)]"
                        : "border-iron bg-workshop text-dust",
                  )}
                >
                  {complete ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span className="hidden pt-0.5 sm:block">
                  <span
                    className={cn(
                      "block text-xs font-medium",
                      active || complete ? "text-linen" : "text-dust",
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="text-dust mt-1 block text-[10px]">
                    {item.detail}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="roleward-card rounded-[22px] p-5 sm:p-7">
        {step === "type" && (
          <section className="interview-message-enter space-y-5">
            <div>
              <p className="text-amber text-[10px] tracking-[.12em] uppercase">
                Step 1 of 3
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-.025em]">
                What are you walking into?
              </h2>
              <p className="text-dust mt-2 text-xs leading-5">
                We will shape the interviewer, rubric, and follow-up style
                around this choice.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {TYPE_ORDER.map((item) => (
                <Choice
                  key={item}
                  selected={type === item}
                  onClick={() => setType(item)}
                  title={INTERVIEW_PLANS[item].label}
                  detail={INTERVIEW_PLANS[item].summary}
                />
              ))}
            </div>
            {type === "coding" && (
              <div>
                <p className="text-dust mb-2 text-xs">Difficulty</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {DIFFICULTIES.map((item) => (
                    <Choice
                      key={item}
                      selected={difficulty === item}
                      onClick={() => setDifficulty(item)}
                      title={item[0]!.toUpperCase() + item.slice(1)}
                      detail={
                        item === "easy"
                          ? "Warm-up fundamentals"
                          : item === "medium"
                            ? "Typical screen difficulty"
                            : "Onsite-level challenge"
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {step === "role" && (
          <section className="interview-message-enter space-y-5">
            <div>
              <p className="text-amber text-[10px] tracking-[.12em] uppercase">
                Step 2 of 3
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-.025em]">
                Which role are you preparing for?
              </h2>
              <p className="text-dust mt-2 text-xs leading-5">
                Specific context creates sharper questions. General practice is
                always available when you just want repetitions.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {applications.length > 0 && (
                <Choice
                  selected={roleMode === "application"}
                  onClick={() => setRoleMode("application")}
                  title="A role you saved"
                  detail="Uses the requirements already in Roleward"
                />
              )}
              <Choice
                selected={roleMode === "generic"}
                onClick={() => setRoleMode("generic")}
                title="Just a general role"
                detail="Broader practice, no specific posting"
              />
              <Choice
                selected={roleMode === "pasted"}
                onClick={() => setRoleMode("pasted")}
                title="Paste a job description"
                detail="Most accurate for a specific posting"
              />
              <Choice
                selected={roleMode === "url"}
                onClick={() => setRoleMode("url")}
                title="Paste a job link"
                detail="We'll try to read it. Many sites block this."
              />
            </div>

            {roleMode === "application" && (
              <div className="space-y-2">
                {applications.map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    onClick={() => setApplicationId(application.id)}
                    className={cn(
                      "border-iron bg-workshop/60 hover:border-canvas/30 flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm transition",
                      applicationId === application.id
                        ? "border-amber/50 bg-amber/[.05]"
                        : "",
                    )}
                  >
                    <span>
                      {application.companyName} · {application.roleTitle}
                    </span>
                    {applicationId === application.id && (
                      <Check className="text-amber size-4" />
                    )}
                  </button>
                ))}
              </div>
            )}
            {roleMode === "generic" && (
              <input
                value={genericLabel}
                onChange={(event) => setGenericLabel(event.target.value)}
                placeholder="Software Engineering role"
                className="border-iron bg-workshop/60 focus:border-amber/40 w-full rounded-xl border px-4 py-3 text-sm transition focus:outline-none"
              />
            )}
            {roleMode === "pasted" && (
              <textarea
                value={pasted}
                onChange={(event) => setPasted(event.target.value)}
                rows={7}
                placeholder="Paste the job description here…"
                className="border-iron bg-workshop/60 focus:border-amber/40 w-full rounded-xl border px-4 py-3 text-sm leading-6 transition focus:outline-none"
              />
            )}
            {roleMode === "url" && (
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://…"
                className="border-iron bg-workshop/60 focus:border-amber/40 w-full rounded-xl border px-4 py-3 text-sm transition focus:outline-none"
              />
            )}
          </section>
        )}

        {step === "format" && (
          <section className="interview-message-enter space-y-7">
            <div>
              <p className="text-amber text-[10px] tracking-[.12em] uppercase">
                Step 3 of 3
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-.025em]">
                Set the pace and pressure.
              </h2>
              <p className="text-dust mt-2 text-xs leading-5">
                Start realistic. Increase the pressure once your answers feel
                structured and repeatable.
              </p>
            </div>
            <div>
              <h2 className="mb-3 text-lg font-semibold">How long?</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {LENGTHS.map((item) => (
                  <Choice
                    key={item}
                    selected={length === item}
                    onClick={() => setLength(item)}
                    title={item[0]!.toUpperCase() + item.slice(1)}
                    detail={`About ${LENGTH_MINUTES[item]} minutes`}
                  />
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-lg font-semibold">
                How hard should it feel?
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {INTENSITIES.map((item) => (
                  <Choice
                    key={item}
                    selected={intensity === item}
                    onClick={() => setIntensity(item)}
                    title={item[0]!.toUpperCase() + item.slice(1)}
                    detail={INTENSITY_COPY[item]}
                  />
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-lg font-semibold">Typing or talking?</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setModality("text")}
                  className={cn(
                    "border-iron bg-workshop/60 hover:border-canvas/30 flex items-center gap-3 rounded-xl border p-4 text-left transition hover:-translate-y-0.5",
                    modality === "text"
                      ? "border-amber/45 bg-amber/[.055]"
                      : "",
                  )}
                >
                  <Type className="text-amber size-4 shrink-0" />
                  <span>
                    <span className="block text-sm font-semibold">Text</span>
                    <span className="text-dust text-xs">Type your answers</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setModality("voice")}
                  className={cn(
                    "border-iron bg-workshop/60 hover:border-canvas/30 flex items-center gap-3 rounded-xl border p-4 text-left transition hover:-translate-y-0.5",
                    modality === "voice"
                      ? "border-amber/45 bg-amber/[.055]"
                      : "",
                  )}
                >
                  <Mic className="text-amber size-4 shrink-0" />
                  <span>
                    <span className="block text-sm font-semibold">Voice</span>
                    <span className="text-dust text-xs">
                      Speak out loud, like a real call
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </section>
        )}

        {error && (
          <p
            role="alert"
            className="border-kiln/20 bg-kiln/[.06] text-kiln mt-5 rounded-xl border px-4 py-3 text-sm"
          >
            {error}
          </p>
        )}

        <div className="border-iron/60 mt-7 flex items-center justify-between border-t pt-5">
          <button
            type="button"
            onClick={() => setStep(step === "format" ? "role" : "type")}
            disabled={step === "type"}
            className="text-canvas hover:text-linen inline-flex items-center gap-2 text-sm disabled:opacity-40"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
          {step === "format" ? (
            <button
              type="button"
              onClick={() => void start()}
              disabled={busy}
              className="bg-amber text-night hover:bg-sunset inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-[0_10px_24px_rgba(255,122,89,.15)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" /> Starting…
                </>
              ) : (
                <>
                  Start interview <ArrowRight className="size-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step === "type" ? "role" : "format")}
              className="bg-amber text-night hover:bg-sunset inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-[0_10px_24px_rgba(255,122,89,.15)] transition hover:-translate-y-0.5"
            >
              Continue <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
