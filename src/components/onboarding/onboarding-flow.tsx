"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  GraduationCap,
  TimerReset,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { candidateProfileSchema } from "@/modules/candidates/schema";
import { cn } from "@/lib/utils";

const languages = [
  ["typescript", "TypeScript"],
  ["python", "Python"],
  ["java", "Java"],
] as const;
const roles = [
  "Backend engineer",
  "Frontend engineer",
  "Full-stack engineer",
  "Mobile engineer",
];

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [track, setTrack] = useState<"internship" | "new_grad">("new_grad");
  const [graduationDate, setGraduationDate] = useState("2027-05-15");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([
    "Backend engineer",
  ]);
  const [selectedLanguages, setSelectedLanguages] = useState<
    Array<"typescript" | "python" | "java">
  >(["typescript"]);
  const [weeklyMinutes, setWeeklyMinutes] = useState(300);
  const [timeline, setTimeline] = useState<
    "exploring" | "one_month" | "three_months" | "six_months"
  >("three_months");

  function toggle<T>(value: T, values: T[], update: (next: T[]) => void) {
    update(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  }
  function finish() {
    const profile = candidateProfileSchema.parse({
      track,
      graduationDate,
      targetRoleTypes: selectedRoles,
      preferredLanguages: selectedLanguages,
      weeklyMinutes,
      interviewTimeline: timeline,
    });
    localStorage.setItem(
      "backstage:candidate-profile",
      JSON.stringify(profile),
    );
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-9 flex items-center gap-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]",
                item < step && "border-sage bg-sage text-night",
                item === step && "border-amber text-amber",
                item > step && "border-iron text-dust",
              )}
            >
              {item < step ? <Check className="size-3" /> : item}
            </span>
            <div
              className={cn("bg-iron h-px flex-1", item < step && "bg-sage")}
            />
          </div>
        ))}
      </div>
      {step === 1 && (
        <section>
          <GraduationCap className="text-amber size-5" />
          <p className="section-label mt-5">Step 1 · Your path</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">
            Where are you headed?
          </h1>
          <p className="text-canvas mt-2 text-sm">
            This sets the language and milestones used throughout your
            workspace.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              [
                "internship",
                "Internship",
                "For students building professional experience",
              ],
              [
                "new_grad",
                "New grad",
                "For final-year students and recent graduates",
              ],
            ].map(([value, title, copy]) => (
              <button
                key={value}
                onClick={() => setTrack(value as typeof track)}
                className={cn(
                  "rounded-xl border p-5 text-left",
                  track === value
                    ? "border-amber bg-amber/[.07]"
                    : "border-iron bg-workshop",
                )}
              >
                <p className="font-semibold">{title}</p>
                <p className="text-dust mt-2 text-xs leading-5">{copy}</p>
              </button>
            ))}
          </div>
          <label className="text-canvas mt-6 block text-xs">
            Expected graduation date
            <input
              type="date"
              value={graduationDate}
              onChange={(e) => setGraduationDate(e.target.value)}
              className="border-iron bg-raised text-linen mt-2 block w-full rounded-lg border px-3 py-3 text-sm sm:w-64"
            />
          </label>
        </section>
      )}
      {step === 2 && (
        <section>
          <Code2 className="text-amber size-5" />
          <p className="section-label mt-5">Step 2 · Your targets</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">
            What do you want to practice for?
          </h1>
          <p className="text-canvas mt-2 text-sm">
            Choose at least one role and coding language. You can change these
            later.
          </p>
          <p className="mt-7 text-xs font-semibold">Target roles</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => toggle(role, selectedRoles, setSelectedRoles)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs",
                  selectedRoles.includes(role)
                    ? "border-amber bg-amber/10 text-amber"
                    : "border-iron text-canvas",
                )}
              >
                {role}
              </button>
            ))}
          </div>
          <p className="mt-7 text-xs font-semibold">
            Preferred coding languages
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {languages.map(([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  toggle(value, selectedLanguages, setSelectedLanguages)
                }
                className={cn(
                  "rounded-xl border p-4 text-left text-sm",
                  selectedLanguages.includes(value)
                    ? "border-cobalt bg-cobalt/10"
                    : "border-iron bg-workshop",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}
      {step === 3 && (
        <section>
          <TimerReset className="text-amber size-5" />
          <p className="section-label mt-5">Step 3 · Your pace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">
            Build a plan you can keep.
          </h1>
          <p className="text-canvas mt-2 text-sm">
            Backstage will keep daily recommendations within this preparation
            budget.
          </p>
          <label className="mt-8 block text-xs font-semibold">
            Weekly preparation time{" "}
            <span className="text-amber ml-2 font-mono">
              {weeklyMinutes / 60} hours
            </span>
            <input
              className="mt-4 block w-full accent-[#df7c68]"
              type="range"
              min="60"
              max="900"
              step="30"
              value={weeklyMinutes}
              onChange={(e) => setWeeklyMinutes(Number(e.target.value))}
            />
          </label>
          <p className="mt-8 text-xs font-semibold">Interview timeline</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              ["one_month", "Within 1 month"],
              ["three_months", "Within 3 months"],
              ["six_months", "Within 6 months"],
              ["exploring", "Just exploring"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTimeline(value as typeof timeline)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left text-xs",
                  timeline === value
                    ? "border-amber bg-amber/10 text-amber"
                    : "border-iron text-canvas",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="border-iron mt-10 flex items-center justify-between border-t pt-6">
        <button
          onClick={() =>
            step > 1 ? setStep(step - 1) : router.push("/signup")
          }
          className="text-canvas flex items-center gap-2 px-2 text-sm"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
        {step < 3 ? (
          <button
            disabled={
              step === 2 && (!selectedRoles.length || !selectedLanguages.length)
            }
            onClick={() => setStep(step + 1)}
            className="bg-amber text-night flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold disabled:opacity-40"
          >
            Continue <ArrowRight className="size-4" />
          </button>
        ) : (
          <button
            onClick={finish}
            className="bg-amber text-night flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold"
          >
            Build my workspace <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
