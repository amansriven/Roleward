"use client";

import { createDeliveryMeter } from "./delivery-meter";
import type { LiveEvent } from "./live-transcript";
import { turnDetectionFor, type TurnMode } from "./turn-detection";

export type RealtimeStatus =
  "connecting" | "live" | "closed" | "unsupported" | "mic_denied" | "failed";

export interface RealtimeHandlers {
  onStatus: (status: RealtimeStatus, detail?: string) => void;
  /** Transcript changes, keyed by conversation item. See live-transcript.ts. */
  onTranscript: (event: LiveEvent) => void;
  /** The interviewer's audio is playing. */
  onSpeakingChange?: (speaking: boolean) => void;
  /** The candidate is speaking, or holding the floor in push to talk. */
  onCandidateSpeakingChange?: (speaking: boolean) => void;
}

export interface RealtimeSession {
  /** Injects side context, e.g. a coding edit-log digest, then asks for a reply. */
  sendContext: (text: string) => void;
  setTurnMode: (mode: TurnMode) => void;
  /** Push to talk: take the floor, interrupting the interviewer if needed. */
  startAnswer: () => void;
  /** Push to talk: hand the answer over and ask for a reply. */
  endAnswer: () => void;
  /** Commits any answer in progress and waits for its transcript, then closes. */
  finish: () => Promise<void>;
  close: () => void;
}

/** A shorter press is a mis-tap; the server rejects buffers under 100ms anyway. */
const minAnswerMs = 300;
const finishWaitMs = 4_000;

