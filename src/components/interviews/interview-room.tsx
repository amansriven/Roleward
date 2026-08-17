"use client";

import {
  ArrowUp,
  LoaderCircle,
  Mic,
  MicOff,
  Radio,
  Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { INTERVIEW_PLANS } from "@/modules/interviews/plan";
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
        setError(body?.error ?? "Sweet+ could not score this interview.");
        return;
      }
      const summary = summarizeSession(body.session);
      if (summary) saveInterviewSummary(localStorage, summary);
      router.push(`/dashboard/stage-fright/report/${session.id}`);
    } catch {
      setError("Sweet+ could not score this interview.");
    } finally {
      setFinishing(false);
    }
  }, [isVoice, router, session.id]);

  const coding = plan.usesCodeEditor ? session.codingProblem : null;

  return (
    <div
      className={cn(
        "theme-stage mx-auto flex h-[calc(100vh-8rem)] flex-col",
        coding ? "max-w-6xl" : "max-w-3xl",
      )}
    >
      <header className="border-iron/70 flex items-center justify-between gap-4 border-b pb-4">
        <div className="min-w-0">
          <p className="section-label">{plan.label}</p>
          <p className="mt-1 truncate text-sm font-semibold">
            {session.roleLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isVoice && (
            <span
              className={cn(
                "flex items-center gap-1.5 text-[11px]",
                voiceLive ? "text-sage" : "text-dust",
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
            className="border-iron text-canvas hover:text-linen inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold disabled:opacity-50"
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
          "flex min-h-0 flex-1 gap-5",
          coding ? "flex-col lg:flex-row" : "flex-col",
        )}
      >
        {coding && (
          <div className="flex min-h-0 flex-1 py-6">
            <CodePane
              problem={coding}
              busy={thinking}
              onCheckIn={checkInWithCode}
            />
          </div>
        )}
        <div
          className={cn(
            "min-h-0 flex-1 space-y-4 overflow-y-auto py-6",
            coding && "lg:max-w-md",
          )}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                message.role === "candidate" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6",
                  message.role === "candidate"
                    ? "bg-plum/15 border-plum/25 border"
                    : "border-iron bg-workshop/70 border",
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="text-dust flex items-center gap-2 text-xs">
              <LoaderCircle className="size-3 animate-spin" /> Thinking…
            </div>
          )}
          {voiceLive && !messages.length && (
            <p className="text-dust py-10 text-center text-sm">
              The interviewer is about to speak. Answer out loud.
            </p>
          )}
          <div ref={bottom} />
        </div>
      </div>

      {error && <p className="text-kiln pb-3 text-sm">{error}</p>}

      {showTextInput ? (
        <div className="border-iron/70 border-t pt-4">
          {fellBackToText && (
            <p className="text-dust mb-2 text-xs">
              Continuing as a text interview.
            </p>
          )}
          <div className="border-iron bg-workshop/60 flex items-end gap-3 rounded-2xl border p-3">
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  submit();
                }
              }}
              rows={3}
              placeholder="Type your answer…"
              className="flex-1 resize-none bg-transparent text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => submit()}
              disabled={!answer.trim() || thinking}
              aria-label="Send answer"
              className="bg-plum flex size-9 shrink-0 items-center justify-center rounded-lg text-white disabled:opacity-40"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
          <p className="text-dust mt-2 text-[11px]">⌘↵ to send</p>
        </div>
      ) : (
        <div className="border-iron/70 flex items-center justify-center gap-2 border-t pt-6 pb-2">
          <Mic className={cn("size-4", speaking ? "text-dust" : "text-plum")} />
          <p className="text-dust text-xs">
            {speaking
              ? "The interviewer is speaking — you can interrupt."
              : "Listening. Just talk."}
          </p>
        </div>
      )}
    </div>
  );
}
