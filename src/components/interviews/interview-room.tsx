"use client";

import {
  ArrowUp,
  Clock3,
  LoaderCircle,
  Mic,
  Mic2,
  MicOff,
  Radio,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ExecutionResult, Language } from "@/modules/execution/port";
import {
  INTERVIEW_PLANS,
  LENGTH_MINUTES,
  TURN_BUDGETS,
} from "@/modules/interviews/plan";
import {
  startRealtimeInterview,
  type RealtimeSession,
  type RealtimeStatus,
} from "@/modules/interviews/realtime-client";
import {
  summarizeSession,
  type InterviewSession,
} from "@/modules/interviews/schema";
import { saveInterviewSummary } from "@/modules/workspace/repository";
import { CodePane } from "./code-pane";

interface Message {
  role: "interviewer" | "candidate";
  content: string;
}

const VOICE_STATUS_COPY: Record<RealtimeStatus, string> = {
  connecting: "Connecting…",
  live: "Live",
  closed: "Call ended",
  unsupported: "This browser cannot run voice interviews.",
  mic_denied: "Microphone access was denied.",
  failed: "The voice connection failed.",
};

export function InterviewRoom({ session }: { session: InterviewSession }) {
  const router = useRouter();
  const plan = INTERVIEW_PLANS[session.config.type];
  const isVoice = session.config.modality === "voice";

  const [messages, setMessages] = useState<Message[]>(
    session.turns.map((turn) => ({ role: turn.role, content: turn.content })),
  );
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");
  const [voiceStatus, setVoiceStatus] = useState<RealtimeStatus>("connecting");
  const [speaking, setSpeaking] = useState(false);
  const [fellBackToText, setFellBackToText] = useState(false);

  const realtime = useRef<RealtimeSession | null>(null);
  const messagesRef = useRef<Message[]>(messages);
  const bottom = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Read by finish(), which must see the latest transcript without being
    // re-created on every message.
    messagesRef.current = messages;
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    if (!isVoice) return;
    let cancelled = false;
    void startRealtimeInterview(session.id, {
      onStatus: (status, detail) => {
        if (cancelled) return;
        setVoiceStatus(status);
        if (
          status === "unsupported" ||
          status === "mic_denied" ||
          status === "failed"
        ) {
          setFellBackToText(true);
          if (detail) setError(detail);
        }
      },
      onTranscript: (role, text) =>
        !cancelled &&
        setMessages((current) => [...current, { role, content: text }]),
      onSpeakingChange: (value) => !cancelled && setSpeaking(value),
    }).then((instance) => {
      if (cancelled) instance?.close();
      else realtime.current = instance;
    });
    return () => {
      cancelled = true;
      realtime.current?.close();
      realtime.current = null;
    };
  }, [isVoice, session.id]);

  const voiceLive = isVoice && voiceStatus === "live" && !fellBackToText;
  const showTextInput = !isVoice || fellBackToText;

  /**
   * In voice mode the digest goes straight into the live Realtime session, so a
   * check-in costs no extra API call.
   */
  function checkInWithCode(digest: string) {
    if (voiceLive && realtime.current) {
      realtime.current.sendContext(digest);
      return;
    }
    void sendToInterviewer(digest, { show: false });
  }

  /**
   * Running is a judged submission, so the verdict is recorded on the session
   * server-side. The interviewer learns of it on its next turn rather than
   * being interrupted mid-answer.
   */
  async function runCode(language: Language, code: string) {
    try {
      const response = await fetch("/api/interviews/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, language, code }),
      });
      const body = (await response.json().catch(() => null)) as {
        result?: ExecutionResult;
        error?: string;
      } | null;
      if (!response.ok)
        return { error: body?.error ?? "Roleward could not run that code." };
      return { result: body?.result };
    } catch {
      return { error: "Roleward could not reach the judge." };
    }
  }

  async function sendToInterviewer(
    text: string,
    { show = true }: { show?: boolean } = {},
  ) {
    if (thinking) return;
    setError("");
    if (show)
      setMessages((current) => [
        ...current,
        { role: "candidate", content: text },
      ]);
    setThinking(true);
    try {
      const response = await fetch("/api/interviews/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, answer: text }),
      });
      const body = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.message) {
        setError(body?.error ?? "The interviewer did not respond. Try again.");
        return;
      }
      setMessages((current) => [
        ...current,
        { role: "interviewer", content: body.message! },
      ]);
    } catch {
      setError("The interviewer did not respond. Try again.");
    } finally {
      setThinking(false);
    }
  }

  function submit() {
    const text = answer.trim();
    if (!text) return;
    setAnswer("");
    void sendToInterviewer(text);
  }

  const finish = useCallback(async () => {
    setFinishing(true);
    setError("");
    try {
      realtime.current?.close();
      realtime.current = null;
      if (isVoice) {
        const transcript = messagesRef.current;
        if (!transcript.some((message) => message.role === "candidate")) {
          setError("Answer at least one question before finishing.");
          return;
        }
        await fetch("/api/interviews/transcript", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId: session.id, turns: transcript }),
        });
      }
      const response = await fetch("/api/interviews/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const body = (await response.json().catch(() => null)) as {
        session?: InterviewSession;
        error?: string;
      } | null;
      if (!response.ok || !body?.session) {
        setError(body?.error ?? "Roleward could not score this interview.");
        return;
      }
      const summary = summarizeSession(body.session);
      if (summary) saveInterviewSummary(localStorage, summary);
      router.push(`/dashboard/stage-fright/report/${session.id}`);
    } catch {
      setError("Roleward could not score this interview.");
    } finally {
      setFinishing(false);
    }
  }, [isVoice, router, session.id]);

  const coding = plan.usesCodeEditor ? session.codingProblem : null;
  const candidateTurns = messages.filter(
    (message) => message.role === "candidate",
  ).length;
  const turnBudget = TURN_BUDGETS[session.config.length];
  const sessionProgress = Math.min(
    100,
    Math.round((candidateTurns / turnBudget) * 100),
  );
  const intensityLabel =
    session.config.intensity[0]!.toUpperCase() +
    session.config.intensity.slice(1);

  return (
    <div
      className={cn(
        "mx-auto flex h-[calc(100dvh-8rem)] min-h-[620px] flex-col gap-4",
        coding ? "max-w-[1500px]" : "max-w-6xl",
      )}
    >
      <header className="roleward-card flex shrink-0 flex-col justify-between gap-4 rounded-[20px] px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="border-amber/20 bg-amber/[.07] text-amber relative flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
            <Mic2 className="size-[18px]" />
            <span className="border-workshop bg-sage absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">{plan.label}</p>
              <span className="border-iron bg-night/40 text-dust hidden rounded-full border px-2 py-0.5 text-[9px] tracking-[.08em] uppercase sm:inline">
                Live rehearsal
              </span>
            </div>
            <p className="text-canvas mt-1 truncate text-xs">
              {session.roleLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-dust hidden items-center gap-2 text-[11px] md:flex">
            <span className="text-canvas font-mono">
              {Math.min(candidateTurns + 1, turnBudget)} / {turnBudget}
            </span>
            questions
          </span>
          {isVoice && (
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px]",
                voiceLive
                  ? "border-sage/20 bg-sage/[.06] text-sage"
                  : "border-iron bg-night/30 text-dust",
              )}
            >
              {voiceLive ? (
                <Radio className={cn("size-3", speaking && "animate-pulse")} />
              ) : (
                <MicOff className="size-3" />
              )}
              {VOICE_STATUS_COPY[voiceStatus]}
            </span>
          )}
          <button
            type="button"
            onClick={() => void finish()}
            disabled={finishing}
            className="border-iron bg-linen/[.025] text-canvas hover:border-amber/25 hover:text-linen inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition disabled:opacity-50"
          >
            {finishing ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Square className="size-3.5" />
            )}
            Finish & score
          </button>
        </div>
      </header>

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-4",
          coding
            ? "grid-rows-[minmax(300px,1fr)_minmax(420px,1fr)] xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,.6fr)] xl:grid-rows-1"
            : "lg:grid-cols-[250px_minmax(0,1fr)]",
        )}
      >
        {!coding && (
          <aside className="roleward-card hidden min-h-0 flex-col overflow-hidden rounded-[20px] lg:flex">
            <div className="border-iron/70 border-b p-5">
              <p className="text-dust text-[10px] font-medium tracking-[.12em] uppercase">
                Session brief
              </p>
              <p className="mt-3 text-sm leading-5 font-semibold">
                {session.roleLabel}
              </p>
              <p className="text-dust mt-2 text-xs leading-5">{plan.summary}</p>
            </div>
            <div className="space-y-5 p-5">
              <SessionDetail
                icon={<Clock3 className="size-3.5" />}
                label="Length"
                value={`About ${LENGTH_MINUTES[session.config.length]} min`}
              />
              <SessionDetail
                icon={isVoice ? <Mic className="size-3.5" /> : <TypeIcon />}
                label="Format"
                value={isVoice ? "Voice conversation" : "Written responses"}
              />
              <SessionDetail
                icon={<Sparkles className="size-3.5" />}
                label="Pressure"
                value={intensityLabel}
              />
            </div>
            <div className="border-iron/70 mt-auto border-t p-5">
              <div className="flex items-center justify-between text-[10px] tracking-[.08em] uppercase">
                <span className="text-dust">Session progress</span>
                <span className="text-canvas font-mono">
                  {sessionProgress}%
                </span>
              </div>
              <div className="bg-iron/70 mt-3 h-1.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--amber),var(--sunset))] transition-[width] duration-700 ease-out"
                  style={{ width: `${sessionProgress}%` }}
                />
              </div>
              <p className="text-dust mt-3 text-[11px] leading-4">
                Stay specific. The scorecard arrives after you finish.
              </p>
            </div>
          </aside>
        )}

        {coding && (
          <div className="flex min-h-0 overflow-hidden rounded-[20px]">
            <CodePane
              problem={coding}
              busy={thinking}
              onCheckIn={checkInWithCode}
              onRun={runCode}
            />
          </div>
        )}
        <section className="roleward-card flex min-h-0 flex-col overflow-hidden rounded-[20px]">
          <div className="border-iron/70 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="bg-amber/[.07] text-amber relative flex size-9 items-center justify-center rounded-xl">
                <Mic2 className="size-4" />
                {voiceLive && (
                  <span className="border-workshop bg-sage absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2" />
                )}
              </span>
              <div>
                <p className="text-xs font-semibold">AI interviewer</p>
                <p className="text-dust mt-0.5 text-[10px]">
                  {intensityLabel} mode · one question at a time
                </p>
              </div>
            </div>
            <span className="text-dust hidden items-center gap-1.5 text-[10px] sm:flex">
              <span className="bg-sage size-1.5 rounded-full" /> Session active
            </span>
          </div>

          <div
            className="min-h-0 flex-1 [scrollbar-color:var(--iron)_transparent] space-y-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7"
            aria-live="polite"
            aria-label="Interview transcript"
          >
            {messages.map((message, index) => {
              const candidate = message.role === "candidate";
              return (
                <div
                  key={index}
                  className={cn(
                    "interview-message-enter flex items-end gap-2.5",
                    candidate ? "justify-end" : "justify-start",
                  )}
                >
                  {!candidate && (
                    <span className="border-amber/15 bg-amber/[.05] text-amber mb-1 hidden size-7 shrink-0 items-center justify-center rounded-lg border sm:flex">
                      <Mic2 className="size-3" />
                    </span>
                  )}
                  <div className={cn("max-w-[88%]", candidate && "text-right")}>
                    <p className="text-dust mb-1.5 px-1 text-[9px] font-medium tracking-[.08em] uppercase">
                      {candidate ? "You" : "Interviewer"}
                    </p>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-left text-[13px] leading-6 sm:px-5 sm:py-3.5 sm:text-sm",
                        candidate
                          ? "border-amber/20 bg-amber/[.08] text-linen rounded-tr-md border shadow-[0_10px_24px_rgba(0,0,0,.12)]"
                          : "border-iron/90 bg-raised/80 text-canvas rounded-tl-md border shadow-[0_10px_24px_rgba(0,0,0,.14)]",
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            })}
            {thinking && (
              <div className="interview-message-enter flex items-end gap-2.5">
                <span className="border-amber/15 bg-amber/[.05] text-amber mb-1 hidden size-7 shrink-0 items-center justify-center rounded-lg border sm:flex">
                  <Mic2 className="size-3" />
                </span>
                <div>
                  <p className="text-dust mb-1.5 px-1 text-[9px] font-medium tracking-[.08em] uppercase">
                    Interviewer
                  </p>
                  <div className="border-iron/90 bg-raised/80 flex h-11 items-center gap-1.5 rounded-2xl rounded-tl-md border px-4">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="bg-canvas size-1.5 animate-pulse rounded-full"
                        style={{ animationDelay: `${dot * 140}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {voiceLive && !messages.length && (
              <div className="flex min-h-full items-center justify-center py-10 text-center">
                <div>
                  <VoiceOrb speaking={speaking} />
                  <p className="mt-5 text-sm font-medium">
                    Your interviewer is joining
                  </p>
                  <p className="text-dust mt-2 text-xs">
                    The first question will begin in a moment.
                  </p>
                </div>
              </div>
            )}
            <div ref={bottom} />
          </div>

          <div className="border-iron/70 bg-night/15 shrink-0 border-t p-3 sm:p-4">
            {error && (
              <div
                role="alert"
                className="border-kiln/20 bg-kiln/[.06] text-kiln mb-3 rounded-xl border px-3 py-2.5 text-xs"
              >
                {error}
              </div>
            )}
            {showTextInput ? (
              <>
                {fellBackToText && (
                  <p className="text-dust mb-2 text-[11px]">
                    Voice was unavailable, so this rehearsal is continuing in
                    text.
                  </p>
                )}
                <div className="border-iron bg-workshop/80 focus-within:border-amber/35 flex items-end gap-2 rounded-2xl border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.025)] transition focus-within:shadow-[0_0_0_3px_rgba(255,122,89,.05)]">
                  <textarea
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        (event.metaKey || event.ctrlKey)
                      ) {
                        event.preventDefault();
                        submit();
                      }
                    }}
                    rows={2}
                    placeholder="Answer naturally. Use specifics, decisions, and outcomes…"
                    aria-label="Your interview answer"
                    className="text-linen placeholder:text-dust/80 min-h-12 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-5 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => submit()}
                    disabled={!answer.trim() || thinking}
                    aria-label="Send answer"
                    className="bg-amber text-night hover:bg-sunset flex size-10 shrink-0 items-center justify-center rounded-xl shadow-[0_8px_20px_rgba(255,122,89,.16)] transition disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                </div>
                <div className="text-dust mt-2 flex items-center justify-between px-1 text-[10px]">
                  <span>Take a breath. Clear beats fast.</span>
                  <span className="hidden font-mono sm:inline">
                    ⌘ ↵ to send
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center gap-4 py-2">
                <VoiceOrb speaking={speaking} compact />
                <div>
                  <p className="text-linen text-xs font-medium">
                    {speaking ? "Interviewer is speaking" : "Listening to you"}
                  </p>
                  <p className="text-dust mt-1 text-[10px]">
                    {speaking
                      ? "You can interrupt naturally at any time."
                      : "Speak normally—no button press needed."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SessionDetail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="bg-linen/[.035] text-amber mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg">
        {icon}
      </span>
      <div>
        <p className="text-dust text-[10px] tracking-[.08em] uppercase">
          {label}
        </p>
        <p className="text-canvas mt-1 text-xs">{value}</p>
      </div>
    </div>
  );
}

function TypeIcon() {
  return <span className="font-mono text-[11px] font-semibold">Aa</span>;
}

function VoiceOrb({
  speaking,
  compact = false,
}: {
  speaking: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "border-amber/20 bg-amber/[.06] text-amber relative flex shrink-0 items-center justify-center rounded-full border",
        compact ? "size-10" : "mx-auto size-16",
      )}
    >
      <span
        className={cn(
          "border-amber/20 absolute inset-0 rounded-full border",
          speaking && "animate-ping",
        )}
      />
      {speaking ? (
        <Volume2 className={compact ? "size-4" : "size-5"} />
      ) : (
        <Mic className={compact ? "size-4" : "size-5"} />
      )}
    </span>
  );
}
