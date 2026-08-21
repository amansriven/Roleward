"use client";

import {
  ArrowUp,
  Check,
  Copy,
  Database,
  Globe,
  LoaderCircle,
  MessageSquarePlus,
  Paperclip,
  PanelLeft,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MoxieHistory } from "@/components/moxie/moxie-history";
import { MoxieResponse } from "@/components/moxie/moxie-response";
import {
  activeMoxieConversation,
  appendMoxieMessage,
  emptyMoxieConversation,
  loadMoxieLibrary,
  removeMoxieConversation,
  renameMoxieConversation,
  saveMoxieLibrary,
  upsertMoxieConversation,
  type MoxieLibrary,
} from "@/modules/moxie/conversation";
import { loadWorkspace } from "@/modules/workspace/repository";

const starters = [
  "What should I focus on this week?",
  "Where is my biggest readiness gap?",
  "Review my active resume for my target role.",
  "Build a plan from my recent practice.",
];
const contextSources = [
  "Applications",
  "Evidence",
  "Resumes",
  "Zed",
  "Interviews",
];

const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

export function MoxieWorkspace() {
  const [library, setLibrary] = useState<MoxieLibrary | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedAt, setCopiedAt] = useState("");
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setLibrary(loadMoxieLibrary(localStorage));
      // The rail docks beside the chat from md up; below that it would cover it.
      setHistoryOpen(window.innerWidth >= 768);
    });
  }, []);
  useEffect(
    () => bottom.current?.scrollIntoView({ behavior: "smooth" }),
    [library, busy],
  );

  function persist(next: MoxieLibrary) {
    setLibrary(next);
    saveMoxieLibrary(localStorage, next);
  }
  function startNew() {
    if (!library) return;
    persist(upsertMoxieConversation(library, emptyMoxieConversation()));
    setError("");
  }
  async function copyMessage(key: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedAt(key);
      setTimeout(() => setCopiedAt(""), 1_500);
    } catch {
      setError("Could not copy that response.");
    }
  }

  async function send(prompt?: string) {
    const message = (prompt ?? draft).trim();
    if (!message || busy || !library) return;
    const before = activeMoxieConversation(library);
    const withUser = appendMoxieMessage(before, {
      role: "user",
      content: message,
    });
    persist(upsertMoxieConversation(library, withUser));
    setDraft("");
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/moxie", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          pathname: "/dashboard/moxie",
          workspace: loadWorkspace(localStorage),
          history: before.messages
            .slice(-10)
            .map(({ role, content }) => ({ role, content })),
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
      persist(
        upsertMoxieConversation(
          library,
          appendMoxieMessage(withUser, {
            role: "assistant",
            content: body.message,
          }),
        ),
      );
    } catch {
      setError("Moxie could not reach the assistant service.");
    } finally {
      setBusy(false);
    }
  }

  if (!library)
    return (
      <div className="text-dust flex h-full items-center justify-center text-sm">
        Opening Moxie…
      </div>
    );

  const conversation = activeMoxieConversation(library);
  const empty = conversation.messages.length === 0;

  return (
    <div className="bg-night relative flex h-full min-h-0 overflow-hidden">
      {/* Desktop rail: collapses to zero width, overlays the chat on small screens. */}
      <div
        className={cn(
          "z-30 h-full shrink-0 overflow-hidden transition-[width] duration-300 max-md:absolute max-md:inset-y-0 max-md:left-0",
          historyOpen ? "w-[17.5rem] max-md:w-[85vw] xl:w-[19rem]" : "w-0",
        )}
      >
        {historyOpen && (
          <MoxieHistory
            conversations={library.conversations}
            activeId={library.activeId}
            onSelect={(id) => {
              persist({ ...library, activeId: id });
              if (window.innerWidth < 768) setHistoryOpen(false);
            }}
            onRename={(id, title) =>
              persist(renameMoxieConversation(library, id, title))
            }
            onDelete={(id) => persist(removeMoxieConversation(library, id))}
            onClose={() => setHistoryOpen(false)}
          />
        )}
      </div>
      {historyOpen && (
        <button
          type="button"
          aria-label="Close chat history"
          onClick={() => setHistoryOpen(false)}
          className="bg-night/60 absolute inset-0 z-20 md:hidden"
        />
      )}

      <section className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="bg-amber/[.055] absolute -top-40 left-[18%] size-[34rem] rounded-full blur-[140px]" />
          <div className="bg-sage/[.035] absolute right-[4%] bottom-0 size-[28rem] rounded-full blur-[130px]" />
        </div>

        <header className="border-iron/70 bg-night/75 relative z-10 flex min-h-[72px] shrink-0 items-center gap-3 border-b px-4 backdrop-blur-xl sm:px-6">
          {!historyOpen && (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="Show chat history"
              className="border-iron text-canvas hover:border-canvas/40 hover:text-linen flex size-9 shrink-0 items-center justify-center rounded-xl border transition"
            >
              <PanelLeft className="size-4" />
            </button>
          )}
          <Image
            src="/assistant/moxie-avatar-v1.png"
            alt="Moxie"
            width={48}
            height={48}
            className="size-11 rounded-2xl object-cover ring-1 ring-white/10"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-semibold tracking-[-.02em]">
                {empty ? "Moxie" : conversation.title}
              </h1>
              <span className="border-sage/25 bg-sage/[.07] text-sage hidden rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase sm:inline">
                Workspace aware
              </span>
            </div>
            <p className="text-dust truncate text-[11px]">
              Your career operating partner
            </p>
          </div>
          <div className="text-dust ml-auto hidden items-center gap-4 text-[10px] xl:flex">
            <span className="flex items-center gap-1.5">
              <Database className="text-sage size-3" /> 5 grounded sources
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="text-sage size-3" /> Read only
            </span>
          </div>
          <button
            type="button"
            onClick={startNew}
            aria-label="New chat"
            className="border-iron text-canvas hover:border-canvas/40 hover:text-linen ml-auto flex min-h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs transition xl:ml-0"
          >
            <MessageSquarePlus className="size-3.5" />
            <span className="hidden sm:inline">New chat</span>
          </button>
        </header>

        <div className="border-iron/50 relative z-10 flex shrink-0 scrollbar-none items-center gap-2 overflow-x-auto border-b px-4 py-2.5 sm:px-6">
          <span className="text-dust mr-1 shrink-0 font-mono text-[9px] tracking-wider uppercase">
            Moxie can see
          </span>
          {contextSources.map((source) => (
            <span
              key={source}
              className="border-iron/80 bg-raised/60 text-canvas shrink-0 rounded-full border px-2.5 py-1 text-[9px]"
            >
              {source}
            </span>
          ))}
        </div>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto">
          {empty ? (
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center px-5 py-12 sm:px-10">
              <div className="max-w-2xl">
                <div className="text-amber flex items-center gap-2">
                  <Sparkles className="size-4" />
                  <span className="font-mono text-[10px] tracking-[.14em] uppercase">
                    Grounded in your work
                  </span>
                </div>
                <h2 className="mt-5 text-4xl leading-[1.04] font-semibold tracking-[-.06em] sm:text-5xl">
                  Make the next move count.
                </h2>
                <p className="text-canvas mt-5 max-w-xl text-base leading-7">
                  Think through a decision, connect patterns across your search,
                  or turn recent practice into a focused plan.
                </p>
              </div>
              <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
                {starters.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => void send(item)}
                    className="border-iron/80 bg-linen/[.02] hover:border-canvas/40 hover:bg-linen/[.045] group rounded-2xl border p-5 text-left transition"
                  >
                    <span className="text-dust font-mono text-[9px]">
                      0{index + 1}
                    </span>
                    <span className="text-canvas group-hover:text-linen mt-3 block text-sm leading-6">
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-8 px-5 py-10 sm:px-8 sm:py-12">
              {conversation.messages.map((message, index) => {
                const key = `${message.createdAt}-${index}`;
                if (message.role === "user")
                  return (
                    <article key={key} className="ml-auto max-w-[80%]">
                      <div className="flex items-start gap-3">
                        <div className="bg-amber/10 border-amber/20 text-linen min-w-0 rounded-2xl border px-4 py-3 text-sm leading-6 whitespace-pre-wrap sm:px-5">
                          {message.content}
                        </div>
                        <span className="bg-amber/15 text-amber mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                          You
                        </span>
                      </div>
                      <p className="text-dust mt-1.5 pr-11 text-right text-[10px]">
                        {clockTime(message.createdAt)}
                      </p>
                    </article>
                  );
                return (
                  <article key={key} className="flex max-w-[46rem] gap-3">
                    <Image
                      src="/assistant/moxie-avatar-v1.png"
                      alt=""
                      width={32}
                      height={32}
                      className="mt-0.5 size-8 shrink-0 rounded-lg object-cover"
                    />
                    <div className="border-iron/70 bg-raised/50 min-w-0 flex-1 rounded-2xl border px-4 py-3.5 sm:px-5">
                      <MoxieResponse content={message.content} />
                      <div className="border-iron/50 mt-3 flex items-center gap-1 border-t pt-2.5">
                        <button
                          type="button"
                          aria-label="Copy response"
                          onClick={() => void copyMessage(key, message.content)}
                          className="text-dust hover:text-linen flex size-7 items-center justify-center rounded-lg transition"
                        >
                          {copiedAt === key ? (
                            <Check className="text-sage size-3.5" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label="Helpful"
                          aria-pressed={feedback[key] === "up"}
                          onClick={() =>
                            setFeedback((prev) => ({ ...prev, [key]: "up" }))
                          }
                          className={cn(
                            "flex size-7 items-center justify-center rounded-lg transition",
                            feedback[key] === "up"
                              ? "text-sage"
                              : "text-dust hover:text-linen",
                          )}
                        >
                          <ThumbsUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Not helpful"
                          aria-pressed={feedback[key] === "down"}
                          onClick={() =>
                            setFeedback((prev) => ({ ...prev, [key]: "down" }))
                          }
                          className={cn(
                            "flex size-7 items-center justify-center rounded-lg transition",
                            feedback[key] === "down"
                              ? "text-amber"
                              : "text-dust hover:text-linen",
                          )}
                        >
                          <ThumbsDown className="size-3.5" />
                        </button>
                        <span className="text-dust ml-auto text-[10px]">
                          {clockTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
              {busy && (
                <p className="text-dust flex items-center gap-2 text-xs">
                  <LoaderCircle className="size-3.5 animate-spin" /> Moxie is
                  connecting the dots…
                </p>
              )}
              {error && (
                <p role="alert" className="text-xs text-red-400">
                  {error}
                </p>
              )}
              <div ref={bottom} />
            </div>
          )}
        </div>

        <footer className="from-night via-night relative z-10 shrink-0 bg-gradient-to-t to-transparent px-4 pt-3 pb-4 sm:px-8 sm:pb-6">
          <div className="border-iron bg-workshop/95 focus-within:border-amber/45 mx-auto max-w-3xl rounded-2xl border p-2 pl-4 shadow-[0_18px_60px_rgba(0,0,0,.28)] backdrop-blur-xl transition-colors sm:pl-5">
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
              placeholder="Ask Moxie about your career workspace…"
              className="placeholder:text-dust min-h-12 w-full resize-none bg-transparent pt-2 text-sm outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="text-dust flex items-center gap-1">
                <span
                  title="Attachments arrive with workspace uploads"
                  className="flex size-7 items-center justify-center rounded-lg opacity-45"
                >
                  <Paperclip className="size-3.5" />
                </span>
                <span
                  title="Moxie answers from your workspace only"
                  className="flex size-7 items-center justify-center rounded-lg opacity-45"
                >
                  <Globe className="size-3.5" />
                </span>
                <span className="ml-1 hidden truncate text-[9px] sm:inline">
                  Grounded answers · Read-only access
                </span>
              </div>
              <button
                type="button"
                onClick={() => void send()}
                disabled={!draft.trim() || busy}
                aria-label="Send message"
                className="bg-amber text-night flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform hover:scale-[1.03] disabled:opacity-35"
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
          </div>
          <p className="text-dust mt-2 text-center text-[10px]">
            Moxie can make mistakes. Verify important details in your workspace.
          </p>
        </footer>
      </section>
    </div>
  );
}