function supported() {
  return (
    typeof window !== "undefined" &&
    typeof RTCPeerConnection !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export async function startRealtimeInterview(
  sessionId: string,
  handlers: RealtimeHandlers,
  { turnMode: initialTurnMode }: { turnMode: TurnMode },
): Promise<RealtimeSession | null> {
  if (!supported()) {
    handlers.onStatus("unsupported");
    return null;
  }
  handlers.onStatus("connecting");

  let microphone: MediaStream;
  try {
    // Explicit, because Safari does not default all of these on, and without
    // echo cancellation the interviewer's own voice reads as an interruption.
    microphone = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch {
    handlers.onStatus("mic_denied");
    return null;
  }

  const tokenResponse = await fetch("/api/interviews/realtime-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId, turnMode: initialTurnMode }),
  });
  const token = (await tokenResponse.json().catch(() => null)) as {
    clientSecret?: string;
    model?: string;
    error?: string;
  } | null;
  if (!tokenResponse.ok || !token?.clientSecret) {
    microphone.getTracks().forEach((track) => track.stop());
    handlers.onStatus("failed", token?.error);
    return null;
  }

  let turnMode = initialTurnMode;
  // In push to talk the mic is muted between answers, so nothing is sent and
  // the delivery meter reads silence while the candidate is not answering.
  const setMicLive = (live: boolean) =>
    microphone.getAudioTracks().forEach((track) => (track.enabled = live));
  setMicLive(turnMode === "auto");

  // Measures loudness on the live stream. No audio is recorded or uploaded.
  const meter = createDeliveryMeter(microphone);
  // The answer currently being given, in meter time, so metrics cover all of
  // it even when it is committed in pieces. Reset when the interviewer speaks.
  let answerStartedAt: number | null = null;
  let answerEndedAt: number | null = null;

  // Push to talk state.
  let talking = false;
  let talkStartedAt = 0;

  // What the interviewer is doing, so a push-to-talk interruption can cancel
  // it and mark how much the candidate heard.
  let responseActive = false;
  let interviewerItemId: string | null = null;
  let playing = false;
  let playbackStartedAt = 0;

  // Candidate items still being transcribed, so finish() can wait for them.
  const pendingTranscripts = new Set<string>();
  let awaitingCommit = false;
  let candidateSpeaking = false;

  const setCandidateSpeaking = (speaking: boolean) => {
    if (candidateSpeaking === speaking) return;
    candidateSpeaking = speaking;
    handlers.onCandidateSpeakingChange?.(speaking);
  };

  const connection = new RTCPeerConnection();
  const audio = new Audio();
  audio.autoplay = true;

  connection.ontrack = (event) => {
    audio.srcObject = event.streams[0] ?? null;
  };
  microphone
    .getTracks()
    .forEach((track) => connection.addTrack(track, microphone));

  const channel = connection.createDataChannel("oai-events");
  const send = (payload: unknown) => {
    if (channel.readyState === "open") channel.send(JSON.stringify(payload));
  };

  channel.onmessage = (event) => {
    let message: { type?: string; [key: string]: unknown };
    try {
      message = JSON.parse(event.data as string);
    } catch {
      return;
    }
    switch (message.type) {
      // Items are placed in conversation order as they are added; their text
      // arrives later. Coding check-ins are text items and stay hidden.
      case "conversation.item.added":
      case "conversation.item.created": {
        const item = message.item as {
          id?: string;
          type?: string;
          role?: string;
          content?: { type?: string }[];
        } | null;
        if (!item?.id || item.type !== "message") break;
        const previousItemId =
          typeof message.previous_item_id === "string"
            ? message.previous_item_id
            : null;
        if (item.role === "assistant") {
          handlers.onTranscript({
            type: "item",
            itemId: item.id,
            role: "interviewer",
            previousItemId,
          });
          break;
        }
        const spoken =
          item.role === "user" &&
          item.content?.some((part) => part.type === "input_audio");
        if (!spoken) break;
        awaitingCommit = false;
        pendingTranscripts.add(item.id);
        const delivery =
          meter && answerStartedAt !== null
            ? meter.since(answerStartedAt, answerEndedAt ?? meter.elapsed())
            : null;
        handlers.onTranscript({
          type: "item",
          itemId: item.id,
          role: "candidate",
          previousItemId,
          ...(delivery ? { delivery } : {}),
        });
        break;
      }
      case "conversation.item.input_audio_transcription.delta": {
        if (typeof message.item_id !== "string") break;
        if (typeof message.delta !== "string" || !message.delta) break;
        handlers.onTranscript({
          type: "delta",
          itemId: message.item_id,
          role: "candidate",
          delta: message.delta,
        });
        break;
      }
      case "conversation.item.input_audio_transcription.completed":
      case "conversation.item.input_audio_transcription.failed": {
        if (typeof message.item_id !== "string") break;
        pendingTranscripts.delete(message.item_id);
        handlers.onTranscript({
          type: "final",
          itemId: message.item_id,
          role: "candidate",
          text:
            typeof message.transcript === "string" ? message.transcript : "",
        });
        break;
      }
      case "response.output_audio_transcript.done": {
        if (typeof message.item_id !== "string") break;
        handlers.onTranscript({
          type: "final",
          itemId: message.item_id,
          role: "interviewer",
          text:
            typeof message.transcript === "string" ? message.transcript : "",
        });
        break;
      }
      case "response.created": {
        responseActive = true;
        break;
      }
      case "response.output_item.added": {
        const item = message.item as { id?: string } | undefined;
        interviewerItemId = item?.id ?? null;
        break;
      }
      case "response.done": {
        responseActive = false;
        // A cancelled reply may never send its transcript; stop waiting on it.
        const response = message.response as {
          output?: { id?: string }[];
        } | null;
        for (const item of response?.output ?? [])
          if (item.id)
            handlers.onTranscript({ type: "settle", itemId: item.id });
        break;
      }
      // Over WebRTC the server owns playback, so these reflect what the
      // candidate actually hears rather than what has been generated.
      case "output_audio_buffer.started": {
        playing = true;
        playbackStartedAt = Date.now();
        // The interviewer has the floor; the next answer starts fresh.
        answerStartedAt = null;
        answerEndedAt = null;
        handlers.onSpeakingChange?.(true);
        break;
      }
      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared": {
        playing = false;
        handlers.onSpeakingChange?.(false);
        break;
      }
      // The server truncates the interviewer's line to what was played when
      // the candidate talks over it.
      case "conversation.item.truncated": {
        if (typeof message.item_id !== "string") break;
        handlers.onTranscript({
          type: "cut_off",
          itemId: message.item_id,
          atMs:
            typeof message.audio_end_ms === "number" ? message.audio_end_ms : 0,
        });
        break;
      }
      case "input_audio_buffer.speech_started": {
        if (meter && answerStartedAt === null)
          answerStartedAt = meter.elapsed();
        setCandidateSpeaking(true);
        break;
      }
      case "input_audio_buffer.speech_stopped": {
        if (meter) answerEndedAt = meter.elapsed();
        setCandidateSpeaking(false);
        break;
      }
    }
  };

  const startAnswer = () => {
    if (turnMode !== "push_to_talk" || talking) return;
    if (responseActive) send({ type: "response.cancel" });
    if (playing) {
      send({ type: "output_audio_buffer.clear" });
      if (interviewerItemId)
        handlers.onTranscript({
          type: "cut_off",
          itemId: interviewerItemId,
          atMs: Date.now() - playbackStartedAt,
        });
    }
    send({ type: "input_audio_buffer.clear" });
    talking = true;
    talkStartedAt = Date.now();
    if (meter && answerStartedAt === null) answerStartedAt = meter.elapsed();
    setMicLive(true);
    setCandidateSpeaking(true);
  };

  const endAnswer = ({ respond = true }: { respond?: boolean } = {}) => {
    if (!talking) return;
    talking = false;
    setMicLive(false);
    setCandidateSpeaking(false);
    if (meter) answerEndedAt = meter.elapsed();
    if (Date.now() - talkStartedAt < minAnswerMs) {
      send({ type: "input_audio_buffer.clear" });
      return;
    }
    send({ type: "input_audio_buffer.commit" });
    awaitingCommit = true;
    if (respond) send({ type: "response.create" });
  };

  const cleanup = () => {
    meter?.stop();
    microphone.getTracks().forEach((track) => track.stop());
    audio.srcObject = null;
    connection.close();
  };

  connection.onconnectionstatechange = () => {
    if (
      connection.connectionState === "failed" ||
      connection.connectionState === "disconnected"
    ) {
      handlers.onStatus("closed");
      cleanup();
    }
  };

  try {
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    const answer = await fetch(
      `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(token.model ?? "")}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token.clientSecret}`,
          "content-type": "application/sdp",
        },
        body: offer.sdp ?? "",
      },
    );
    if (!answer.ok) throw new Error("realtime handshake failed");
    await connection.setRemoteDescription({
      type: "answer",
      sdp: await answer.text(),
    });
  } catch {
    cleanup();
    handlers.onStatus("failed");
    return null;
  }

  channel.onopen = () => {
    handlers.onStatus("live");
    send({ type: "response.create" });
  };

  const close = () => {
    handlers.onStatus("closed");
    cleanup();
  };

  return {
    sendContext: (text: string) => {
      send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      });
      send({ type: "response.create" });
    },
    setTurnMode: (mode) => {
      if (mode === turnMode) return;
      endAnswer();
      turnMode = mode;
      send({
        type: "session.update",
        session: {
          type: "realtime",
          audio: { input: { turn_detection: turnDetectionFor(mode) } },
        },
      });
      if (mode === "push_to_talk") send({ type: "input_audio_buffer.clear" });
      setCandidateSpeaking(false);
      setMicLive(mode === "auto");
    },
    startAnswer,
    endAnswer: () => endAnswer(),
    finish: async () => {
      if (talking) endAnswer({ respond: false });
      else if (turnMode === "auto" && candidateSpeaking) {
        // Mid-sentence when they clicked finish: keep what they said.
        send({ type: "input_audio_buffer.commit" });
        awaitingCommit = true;
      }
      setMicLive(false);
      const deadline = Date.now() + finishWaitMs;
      while (
        (awaitingCommit || pendingTranscripts.size > 0) &&
        Date.now() < deadline
      )
        await new Promise((resolve) => setTimeout(resolve, 100));
      close();
    },
    close,
  };
}
