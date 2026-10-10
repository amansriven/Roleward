import { describe, expect, it } from "vitest";
import type { DeliveryMetrics } from "./delivery-metrics";
import {
  applyLiveEvent,
  collapseLive,
  transcriptTurns,
  type LiveEvent,
  type LiveItem,
} from "./live-transcript";

const run = (events: LiveEvent[]) =>
  events.reduce<LiveItem[]>(applyLiveEvent, []);

const delivery = (speakingMs: number): DeliveryMetrics => ({
  speakingMs,
  silenceMs: 0,
  pauseCount: 0,
  longestPauseMs: 0,
  meanEnergy: 0.1,
  energyVariation: 0.01,
});

describe("live transcript", () => {
  it("keeps conversation order when transcription finishes late", () => {
    const items = run([
      { type: "item", itemId: "q1", role: "interviewer", previousItemId: null },
      { type: "final", itemId: "q1", role: "interviewer", text: "Tell me." },
      { type: "item", itemId: "a1", role: "candidate", previousItemId: "q1" },
      { type: "item", itemId: "q2", role: "interviewer", previousItemId: "a1" },
      // The reply transcript lands before the answer's transcription.
      { type: "final", itemId: "q2", role: "interviewer", text: "Why?" },
      { type: "final", itemId: "a1", role: "candidate", text: "I led it." },
    ]);
    expect(collapseLive(items).map((message) => message.content)).toEqual([
      "Tell me.",
      "I led it.",
      "Why?",
    ]);
  });

  it("merges an answer split across commits into one message", () => {
    const items = run([
      {
        type: "item",
        itemId: "a1",
        role: "candidate",
        previousItemId: null,
        delivery: delivery(3_000),
      },
      { type: "final", itemId: "a1", role: "candidate", text: "First we" },
      {
        type: "item",
        itemId: "a2",
        role: "candidate",
        previousItemId: "a1",
        delivery: delivery(9_000),
      },
      { type: "final", itemId: "a2", role: "candidate", text: "shipped it." },
    ]);
    const messages = collapseLive(items);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe("First we shipped it.");
    expect(messages[0]?.delivery?.speakingMs).toBe(9_000);
    expect(messages[0]?.pending).toBe(false);
  });

  it("merges across a reply that was cancelled before saying anything", () => {
    const items = run([
      { type: "item", itemId: "a1", role: "candidate", previousItemId: null },
      { type: "final", itemId: "a1", role: "candidate", text: "So" },
      { type: "item", itemId: "r1", role: "interviewer", previousItemId: "a1" },
      { type: "final", itemId: "r1", role: "interviewer", text: "" },
      { type: "item", itemId: "a2", role: "candidate", previousItemId: "r1" },
      { type: "final", itemId: "a2", role: "candidate", text: "then" },
    ]);
    expect(collapseLive(items).map((message) => message.content)).toEqual([
      "So then",
    ]);
  });

  it("streams partial text and marks it pending", () => {
    const items = run([
      { type: "item", itemId: "a1", role: "candidate", previousItemId: null },
      { type: "delta", itemId: "a1", role: "candidate", delta: "I think" },
    ]);
    expect(collapseLive(items)).toEqual([
      { role: "candidate", content: "I think", pending: true },
    ]);
  });

  it("ignores duplicate item events and late deltas", () => {
    const items = run([
      { type: "item", itemId: "a1", role: "candidate", previousItemId: null },
      { type: "item", itemId: "a1", role: "candidate", previousItemId: null },
      { type: "final", itemId: "a1", role: "candidate", text: "Done." },
      { type: "delta", itemId: "a1", role: "candidate", delta: " extra" },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.text).toBe("Done.");
  });

  it("settles a reply that never sent a transcript", () => {
    const items = run([
      { type: "item", itemId: "r1", role: "interviewer", previousItemId: null },
      { type: "settle", itemId: "r1" },
    ]);
    expect(collapseLive(items)).toEqual([]);
  });

  it("keeps text already received when a reply settles", () => {
    const items = run([
      { type: "item", itemId: "r1", role: "interviewer", previousItemId: null },
      { type: "final", itemId: "r1", role: "interviewer", text: "Go on." },
      { type: "settle", itemId: "r1" },
    ]);
    expect(collapseLive(items)[0]?.content).toBe("Go on.");
  });

  it("marks lines the candidate cut off when storing turns", () => {
    const items = run([
      { type: "item", itemId: "q1", role: "interviewer", previousItemId: null },
      {
        type: "final",
        itemId: "q1",
        role: "interviewer",
        text: "Walk me through it.",
      },
      { type: "cut_off", itemId: "q1", atMs: 2_400 },
    ]);
    expect(transcriptTurns(collapseLive(items))).toEqual([
      {
        role: "interviewer",
        content:
          "Walk me through it. [The candidate cut in after about 2s of this.]",
      },
    ]);
  });
});
