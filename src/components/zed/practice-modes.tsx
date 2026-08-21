"use client";

import {
  ArrowUpRight,
  Bot,
  Link2,
  LoaderCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";

type ImportedProblem = {
  url: string;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
};
type Message = { role: "assistant" | "user"; content: string };

export function LeetCodeCompanion() {
  const [url, setUrl] = useState("");
  const [problem, setProblem] = useState<ImportedProblem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function coach(nextMessages: Message[], sourceUrl = url) {
    const response = await fetch("/api/zed/leetcode/coach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: sourceUrl, messages: nextMessages }),
    });
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      error?: string;
    } | null;
    if (!response.ok || !body?.message)
      throw new Error(body?.error ?? "Zed could not start the walkthrough.");
    setMessages([
      ...nextMessages,
      { role: "assistant", content: body.message },
    ]);
  }

  async function importProblem() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/zed/leetcode/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = (await response.json().catch(() => null)) as {
        problem?: ImportedProblem;
        error?: string;
      } | null;
      if (!response.ok || !body?.problem)
        throw new Error(body?.error ?? "Zed could not import that problem.");
      setProblem(body.problem);
      setUrl(body.problem.url);
      setMessages([]);
      await coach([], body.problem.url);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Zed could not import that problem.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setError("");
    try {
      await coach(next);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Zed could not continue the walkthrough.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!problem)
    return (
      <div className="border-iron/80 min-h-[55vh] border-y py-10 sm:py-14">
        <div className="text-amber flex items-center gap-2">
          <Link2 className="size-3.5" />
          <p className="font-mono text-[10px] tracking-wide uppercase">
            Bring your own problem
          </p>
        </div>
        <h3 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
          Work through a LeetCode problem with Zed
        </h3>
        <p className="text-canvas mt-3 max-w-3xl text-sm leading-6 sm:text-base sm:leading-7">
          Paste the problem link. Zed reads it privately, then guides your
          reasoning one checkpoint at a time while you code and run tests on
          LeetCode.
        </p>
        <div className="mt-8 flex max-w-4xl flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void importProblem();
            }}
            placeholder="https://leetcode.com/problems/two-sum/"
            className="border-iron bg-raised text-linen placeholder:text-dust focus:border-amber/50 min-h-14 flex-1 rounded-xl border px-4 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void importProblem()}
            disabled={busy || !url.trim()}
            className="bg-amber text-night inline-flex min-h-14 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold disabled:opacity-40"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {busy ? "Reading…" : "Start walkthrough"}
          </button>
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        <p className="text-dust mt-4 text-[11px]">
          The statement stays on LeetCode. Companion sessions do not use
          Roleward’s judge or affect mastery scores.
        </p>
      </div>
    );

  return (
    <div className="border-iron/80 flex min-h-[65vh] flex-col border-y py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-amber font-mono text-[10px] uppercase">
            LeetCode companion · {problem.difficulty}
          </p>
          <h3 className="mt-2 text-2xl font-semibold sm:text-3xl">
            {problem.title}
          </h3>
          <p className="text-dust mt-2 text-[11px]">
            {problem.topics.join(" · ") || "Discover the pattern as you work"}
          </p>
        </div>
        <a
          href={problem.url}
          target="_blank"
          rel="noreferrer"
          className="border-iron text-canvas hover:text-linen inline-flex min-h-12 items-center gap-2 rounded-xl border px-5 text-sm font-semibold"
        >
          Open problem <ArrowUpRight className="size-3.5" />
        </a>
      </div>
      <div className="mt-8 flex-1 space-y-4" aria-live="polite">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "max-w-[88%] rounded-2xl border p-5 text-sm leading-7 sm:p-6 sm:text-base",
              message.role === "assistant"
                ? "border-iron bg-raised text-canvas"
                : "border-amber/25 bg-amber/5 text-linen ml-auto",
            )}
          >
            {message.role === "assistant" && (
              <Bot className="text-amber mb-2 size-4" />
            )}
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="mt-8 flex gap-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Explain what you’re thinking or ask for a hint…"
          rows={3}
          className="border-iron bg-raised text-linen placeholder:text-dust focus:border-amber/50 min-h-20 flex-1 resize-none rounded-2xl border px-4 py-3 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          aria-label="Send to Zed"
          className="bg-amber text-night flex w-16 items-center justify-center rounded-2xl disabled:opacity-40 sm:w-20"
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </button>
      </form>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={() => {
          setProblem(null);
          setMessages([]);
          setError("");
        }}
        className="text-dust hover:text-canvas mt-4 text-[11px] font-semibold"
      >
        Choose another problem
      </button>
    </div>
  );
}
