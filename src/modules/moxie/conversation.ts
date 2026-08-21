import { z } from "zod";

export const moxieConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(6_000),
  createdAt: z.string().datetime(),
});
export type MoxieConversationMessage = z.infer<
  typeof moxieConversationMessageSchema
>;

const conversationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  messages: z.array(moxieConversationMessageSchema).max(100),
  updatedAt: z.string().datetime(),
});
export type MoxieConversation = z.infer<typeof conversationSchema>;

const librarySchema = z.object({
  activeId: z.string().min(1),
  conversations: z.array(conversationSchema).max(60),
});
export type MoxieLibrary = z.infer<typeof librarySchema>;

const storageKey = "roleward:moxie-conversation";
const libraryKey = "roleward:moxie-library";
export const moxieConversationUpdatedEvent =
  "roleward:moxie-conversation-updated";

export const emptyMoxieConversation = (): MoxieConversation => ({
  id: crypto.randomUUID(),
  title: "New conversation",
  messages: [],
  updatedAt: new Date().toISOString(),
});

export function emptyMoxieLibrary(): MoxieLibrary {
  const conversation = emptyMoxieConversation();
  return { activeId: conversation.id, conversations: [conversation] };
}

/** Reads the library, migrating a legacy single-conversation record when present. */
export function loadMoxieLibrary(
  storage: Pick<Storage, "getItem">,
): MoxieLibrary {
  try {
    const parsed = librarySchema.safeParse(
      JSON.parse(storage.getItem(libraryKey) ?? "null"),
    );
    if (parsed.success && parsed.data.conversations.length > 0)
      return normalizeMoxieLibrary(parsed.data);
    const legacy = conversationSchema.safeParse(
      JSON.parse(storage.getItem(storageKey) ?? "null"),
    );
    if (legacy.success)
      return { activeId: legacy.data.id, conversations: [legacy.data] };
  } catch {
    /* fall through to a fresh library */
  }
  return emptyMoxieLibrary();
}

export function saveMoxieLibrary(
  storage: Pick<Storage, "setItem">,
  library: MoxieLibrary,
) {
  const normalized = normalizeMoxieLibrary(library);
  storage.setItem(libraryKey, JSON.stringify(normalized));
  // Kept so surfaces reading only the active conversation (the drawer) stay in sync.
  storage.setItem(
    storageKey,
    JSON.stringify(activeMoxieConversation(normalized)),
  );
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(moxieConversationUpdatedEvent));
}

/** Sorts newest first, caps the history, and guarantees the active id exists. */
export function normalizeMoxieLibrary(library: MoxieLibrary): MoxieLibrary {
  const conversations = [...library.conversations]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 60);
  const first = conversations[0];
  if (!first) return emptyMoxieLibrary();
  const activeId = conversations.some((item) => item.id === library.activeId)
    ? library.activeId
    : first.id;
  return { activeId, conversations };
}

export function activeMoxieConversation(
  library: MoxieLibrary,
): MoxieConversation {
  return (
    library.conversations.find((item) => item.id === library.activeId) ??
    library.conversations[0] ??
    emptyMoxieConversation()
  );
}

export function loadMoxieConversation(
  storage: Pick<Storage, "getItem">,
): MoxieConversation {
  return activeMoxieConversation(loadMoxieLibrary(storage));
}

export function saveMoxieConversation(
  storage: Pick<Storage, "setItem" | "getItem">,
  conversation: MoxieConversation,
) {
  saveMoxieLibrary(
    storage,
    upsertMoxieConversation(loadMoxieLibrary(storage), conversation),
  );
}

export function upsertMoxieConversation(
  library: MoxieLibrary,
  conversation: MoxieConversation,
): MoxieLibrary {
  const known = library.conversations.some(
    (item) => item.id === conversation.id,
  );
  return normalizeMoxieLibrary({
    activeId: conversation.id,
    conversations: known
      ? library.conversations.map((item) =>
          item.id === conversation.id ? conversation : item,
        )
      : [conversation, ...library.conversations],
  });
}

export function removeMoxieConversation(
  library: MoxieLibrary,
  id: string,
): MoxieLibrary {
  const conversations = library.conversations.filter((item) => item.id !== id);
  if (conversations.length === 0) return emptyMoxieLibrary();
  return normalizeMoxieLibrary({ activeId: library.activeId, conversations });
}

export function renameMoxieConversation(
  library: MoxieLibrary,
  id: string,
  title: string,
): MoxieLibrary {
  const trimmed = title.trim().slice(0, 120);
  if (!trimmed) return library;
  return normalizeMoxieLibrary({
    ...library,
    conversations: library.conversations.map((item) =>
      item.id === id ? { ...item, title: trimmed } : item,
    ),
  });
}

export function appendMoxieMessage(
  conversation: MoxieConversation,
  message: Omit<MoxieConversationMessage, "createdAt">,
  now = new Date().toISOString(),
): MoxieConversation {
  const messages = [
    ...conversation.messages,
    { ...message, createdAt: now },
  ].slice(-100);
  return {
    ...conversation,
    title:
      conversation.messages.length === 0 && message.role === "user"
        ? message.content.slice(0, 80)
        : conversation.title,
    messages,
    updatedAt: now,
  };
}

const groupOrder = [
  "Today",
  "Yesterday",
  "Previous 7 Days",
  "Previous 30 Days",
  "Older",
] as const;
export type MoxieHistoryGroup = {
  label: (typeof groupOrder)[number];
  conversations: MoxieConversation[];
};

function daysBetween(from: Date, to: Date) {
  const startOf = (date: Date) =>
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((startOf(to) - startOf(from)) / 86_400_000);
}

/** Buckets conversations into the labelled sections the history rail renders. */
export function groupMoxieConversations(
  conversations: MoxieConversation[],
  now = new Date(),
): MoxieHistoryGroup[] {
  const buckets = new Map<string, MoxieConversation[]>();
  for (const conversation of conversations) {
    const age = daysBetween(new Date(conversation.updatedAt), now);
    const label =
      age <= 0
        ? "Today"
        : age === 1
          ? "Yesterday"
          : age <= 7
            ? "Previous 7 Days"
            : age <= 30
              ? "Previous 30 Days"
              : "Older";
    buckets.set(label, [...(buckets.get(label) ?? []), conversation]);
  }
  return groupOrder
    .map((label) => ({ label, conversations: buckets.get(label) ?? [] }))
    .filter((group) => group.conversations.length > 0);
}

export function searchMoxieConversations(
  conversations: MoxieConversation[],
  query: string,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return conversations;
  return conversations.filter(
    (conversation) =>
      conversation.title.toLowerCase().includes(needle) ||
      conversation.messages.some((message) =>
        message.content.toLowerCase().includes(needle),
      ),
  );
}

export function moxieConversationPreview(conversation: MoxieConversation) {
  return conversation.messages[0]?.content ?? "No messages yet";
}

export function formatMoxieTimestamp(iso: string, now = new Date()) {
  const date = new Date(iso);
  const age = daysBetween(date, now);
  if (age <= 0)
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  if (age === 1) return "Yesterday";
  if (age <= 7) return `${age} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
