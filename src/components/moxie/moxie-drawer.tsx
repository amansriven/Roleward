"use client";

import { ArrowUp, LoaderCircle, Maximize2, Sparkles, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MoxieResponse } from "@/components/moxie/moxie-response";
import { loadWorkspace } from "@/modules/workspace/repository";
import { moxieHistoryText } from "@/modules/moxie/contract";
import {
  appendMoxieMessage,
  loadMoxieConversation,
  moxieConversationUpdatedEvent,
  saveMoxieConversation,
} from "@/modules/moxie/conversation";

interface Message {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

function suggestions(pathname: string) {
  if (pathname.startsWith("/dashboard/applications"))
    return [
      "What is my biggest preparation gap?",
      "Help me plan for my active application.",
      "Which requirements need stronger evidence?",
    ];
  if (pathname.startsWith("/dashboard/evidence"))
    return [
      "Which evidence is strongest for my target role?",
      "What important evidence am I missing?",
      "Help me turn an experience into a STAR story.",
    ];
  if (pathname.startsWith("/dashboard/resume-kitchen"))
    return [
      "Review my active resume version.",
      "Which bullets should I tailor first?",
      "Does my resume support my target role?",
    ];
  if (pathname.startsWith("/dashboard/zed"))
    return [
      "What coding patterns should I focus on?",
      "Explain my recent practice mistakes.",
      "Build me a technical practice plan.",
    ];
  if (pathname.startsWith("/dashboard/stage-fright"))
    return [
      "How can I improve my interview delivery?",
      "What competency should I rehearse next?",
      "Summarize my interview pattern.",
    ];
  return [
    "What should I focus on next?",
    "Build me a plan for this week.",
    "What does my workspace say about my readiness?",
  ];
}

export function MoxieDrawer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => {
      const conversation = loadMoxieConversation(localStorage);
      setConversationId(conversation.id);
      setMessages(
        conversation.messages.map(({ role, content, createdAt }) => ({
          role,
          content,
          createdAt,
        })),
      );
    };
    queueMicrotask(refresh);
    window.addEventListener(moxieConversationUpdatedEvent, refresh);
    return () =>
      window.removeEventListener(moxieConversationUpdatedEvent, refresh);
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  async function send(prompt?: string) {
    const message = (prompt ?? draft).trim();
    if (!message || busy) return;
    setDraft("");
    setError("");
    const userMessages = [
      ...messages,
      { role: "user" as const, content: message },
    ];
    setMessages(userMessages);
    const current = loadMoxieConversation(localStorage);
    saveMoxieConversation(
      localStorage,
      appendMoxieMessage(current, { role: "user", content: message }),
    );
    setBusy(true);
    try {
      const workspace = loadWorkspace(localStorage);
      const response = await fetch("/api/moxie", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          pathname,
          workspace,
          history: messages.slice(-10).map(({ role, content }) => ({
            role,
            content: moxieHistoryText(content),
          })),
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.message) {
        setError(body?.error ?? "Moxie could not respond.");
        return;
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", content: body.message! },
      ]);
      saveMoxieConversation(
        localStorage,
        appendMoxieMessage(loadMoxieConversation(localStorage), {
          role: "assistant",
          content: body.message,
        }),
      );
    } catch {
      setError("Moxie could not reach the assistant service.");
    } finally {
      setBusy(false);
    }
  }

  const chips = [
    pathname.includes("applications") ? "Applications" : null,
    pathname.includes("resume-kitchen") ? "Resume Kitchen" : null,
    pathname.includes("evidence") ? "Evidence" : null,
    pathname.includes("zed") ? "Zed" : null,
    pathname.includes("stage-fright") ? "Stage Fright" : null,
  ].filter(Boolean) as string[];

  if (pathname.startsWith("/dashboard/moxie")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Moxie"
        className={cn(
          "fixed top-3 right-3 z-40 flex items-center gap-3 rounded-2xl border p-2 pr-4 shadow-[0_18px_60px_rgba(0,0,0,.4)] backdrop-blur-xl transition-all hover:-translate-y-0.5 lg:top-5 lg:right-6",
          open
            ? "pointer-events-none translate-y-2 opacity-0"
            : "border-amber/25 bg-workshop/95 opacity-100",
        )}
      >
        <span className="relative">
          <Image
            src="/assistant/moxie-avatar-v1.png"
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-xl object-cover"
          />
          <span className="border-workshop bg-sage absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2" />
        </span>
        <span className="text-left">
          <span className="block text-xs font-semibold">Ask Moxie</span>
          <span className="text-dust block text-[10px]">
            Your career copilot
          </span>
        </span>
      </button>

      {open && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close Moxie"
            onClick={() => setOpen(false)}
            className="pointer-events-auto absolute inset-0 bg-black/55 backdrop-blur-[2px] sm:hidden"
          />
          <aside
            role="dialog"
            aria-label="Moxie assistant"
            className="bg-night border-iron pointer-events-auto absolute inset-y-0 right-0 flex w-full flex-col border-l shadow-[-24px_0_70px_rgba(0,0,0,.35)] sm:w-[460px]"
          >
            <header className="border-iron/70 flex min-h-20 items-center gap-3 border-b px-5">
              <Image
                src="/assistant/moxie-avatar-v1.png"
                alt="Moxie"
                width={48}
                height={48}
                className="size-12 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">Moxie</h2>
                  <span className="border-sage/25 bg-sage/[.07] text-sage rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase">
                    Read only
                  </span>
                </div>
                <p className="text-dust mt-1 text-[11px]">
                  Career operating partner
                </p>
              </div>
              <Link
                href="/dashboard/moxie"
                onClick={() => setOpen(false)}
                title="Open full workspace"
                className="text-dust hover:text-linen flex size-9 items-center justify-center rounded-lg"
              >
                <Maximize2 className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-dust hover:text-linen flex size-9 items-center justify-center rounded-lg"
              >
                <X className="size-4" />
              </button>
            </header>

            {chips.length > 0 && (
              <div className="border-iron/60 flex scrollbar-none gap-2 overflow-x-auto border-b px-5 py-3">
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="border-iron bg-raised text-canvas shrink-0 rounded-full border px-2.5 py-1 text-[10px]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              {messages.length === 0 ? (
                <div>
                  <div className="max-w-sm">
                    <div className="text-amber flex items-center gap-2">
                      <Sparkles className="size-4" />
                      <span className="font-mono text-[10px] tracking-wide uppercase">
                        Start with context
                      </span>
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-[-.04em]">
                      What are we working through?
                    </h3>
                    <p className="text-canvas mt-3 text-sm leading-6">
                      I can read your Roleward workspace, connect the signals,
                      and help you decide what to do next.
                    </p>
                  </div>
                  <div className="mt-8 space-y-2">
                    {suggestions(pathname).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => void send(item)}
                        className="border-iron hover:border-canvas/40 hover:bg-linen/[.025] text-canvas flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-xs transition"
                      >
                        <span>{item}</span>
                        <ArrowUp className="text-dust size-3.5 rotate-45" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <article
                      key={index}
                      className={message.role === "user" ? "ml-10" : "mr-3"}
                    >
                      {message.role === "assistant" && (
                        <div className="mb-2 flex items-center gap-2">
                          <Image
                            src="/assistant/moxie-avatar-v1.png"
                            alt=""
                            width={24}
                            height={24}
                            className="size-6 rounded-lg"
                          />
                          <span className="text-dust text-[10px] font-semibold uppercase">
                            Moxie
                          </span>
                        </div>
                      )}
                      {message.role === "user" ? (
                        <div className="bg-amber/10 border-amber/20 text-linen rounded-2xl border px-4 py-3 text-sm leading-6 whitespace-pre-wrap">
                          {message.content}
                        </div>
                      ) : (
                        <MoxieResponse
                          content={message.content}
                          sourceMessageId={message.createdAt}
                          conversationId={conversationId}
                          onRevise={(draft) =>
                            setDraft(
                              `Revise this ${draft.label.toLowerCase()}: "${draft.text}"\n\nWhat I want changed: `,
                            )
                          }
                        />
                      )}
                    </article>
                  ))}
                  {busy && (
                    <div className="text-dust flex items-center gap-2 text-xs">
                      <LoaderCircle className="size-3.5 animate-spin" /> Moxie
                      is connecting the dots…
                    </div>
                  )}
                  {error && (
                    <p role="alert" className="text-xs text-red-400">
                      {error}
                    </p>
                  )}
                </div>
              )}
              <div ref={bottom} />
            </div>

            <footer className="border-iron/70 bg-workshop/55 border-t p-4">
              <div className="border-iron bg-night focus-within:border-amber/50 rounded-2xl border p-2 pl-4">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                  rows={2}
                  placeholder="Ask about your search, resume, practice…"
                  className="text-linen placeholder:text-dust max-h-32 min-h-12 w-full resize-none bg-transparent pt-2 text-sm outline-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-dust text-[9px]">
                    Moxie cites workspace sources
                  </span>
                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={!draft.trim() || busy}
                    className="bg-amber text-night flex size-9 items-center justify-center rounded-xl disabled:opacity-35"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                </div>
              </div>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
