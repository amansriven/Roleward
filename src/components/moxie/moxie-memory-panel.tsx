"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  activeMoxieMemories,
  moxieMemoryCategories,
  moxieMemoryCategoryLabels,
  type MoxieMemory,
  type MoxieMemoryCategory,
} from "@/modules/moxie/memory";

export function MoxieMemorySection({ reloadKey = 0 }: { reloadKey?: number }) {
  const [memories, setMemories] = useState<MoxieMemory[] | null>(null);
  const [statement, setStatement] = useState("");
  const [category, setCategory] = useState<MoxieMemoryCategory>("preference");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/moxie/memory");
        const body = (await response.json().catch(() => null)) as {
          memories?: MoxieMemory[];
          error?: string;
        } | null;
        if (cancelled) return;
        if (!response.ok || !body?.memories) {
          setError(body?.error ?? "Moxie could not read your memory.");
          setMemories([]);
          return;
        }
        setMemories(body.memories);
      } catch {
        if (!cancelled) {
          setError("Moxie could not reach your memory.");
          setMemories([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function save() {
    const trimmed = statement.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/moxie/memory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ statement: trimmed, category }),
      });
      const body = (await response.json().catch(() => null)) as {
        memory?: MoxieMemory;
        error?: string;
      } | null;
      if (!response.ok || !body?.memory) {
        setError(body?.error ?? "Moxie could not save that memory.");
        return;
      }
      setMemories((current) => [
        ...(current ?? []),
        body.memory as MoxieMemory,
      ]);
      setStatement("");
    } catch {
      setError("Moxie could not reach your memory.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError("");
    const previous = memories;
    setMemories((current) => (current ?? []).filter((item) => item.id !== id));
    try {
      const response = await fetch("/api/moxie/memory", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        setMemories(previous);
        setError("Moxie could not remove that memory.");
      }
    } catch {
      setMemories(previous);
      setError("Moxie could not reach your memory.");
    }
  }

  const active = activeMoxieMemories(memories ?? []);

  return (
    <>
      <p className="text-dust shrink-0 px-5 pb-3 text-[11px] leading-5">
        Moxie only remembers what you approve here, and uses it in every
        conversation.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {memories === null ? (
          <p className="text-dust flex items-center gap-2 px-1 py-6 text-xs">
            <LoaderCircle className="size-3.5 animate-spin" /> Loading memory…
          </p>
        ) : active.length === 0 ? (
          <p className="text-dust px-1 py-6 text-xs leading-5">
            Nothing saved yet. Add a preference, constraint, target, or piece of
            background Moxie should carry forward.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {active.map((memory) => (
              <li
                key={memory.id}
                className="border-iron/80 bg-linen/[.02] group flex items-start gap-2 rounded-xl border px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <span className="border-sage/25 bg-sage/[.07] text-sage inline-block rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase">
                    {moxieMemoryCategoryLabels[memory.category]}
                  </span>
                  <p className="text-canvas mt-1.5 text-xs leading-5">
                    {memory.statement}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(memory.id)}
                  aria-label={`Forget: ${memory.statement}`}
                  className="text-dust shrink-0 rounded-lg p-1 transition hover:text-red-400"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="mt-3 px-1 text-[11px] text-red-400">
            {error}
          </p>
        )}
      </div>

      <div className="border-iron/70 shrink-0 space-y-2 border-t p-4">
        <div className="flex flex-wrap gap-1">
          {moxieMemoryCategories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] transition",
                category === item
                  ? "border-amber/40 bg-amber/10 text-amber"
                  : "border-iron text-dust hover:text-linen",
              )}
            >
              {moxieMemoryCategoryLabels[item]}
            </button>
          ))}
        </div>
        <textarea
          value={statement}
          onChange={(event) => setStatement(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void save();
            }
          }}
          rows={2}
          maxLength={400}
          placeholder="Something Moxie should remember…"
          aria-label="New memory"
          className="border-iron bg-night/60 placeholder:text-dust focus:border-amber/45 w-full resize-none rounded-xl border px-3 py-2 text-xs transition-colors outline-none"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={!statement.trim() || busy}
          className="bg-amber text-night flex min-h-9 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold transition disabled:opacity-35"
        >
          {busy ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Save to memory
        </button>
      </div>
    </>
  );
}
