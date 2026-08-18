"use client";

import { Braces, Check, Eye, LoaderCircle, Play, X } from "lucide-react";
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
import {
  EXECUTABLE_LANGUAGES,
  isExecutable,
  LANGUAGE_LABELS,
  LANGUAGES,
  VERDICT_LABELS,
  type ExecutionResult,
  type Language,
} from "@/modules/execution/port";
import { renderStub } from "@/modules/guru/stubs";

/** Runnable languages first, since only those get a verdict. */
const ORDERED_LANGUAGES: Language[] = [
  ...EXECUTABLE_LANGUAGES,
  ...LANGUAGES.filter((item) => !isExecutable(item)),
];

export function CodePane({
  problem,
  busy,
  onCheckIn,
  onRun,
}: {
  problem: NonNullable<InterviewSession["codingProblem"]>;
  busy: boolean;
  onCheckIn: (digest: string) => void;
  onRun: (
    language: Language,
    code: string,
  ) => Promise<{ result?: ExecutionResult; error?: string }>;
}) {
  const execution = problem.execution;
  const [language, setLanguage] = useState<Language>(
    EXECUTABLE_LANGUAGES[0] ?? "python",
  );
  // Starting from the signature stub rather than an empty box: transcribing a
  // signature is not what the interview is testing.
  const [code, setCode] = useState(() =>
    execution ? renderStub(execution.signature, language) : "",
  );
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<ExecutionResult | null>(null);
  const [runError, setRunError] = useState("");
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

  function switchLanguage(next: Language) {
    setLanguage(next);
    // Only replace untouched boilerplate; never discard real work.
    if (
      execution &&
      code.trim() === renderStub(execution.signature, language).trim()
    )
      setCode(renderStub(execution.signature, next));
  }

  async function run() {
    if (!execution || running) return;
    setRunning(true);
    setRunError("");
    try {
      const response = await onRun(language, code);
      if (response.error) setRunError(response.error);
      setOutcome(response.result ?? null);
    } finally {
      setRunning(false);
    }
  }

  const lines = code.split("\n").length;
  const cases = outcome?.outcomes ?? [];

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
            onChange={(event) => switchLanguage(event.target.value as Language)}
            aria-label="Language"
            className="bg-transparent text-xs outline-none"
          >
            {ORDERED_LANGUAGES.map((item) => (
              <option key={item} value={item} className="bg-workshop">
                {LANGUAGE_LABELS[item]}
                {isExecutable(item) ? "" : " (editor only)"}
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

      {execution && (outcome || runError) && (
        <div className="border-iron/70 max-h-44 overflow-y-auto border-t p-3">
          {runError ? (
            <p className="text-[11px] text-red-400">{runError}</p>
          ) : outcome ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span
                  className={
                    outcome.verdict === "accepted"
                      ? "text-sage text-xs font-semibold"
                      : "text-xs font-semibold text-red-400"
                  }
                >
                  {VERDICT_LABELS[outcome.verdict]}
                </span>
                <span className="text-dust font-mono text-[10px]">
                  {outcome.passed}/{outcome.total} tests
                </span>
              </div>

              {outcome.message && (
                <pre className="text-dust overflow-x-auto font-mono text-[10px] leading-4 whitespace-pre-wrap">
                  {outcome.message}
                </pre>
              )}

              {cases.map((item) => (
                <div key={item.index} className="flex items-start gap-2">
                  {item.passed ? (
                    <Check className="text-sage mt-0.5 size-3 shrink-0" />
                  ) : (
                    <X className="mt-0.5 size-3 shrink-0 text-red-400" />
                  )}
                  <div className="min-w-0 font-mono text-[10px] leading-4">
                    <p className="text-canvas truncate">
                      {JSON.stringify(execution.tests[item.index]?.input)}
                    </p>
                    {!item.passed && (
                      <p className="text-dust truncate">
                        expected{" "}
                        {JSON.stringify(execution.tests[item.index]?.expected)},
                        got {JSON.stringify(item.actual)}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Hidden tests are counted but never described. */}
            </div>
          ) : null}
        </div>
      )}

      <div className="border-iron/70 flex items-center justify-between gap-3 border-t p-3">
        <p className="text-dust text-[11px]">
          The interviewer only sees your code when you ask.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {execution && (
            <button
              type="button"
              onClick={() => void run()}
              disabled={running || !isExecutable(language) || !code.trim()}
              title={
                isExecutable(language)
                  ? "Run against the tests"
                  : `${LANGUAGE_LABELS[language]} cannot be run yet`
              }
              className="border-iron text-canvas hover:text-linen inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold disabled:opacity-40"
            >
              {running ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5" />
              )}
              Run tests
            </button>
          )}
          <button
            type="button"
            onClick={checkIn}
            disabled={busy || !code.trim()}
            className="bg-cobalt inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-40"
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
    </div>
  );
}
