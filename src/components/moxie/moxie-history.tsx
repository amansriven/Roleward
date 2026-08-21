"use client";

import { Clock, MoreVertical, Pencil, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatMoxieTimestamp,
  groupMoxieConversations,
  moxieConversationPreview,
  searchMoxieConversations,
  type MoxieConversation,
} from "@/modules/moxie/conversation";

interface MoxieHistoryProps {
  conversations: MoxieConversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** Preview text collapses to a single line so every row keeps the same height. */
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

export function MoxieHistory({
  conversations,
  activeId,
  onSelect,
  onRename,
  onDelete,
  onClose,
}: MoxieHistoryProps) {
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState("");
  const [renamingId, setRenamingId] = useState("");
  const [renameDraft, setRenameDraft] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!menuId) return;
    const dismiss = () => setMenuId("");
    window.addEventListener("click", dismiss);
    return () => window.removeEventListener("click", dismiss);
  }, [menuId]);

  const matches = searchMoxieConversations(conversations, query);
  const visible = showAll || query ? matches : matches.slice(0, 8);
  const groups = groupMoxieConversations(visible);
  const hidden = matches.length - visible.length;

  function commitRename(id: string) {
    if (renameDraft.trim()) onRename(id, renameDraft);
    setRenamingId("");
  }

  return (
    <aside className="bg-workshop/60 border-iron/70 flex h-full w-full flex-col border-r backdrop-blur-xl">
      <header className="flex min-h-[72px] shrink-0 items-center gap-2 px-5">
        <h2 className="text-linen text-base font-semibold tracking-[-.02em]">
          Chat History
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide chat history"
          className="text-dust hover:text-linen ml-auto flex size-8 items-center justify-center rounded-lg transition"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="shrink-0 px-4 pb-3">
        <div className="border-iron bg-night/60 focus-within:border-amber/45 flex items-center gap-2 rounded-xl border px-3 transition-colors">
          <Search className="text-dust size-3.5 shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats…"
            aria-label="Search chats"
            className="placeholder:text-dust min-h-10 w-full bg-transparent text-xs outline-none"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {groups.length === 0 ? (
          <p className="text-dust px-1 py-6 text-xs">
            {query ? "No chats match that search." : "No chats yet."}
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="mb-4">
              <h3 className="text-dust px-1 pb-2 text-[10px] font-semibold tracking-wider uppercase">
                {group.label}
              </h3>
              <ul className="space-y-1.5">
                {group.conversations.map((conversation) => {
                  const active = conversation.id === activeId;
                  return (
                    <li key={conversation.id} className="relative">
                      <button
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        className={cn(
                          "w-full rounded-xl border px-3 py-2.5 text-left transition",
                          active
                            ? "border-amber/30 bg-amber/[.08]"
                            : "hover:border-iron hover:bg-linen/[.03] border-transparent",
                        )}
                      >
                        <div className="flex items-baseline gap-2">
                          {renamingId === conversation.id ? (
                            <input
                              autoFocus
                              value={renameDraft}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                setRenameDraft(event.target.value)
                              }
                              onBlur={() => commitRename(conversation.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter")
                                  commitRename(conversation.id);
                                if (event.key === "Escape") setRenamingId("");
                              }}
                              aria-label="Rename chat"
                              className="border-amber/40 text-linen min-w-0 flex-1 rounded border-b bg-transparent text-xs outline-none"
                            />
                          ) : (
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-xs font-medium",
                                active ? "text-linen" : "text-canvas",
                              )}
                            >
                              {conversation.title}
                            </span>
                          )}
                          <span className="text-dust shrink-0 pr-5 text-[10px]">
                            {formatMoxieTimestamp(conversation.updatedAt)}
                          </span>
                        </div>
                        <p className="text-dust mt-1 truncate pr-5 text-[11px]">
                          {oneLine(moxieConversationPreview(conversation))}
                        </p>
                      </button>
                      <button
                        type="button"
                        aria-label={`Options for ${conversation.title}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuId(
                            menuId === conversation.id ? "" : conversation.id,
                          );
                        }}
                        className="text-dust hover:text-linen absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg transition"
                      >
                        <MoreVertical className="size-3.5" />
                      </button>
                      {menuId === conversation.id && (
                        <div className="border-iron bg-raised absolute top-1/2 right-2 z-20 w-36 overflow-hidden rounded-xl border shadow-[0_18px_50px_rgba(0,0,0,.45)]">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setRenameDraft(conversation.title);
                              setRenamingId(conversation.id);
                              setMenuId("");
                            }}
                            className="text-canvas hover:bg-linen/[.05] hover:text-linen flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition"
                          >
                            <Pencil className="size-3.5" /> Rename
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDelete(conversation.id);
                              setMenuId("");
                            }}
                            className="hover:bg-linen/[.05] flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-400 transition"
                          >
                            <Trash2 className="size-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      {hidden > 0 && (
        <div className="border-iron/70 shrink-0 border-t p-4">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="border-iron text-canvas hover:border-canvas/40 hover:text-linen flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border text-xs transition"
          >
            <Clock className="size-3.5" /> View all history
          </button>
        </div>
      )}
    </aside>
  );
}
