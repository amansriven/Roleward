"use client";

import { Braces, Eye, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import {
  createEditLog,
  describeActivity,
  diffToOp,
  recordChange,
  summarizeActivity,
  type EditLog,
} from "@/modules/interviews/coding/edit-log";
import type { InterviewSession } from "@/modules/interviews/schema";

const LANGUAGES = ["TypeScript", "Python", "Java"] as const;

export function CodePane({
  problem,
  busy,
  onCheckIn,
}: {
  problem: NonNullable<InterviewSession["codingProblem"]>;
  busy: boolean;
  onCheckIn: (digest: string) => void;
}) {
  const [code, setCode] = useState("");
  const [language, setLanguage] =
    useState<(typeof LANGUAGES)[number]>("TypeScript");
  // The full log stays here and costs nothing; only digests are sent. Created
  // lazily because the clock must not be read during render.
  const log = useRef<EditLog | null>(null);
  const lastCheckIn = useRef<number | null>(null);
  const editLog = () => (log.current ??= createEditLog());

  function update(next: string) {
    const op = diffToOp(code, next);
    if (op) log.current = recordChange(editLog(), op);
    setCode(next);
  }

  function checkIn() {
    const current = editLog();
    const summary = summarizeActivity(
      current,
      lastCheckIn.current ?? current.startedAt,
    );
    lastCheckIn.current = Date.now();
    onCheckIn(describeActivity(summary, code));
  }

  const lines = code.split("\n").length;

  return (
    <div className="border-iron bg-workshop/60 flex min-h-0 flex-col overflow-hidden rounded-2xl border">
      <div className="border-iron/70 border-b p-4">
        <p className="text-sm font-semibold">{problem.title}</p>
        <p className="text-dust mt-1 text-[11px]">{problem.topic}</p>
        <p className="text-canvas mt-3 text-xs leading-5">{problem.prompt}</p>
      </div>

      <div className="border-iron/70 flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Braces className="text-cobalt size-3.5" />
          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as (typeof LANGUAGES)[number])
            }
            aria-label="Language"
            className="bg-transparent text-xs outline-none"
          >
            {LANGUAGES.map((item) => (
              <option key={item} value={item} className="bg-workshop">
                {item}
              </option>
            ))}
          </select>
        </div>
        <span className="text-dust font-mono text-[10px]">{lines} lines</span>
      </div>

      <div className="relative min-h-0 flex-1 bg-[#18191e]">
        <textarea
          value={code}
          onChange={(event) => update(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            event.preventDefault();
            const target = event.currentTarget;
            const { selectionStart, selectionEnd } = target;
            const next =
              code.slice(0, selectionStart) + "  " + code.slice(selectionEnd);
            update(next);
            requestAnimationFrame(() => {
              target.selectionStart = target.selectionEnd = selectionStart + 2;
            });
          }}
          spellCheck={false}
          placeholder="// Talk through your approach, then write it here."
          className="text-linen h-full w-full resize-none bg-transparent p-4 font-mono text-xs leading-6 outline-none"
        />
      </div>

      <div className="border-iron/70 flex items-center justify-between gap-3 border-t p-3">
        <p className="text-dust text-[11px]">
          The interviewer only sees your code when you ask.
        </p>
        <button
          type="button"
          onClick={checkIn}
          disabled={busy || !code.trim()}
          className="bg-cobalt inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-40"
        >
          {busy ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Eye className="size-3.5" />
          )}
          Ask the interviewer
        </button>
      </div>
    </div>
  );
}
