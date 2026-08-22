import {
  summarizeDelivery,
  type DeliveryMetrics,
  type DeliverySample,
} from "./delivery-metrics";

/**
 * Samples microphone loudness while the candidate speaks.
 *
 * The analyser reads the live stream frame by frame and keeps only an RMS
 * number per frame; no audio buffer is retained, recorded, or uploaded. Samples
 * are held in memory for the length of the session and discarded on stop.
 */
export interface DeliveryMeter {
  /** Metrics for the window starting at `from` ms, or null if too little audio. */
  since: (from: number) => DeliveryMetrics | null;
  /** Milliseconds since the meter started. */
  elapsed: () => number;
  stop: () => void;
}

const sampleIntervalMs = 50;
/** Roughly twenty minutes at the sample rate, so a long session stays bounded. */
const maxSamples = 24_000;

export function createDeliveryMeter(stream: MediaStream): DeliveryMeter | null {
  const AudioContextClass =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ??
        (window as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext);
  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 1_024;
  source.connect(analyser);

  const frame = new Float32Array(analyser.fftSize);
  const samples: DeliverySample[] = [];
  const startedAt = Date.now();

  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(frame);
    let sum = 0;
    for (const value of frame) sum += value * value;
    samples.push({
      at: Date.now() - startedAt,
      rms: Math.sqrt(sum / frame.length),
    });
    if (samples.length > maxSamples) samples.splice(0, samples.length / 2);
  }, sampleIntervalMs);

  return {
    since: (from) =>
      summarizeDelivery(samples.filter((sample) => sample.at >= from)),
    elapsed: () => Date.now() - startedAt,
    stop: () => {
      clearInterval(timer);
      samples.length = 0;
      source.disconnect();
      analyser.disconnect();
      void context.close().catch(() => {});
    },
  };
}
