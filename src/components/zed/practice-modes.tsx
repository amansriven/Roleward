"use client";

import { ArrowUpRight, Bot, Link2, LoaderCircle, Send, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { PracticeFlow, type ArchetypeOption, type RecommendationView } from "./practice-flow";

type Mode = "zed" | "leetcode";
type ImportedProblem = {
  url: string;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
};
type Message = { role: "assistant" | "user"; content: string };

export function PracticeModes(props: {
  archetypes: ArchetypeOption[];
  skillLabels: Record<string, string>;
  recommendation: RecommendationView | null;
}) {
  const [mode, setMode] = useState<Mode>("zed");
  return (
    <div>
      <div className="border-iron mb-6 flex gap-1 border-b" aria-label="Practice mode">
        <ModeButton active={mode === "zed"} onClick={() => setMode("zed")}>
          Zed problem
        </ModeButton>
        <ModeButton active={mode === "leetcode"} onClick={() => setMode("leetcode")}>
          LeetCode companion
        </ModeButton>
      </div>
      {mode === "zed" ? <PracticeFlow {...props} /> : <LeetCodeCompanion />}
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-4 pb-3 text-xs font-semibold transition",
        active ? "text-linen after:bg-amber after:absolute after:inset-x-0 after:bottom-[-1px] after:h-px" : "text-dust hover:text-canvas",
      )}
    >
      {children}
    </button>
  );
}

function LeetCodeCompanion() {
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
    const body = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
    if (!response.ok || !body?.message) throw new Error(body?.error ?? "Zed could not start the walkthrough.");
    setMessages([...nextMessages, { role: "assistant", content: body.message }]);
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
      const body = (await response.json().catch(() => null)) as { problem?: ImportedProblem; error?: string } | null;
      if (!response.ok || !body?.problem) throw new Error(body?.error ?? "Zed could not import that problem.");
      setProblem(body.problem);
      setUrl(body.problem.url);
      setMessages([]);
      await coach([], body.problem.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Zed could not import that problem.");
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
      setError(cause instanceof Error ? cause.message : "Zed could not continue the walkthrough.");
    } finally {
      setBusy(false);
    }
  }

  if (!problem)
    return (
      <div className="border-iron/80 border-y py-7">
        <div className="text-amber flex items-center gap-2">
          <Link2 className="size-3.5" />
          <p className="font-mono text-[10px] tracking-wide uppercase">Bring your own problem</p>
        </div>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-.035em]">Work through a LeetCode problem with Zed</h3>
        <p className="text-canvas mt-2 max-w-2xl text-sm leading-6">
          Paste the problem link. Zed reads it privately, then guides your reasoning one checkpoint at a time while you code and run tests on LeetCode.
        </p>
        <div className="mt-6 flex max-w-2xl flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void importProblem(); }}
            placeholder="https://leetcode.com/problems/two-sum/"
            className="border-iron bg-raised text-linen placeholder:text-dust min-h-11 flex-1 rounded-xl border px-3 text-xs outline-none focus:border-amber/50"
          />
          <button type="button" onClick={() => void importProblem()} disabled={busy || !url.trim()} className="bg-amber text-night inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-xs font-semibold disabled:opacity-40">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {busy ? "Reading…" : "Start walkthrough"}
          </button>
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        <p className="text-dust mt-4 text-[11px]">The statement stays on LeetCode. Companion sessions do not use Roleward’s judge or affect mastery scores.</p>
      </div>
    );

  return (
    <div className="border-iron/80 border-y py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-amber font-mono text-[10px] uppercase">LeetCode companion · {problem.difficulty}</p>
          <h3 className="mt-2 text-xl font-semibold">{problem.title}</h3>
          <p className="text-dust mt-2 text-[11px]">{problem.topics.join(" · ") || "Discover the pattern as you work"}</p>
        </div>
        <a href={problem.url} target="_blank" rel="noreferrer" className="border-iron text-canvas hover:text-linen inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-xs font-semibold">
          Open problem <ArrowUpRight className="size-3.5" />
        </a>
      </div>
      <div className="mt-6 space-y-3" aria-live="polite">
        {messages.map((message, index) => (
          <div key={index} className={cn("max-w-[90%] rounded-xl border p-4 text-sm leading-6", message.role === "assistant" ? "border-iron bg-raised text-canvas" : "border-amber/25 bg-amber/5 text-linen ml-auto")}>
            {message.role === "assistant" && <Bot className="text-amber mb-2 size-4" />}
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="mt-5 flex gap-2">
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Explain what you’re thinking or ask for a hint…" rows={2} className="border-iron bg-raised text-linen placeholder:text-dust min-h-14 flex-1 resize-none rounded-xl border px-3 py-2.5 text-xs outline-none focus:border-amber/50" />
        <button type="submit" disabled={busy || !draft.trim()} aria-label="Send to Zed" className="bg-amber text-night flex w-12 items-center justify-center rounded-xl disabled:opacity-40">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      <button type="button" onClick={() => { setProblem(null); setMessages([]); setError(""); }} className="text-dust hover:text-canvas mt-4 text-[11px] font-semibold">Choose another problem</button>
    </div>
  );
}
