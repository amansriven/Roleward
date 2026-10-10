import type { DeliveryMetrics } from "./delivery-metrics";

/**
 * The voice transcript, built from Realtime conversation items.
 *
 * Each item is placed when the server adds it to the conversation, so order
 * follows the conversation rather than whichever transcription finished first.
 * Text arrives later and is filled in by item id. Pure, so ordering and merging
 * stay testable without a live session.
 */
export interface LiveItem {
  itemId: string;
  role: "interviewer" | "candidate";
  text: string;
  /** False while transcription for this item is still arriving. */
  final: boolean;
  /** Covers the whole answer up to this item, so the latest one wins. */
  delivery?: DeliveryMetrics;
  /** Playback position at which the candidate cut this line off. */
  cutOffAtMs?: number;
}

export type LiveEvent =
  | {
      type: "item";
      itemId: string;
      role: LiveItem["role"];
      previousItemId: string | null;
      delivery?: DeliveryMetrics;
    }
  | { type: "delta"; itemId: string; role: LiveItem["role"]; delta: string }
  | { type: "final"; itemId: string; role: LiveItem["role"]; text: string }
  | { type: "cut_off"; itemId: string; atMs: number }
  /** The item will get no more text, e.g. its response was cancelled. */
  | { type: "settle"; itemId: string };

export interface TranscriptMessage {
  role: "interviewer" | "candidate";
  content: string;
  /** Delivery numbers for a spoken answer; absent for typed turns. */
  delivery?: DeliveryMetrics;
  /** Still being transcribed. */
  pending?: boolean;
  cutOffAtMs?: number;
}

function update(
  items: LiveItem[],
  itemId: string,
  role: LiveItem["role"],
  change: (item: LiveItem) => LiveItem,
) {
  const index = items.findIndex((item) => item.itemId === itemId);
  // Text can outrun the item event if one was missed; place it at the end.
  if (index < 0)
    return [...items, change({ itemId, role, text: "", final: false })];
  return items.map((item, at) => (at === index ? change(item) : item));
}

export function applyLiveEvent(items: LiveItem[], event: LiveEvent) {
  switch (event.type) {
    case "item": {
      if (items.some((item) => item.itemId === event.itemId)) return items;
      const anchor = event.previousItemId
        ? items.findIndex((item) => item.itemId === event.previousItemId)
        : -1;
      const at = anchor < 0 ? items.length : anchor + 1;
      const item: LiveItem = {
        itemId: event.itemId,
        role: event.role,
        text: "",
        final: false,
        ...(event.delivery ? { delivery: event.delivery } : {}),
      };
      return [...items.slice(0, at), item, ...items.slice(at)];
    }
    case "delta":
      return update(items, event.itemId, event.role, (item) =>
        item.final ? item : { ...item, text: item.text + event.delta },
      );
    case "final":
      return update(items, event.itemId, event.role, (item) => ({
        ...item,
        text: event.text.trim(),
        final: true,
      }));
    case "settle":
      return items.map((item) =>
        item.itemId === event.itemId ? { ...item, final: true } : item,
      );
    case "cut_off":
      return items.map((item) =>
        item.itemId === event.itemId
          ? { ...item, cutOffAtMs: Math.max(0, Math.round(event.atMs)) }
          : item,
      );
  }
}

/**
 * Collapses items into chat messages. Consecutive candidate items are one
 * answer: turn detection can still commit mid-thought, and a reply that was
 * cancelled before it said anything leaves nothing between the halves.
 */
export function collapseLive(items: LiveItem[]): TranscriptMessage[] {
  const messages: TranscriptMessage[] = [];
  for (const item of items) {
    const text = item.text.trim();
    // Silence, or a transcription that failed: nothing was said here.
    if (item.final && !text) continue;
    const last = messages.at(-1);
    if (item.role === "candidate" && last?.role === "candidate") {
      last.content = [last.content, text].filter(Boolean).join(" ");
      last.pending = Boolean(last.pending) || !item.final;
      if (item.delivery) last.delivery = item.delivery;
      continue;
    }
    messages.push({
      role: item.role,
      content: text,
      ...(item.final ? {} : { pending: true }),
      ...(item.delivery ? { delivery: item.delivery } : {}),
      ...(item.cutOffAtMs !== undefined ? { cutOffAtMs: item.cutOffAtMs } : {}),
    });
  }
  return messages;
}

/**
 * Messages as stored turns. A line the candidate talked over is kept, but marked,
 * so scoring does not treat it as a question they heard in full.
 */
export function transcriptTurns(messages: TranscriptMessage[]) {
  return messages
    .filter((message) => message.content.trim())
    .map((message) => ({
      role: message.role,
      content:
        message.cutOffAtMs === undefined
          ? message.content
          : `${message.content} [The candidate cut in after about ${Math.max(1, Math.round(message.cutOffAtMs / 1000))}s of this.]`,
      ...(message.delivery ? { delivery: message.delivery } : {}),
    }));
}
