"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MoxieGoalsSection } from "@/components/moxie/moxie-goals-panel";
import { MoxieMemorySection } from "@/components/moxie/moxie-memory-panel";

const tabs = [
  { id: "goals", label: "Goals" },
  { id: "memory", label: "Memory" },
] as const;
type TabId = (typeof tabs)[number]["id"];

/** Right rail holding the two things Moxie keeps for the user. */
export function MoxieInspector({
  onClose,
  reloadKey = 0,
}: {
  onClose: () => void;
  reloadKey?: number;
}) {
  const [tab, setTab] = useState<TabId>("goals");

  return (
    <aside className="bg-workshop/60 border-iron/70 flex h-full w-full flex-col border-l backdrop-blur-xl">
      <header className="flex min-h-[72px] shrink-0 items-center gap-1 px-4">
        <div className="border-iron/80 bg-night/40 flex gap-0.5 rounded-xl border p-0.5">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={cn(
                "min-h-8 rounded-lg px-3 text-xs font-medium transition",
                tab === item.id
                  ? "bg-linen/[.07] text-linen"
                  : "text-dust hover:text-canvas",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide goals and memory"
          className="text-dust hover:text-linen ml-auto flex size-8 items-center justify-center rounded-lg transition"
        >
          <X className="size-4" />
        </button>
      </header>

      {tab === "goals" ? (
        <MoxieGoalsSection reloadKey={reloadKey} />
      ) : (
        <MoxieMemorySection reloadKey={reloadKey} />
      )}
    </aside>
  );
}
