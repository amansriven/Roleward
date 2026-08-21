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
      className={cn(
        "border-iron bg-workshop/60 rounded-xl border p-4 text-left transition",
        selected ? "border-plum/70 bg-plum/[.07]" : "hover:border-canvas/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        {selected && <Check className="text-plum size-4 shrink-0" />}
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
    const response = await fetch("/api/interviews/job-source", {
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
          "Backstage could not read that link. Paste the description instead.",
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
        setError(body?.error ?? "Backstage could not start that interview.");
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

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <p className="section-label">Stage Fright</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em]">
          Set up your mock interview.
        </h1>
        <div className="mt-5 flex gap-1.5">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={cn(
                "h-1 flex-1 rounded-full",
                index <= stepIndex ? "bg-plum" : "bg-iron",
              )}
            />
          ))}
        </div>
      </div>

      {step === "type" && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">What kind of interview?</h2>
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
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Which role are you preparing for?
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {applications.length > 0 && (
              <Choice
                selected={roleMode === "application"}
                onClick={() => setRoleMode("application")}
                title="A role you saved"
                detail="Uses the requirements already in Backstage"
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
                    "border-iron bg-workshop/60 flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm",
                    applicationId === application.id
                      ? "border-plum/70"
                      : "hover:border-canvas/40",
                  )}
                >
                  <span>
                    {application.companyName} · {application.roleTitle}
                  </span>
                  {applicationId === application.id && (
                    <Check className="text-plum size-4" />
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
              className="border-iron bg-workshop/60 w-full rounded-xl border px-4 py-3 text-sm"
            />
          )}
          {roleMode === "pasted" && (
            <textarea
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              rows={7}
              placeholder="Paste the job description here…"
              className="border-iron bg-workshop/60 w-full rounded-xl border px-4 py-3 text-sm"
            />
          )}
          {roleMode === "url" && (
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
              className="border-iron bg-workshop/60 w-full rounded-xl border px-4 py-3 text-sm"
            />
          )}
        </section>
      )}

      {step === "format" && (
        <section className="space-y-6">
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
                  "border-iron bg-workshop/60 flex items-center gap-3 rounded-xl border p-4 text-left",
                  modality === "text"
                    ? "border-plum/70 bg-plum/[.07]"
                    : "hover:border-canvas/40",
                )}
              >
                <Type className="text-plum size-4 shrink-0" />
                <span>
                  <span className="block text-sm font-semibold">Text</span>
                  <span className="text-dust text-xs">Type your answers</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setModality("voice")}
                className={cn(
                  "border-iron bg-workshop/60 flex items-center gap-3 rounded-xl border p-4 text-left",
                  modality === "voice"
                    ? "border-plum/70 bg-plum/[.07]"
                    : "hover:border-canvas/40",
                )}
              >
                <Mic className="text-plum size-4 shrink-0" />
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

      {error && <p className="text-kiln text-sm">{error}</p>}

      <div className="border-iron/60 flex items-center justify-between border-t pt-5">
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
            className="bg-plum inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60"
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
            className="bg-plum inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white"
          >
            Continue <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
