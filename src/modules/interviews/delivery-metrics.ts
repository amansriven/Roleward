/**
 * Audio-derived delivery measures.
 *
 * Roleward never records or stores the candidate's voice. The microphone stream
 * is analysed in the browser as it plays, and only the numbers below leave the
 * page — loudness envelopes are reduced to counts and durations, and the audio
 * itself is discarded frame by frame. That keeps Milestone 8's measures without
 * introducing voice retention.
 */

/** One loudness reading: milliseconds since the meter started, and RMS 0–1. */
export interface DeliverySample {
  at: number;
  rms: number;
}

export interface DeliveryMetrics {
  /** Milliseconds where the candidate was audibly speaking. */
  speakingMs: number;
  /** Milliseconds of silence inside the answer, excluding leading silence. */
  silenceMs: number;
  /** Pauses long enough to be heard as a pause rather than a breath. */
  pauseCount: number;
  longestPauseMs: number;
  /** Mean loudness while speaking, 0–1. A confidence proxy, not a verdict. */
  meanEnergy: number;
  /**
   * Loudness spread while speaking, 0–1. Near zero reads as monotone; the
   * interpretation belongs to the coach, not to this number.
   */
  energyVariation: number;
}

/** Below this RMS the frame is treated as silence rather than speech. */
export const speechThreshold = 0.02;
/** Silence shorter than this is breathing, not a pause. */
export const pauseThresholdMs = 600;

const mean = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;

/**
 * Reduces a loudness envelope to delivery measures. Pure, so the thresholds
 * stay testable without a microphone.
 */
export function summarizeDelivery(
  samples: DeliverySample[],
  options: { threshold?: number; pauseMs?: number } = {},
): DeliveryMetrics | null {
  const threshold = options.threshold ?? speechThreshold;
  const pauseMs = options.pauseMs ?? pauseThresholdMs;
  const ordered = [...samples].sort((a, b) => a.at - b.at);
  if (ordered.length < 2) return null;

  const speakingEnergies: number[] = [];
  let speakingMs = 0;
  let silenceMs = 0;
  let pauseCount = 0;
  let longestPauseMs = 0;
  let runningSilence = 0;
  let heardSpeech = false;

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (!previous || !current) continue;
    const span = current.at - previous.at;
    if (span <= 0) continue;
    if (previous.rms >= threshold) {
      heardSpeech = true;
      speakingMs += span;
      speakingEnergies.push(previous.rms);
      if (runningSilence >= pauseMs) {
        pauseCount += 1;
        longestPauseMs = Math.max(longestPauseMs, runningSilence);
      }
      runningSilence = 0;
      continue;
    }
    // Silence before the first word is thinking time, not an internal pause.
    if (!heardSpeech) continue;
    runningSilence += span;
    silenceMs += span;
  }
  // A trailing pause still counts once speech has been heard.
  if (runningSilence >= pauseMs) {
    pauseCount += 1;
    longestPauseMs = Math.max(longestPauseMs, runningSilence);
  }
  if (!heardSpeech) return null;

  const meanEnergy = mean(speakingEnergies);
  const spread =
    speakingEnergies.length < 2
      ? 0
      : Math.sqrt(
          mean(speakingEnergies.map((value) => (value - meanEnergy) ** 2)),
        );

  return {
    speakingMs: Math.round(speakingMs),
    silenceMs: Math.round(silenceMs),
    pauseCount,
    longestPauseMs: Math.round(longestPauseMs),
    meanEnergy: Number(meanEnergy.toFixed(4)),
    energyVariation: Number(spread.toFixed(4)),
  };
}

/**
 * Speaking pace excluding pauses. This is the honest words-per-minute figure:
 * the transcript-window estimate counts thinking time, this does not.
 */
export function speakingPace(words: number, metrics: DeliveryMetrics) {
  if (metrics.speakingMs < 2_000) return null;
  return Math.round((words / (metrics.speakingMs / 60_000)) * 1) || null;
}
