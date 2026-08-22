import { describe, expect, it } from "vitest";
import {
  speakingPace,
  summarizeDelivery,
  type DeliverySample,
} from "./delivery-metrics";

/** Builds an envelope: each segment is [durationMs, rms], sampled every 50ms. */
const envelope = (segments: [number, number][]): DeliverySample[] => {
  const samples: DeliverySample[] = [];
  let at = 0;
  for (const [duration, rms] of segments) {
    for (let elapsed = 0; elapsed < duration; elapsed += 50) {
      samples.push({ at, rms });
      at += 50;
    }
  }
  samples.push({ at, rms: 0 });
  return samples;
};

describe("delivery metrics", () => {
  it("splits speaking from silence", () => {
    const metrics = summarizeDelivery(
      envelope([
        [1_000, 0.2],
        [1_000, 0],
        [1_000, 0.2],
      ]),
    );
    expect(metrics?.speakingMs).toBe(2_000);
    expect(metrics?.silenceMs).toBe(1_000);
  });

  it("counts only silences long enough to hear as a pause", () => {
    const metrics = summarizeDelivery(
      envelope([
        [1_000, 0.2],
        [300, 0], // a breath
        [1_000, 0.2],
        [1_500, 0], // a pause
        [1_000, 0.2],
      ]),
    );
    expect(metrics?.pauseCount).toBe(1);
    expect(metrics?.longestPauseMs).toBe(1_500);
  });

  it("ignores silence before the first word", () => {
    const metrics = summarizeDelivery(
      envelope([
        [3_000, 0], // thinking time
        [1_000, 0.2],
      ]),
    );
    expect(metrics?.silenceMs).toBe(0);
    expect(metrics?.pauseCount).toBe(0);
  });

  it("counts a trailing pause once speech has been heard", () => {
    const metrics = summarizeDelivery(
      envelope([
        [1_000, 0.2],
        [2_000, 0],
      ]),
    );
    expect(metrics?.pauseCount).toBe(1);
  });

  it("reports monotone delivery as near-zero variation", () => {
    const steady = summarizeDelivery(envelope([[2_000, 0.2]]));
    expect(steady?.energyVariation).toBe(0);
    const varied = summarizeDelivery(
      envelope([
        [1_000, 0.1],
        [1_000, 0.4],
      ]),
    );
    expect(varied?.energyVariation ?? 0).toBeGreaterThan(0.1);
  });

  it("returns null when there is no speech or too little data", () => {
    expect(summarizeDelivery(envelope([[2_000, 0]]))).toBeNull();
    expect(summarizeDelivery([{ at: 0, rms: 0.5 }])).toBeNull();
  });

  it("computes pace over speaking time, not the whole window", () => {
    const metrics = summarizeDelivery(
      envelope([
        [30_000, 0.2],
        [30_000, 0],
      ]),
    );
    // 60 words spoken across 30s of speech reads as 120 wpm, not 60.
    expect(speakingPace(60, metrics!)).toBe(120);
  });

  it("declines to report pace from a sliver of speech", () => {
    const metrics = summarizeDelivery(envelope([[1_000, 0.2]]));
    expect(speakingPace(10, metrics!)).toBeNull();
  });
});
