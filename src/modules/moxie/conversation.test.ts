import { describe, expect, it } from "vitest";
import {
  appendMoxieMessage,
  groupMoxieConversations,
  removeMoxieConversation,
  searchMoxieConversations,
  upsertMoxieConversation,
  type MoxieConversation,
} from "./conversation";

const conversation = (
  id: string,
  updatedAt: string,
  title = id,
  content = "hello",
): MoxieConversation => ({
  id,
  title,
  messages: [{ role: "user", content, createdAt: updatedAt }],
  updatedAt,
});

describe("Moxie conversations", () => {
  it("names a new conversation from its first question", () => {
    const next = appendMoxieMessage(
      {
        id: "one",
        title: "New conversation",
        messages: [],
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      { role: "user", content: "Help me prepare for Stripe" },
      "2026-01-02T00:00:00.000Z",
    );
    expect(next.title).toBe("Help me prepare for Stripe");
    expect(next.messages).toHaveLength(1);
  });

  it("keeps the newest conversation first and switches to it", () => {
    const library = upsertMoxieConversation(
      {
        activeId: "old",
        conversations: [conversation("old", "2026-01-01T00:00:00.000Z")],
      },
      conversation("new", "2026-02-01T00:00:00.000Z"),
    );
    expect(library.activeId).toBe("new");
    expect(library.conversations.map((item) => item.id)).toEqual([
      "new",
      "old",
    ]);
  });

  it("always leaves one conversation behind after a delete", () => {
    const library = removeMoxieConversation(
      {
        activeId: "only",
        conversations: [conversation("only", "2026-01-01T00:00:00.000Z")],
      },
      "only",
    );
    expect(library.conversations).toHaveLength(1);
    expect(library.conversations[0]?.messages).toHaveLength(0);
  });

  it("buckets history by recency", () => {
    const now = new Date("2026-02-10T12:00:00.000Z");
    const groups = groupMoxieConversations(
      [
        conversation("a", "2026-02-10T09:00:00.000Z"),
        conversation("b", "2026-02-09T09:00:00.000Z"),
        conversation("c", "2026-02-06T09:00:00.000Z"),
        conversation("d", "2025-11-06T09:00:00.000Z"),
      ],
      now,
    );
    expect(groups.map((group) => group.label)).toEqual([
      "Today",
      "Yesterday",
      "Previous 7 Days",
      "Older",
    ]);
  });

  it("searches titles and message bodies", () => {
    const items = [
      conversation("a", "2026-02-10T09:00:00.000Z", "Stripe prep", "onsite"),
      conversation("b", "2026-02-10T09:00:00.000Z", "Resume", "bullet points"),
    ];
    expect(searchMoxieConversations(items, "stripe")).toHaveLength(1);
    expect(searchMoxieConversations(items, "bullet")[0]?.id).toBe("b");
    expect(searchMoxieConversations(items, "  ")).toHaveLength(2);
  });
});
