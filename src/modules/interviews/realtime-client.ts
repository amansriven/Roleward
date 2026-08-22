"use client";

import { createDeliveryMeter } from "./delivery-meter";
import type { DeliveryMetrics } from "./delivery-metrics";

export type RealtimeStatus =
  "connecting" | "live" | "closed" | "unsupported" | "mic_denied" | "failed";

export interface RealtimeHandlers {
  onStatus: (status: RealtimeStatus, detail?: string) => void;
  onTranscript: (
    role: "interviewer" | "candidate",
    text: string,
    /** Present for candidate turns when the delivery meter is available. */
    delivery?: DeliveryMetrics,
  ) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

export interface RealtimeSession {
  /** Injects side context, e.g. a coding edit-log digest, then asks for a reply. */
  sendContext: (text: string) => void;
  close: () => void;
}

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
): Promise<RealtimeSession | null> {
  if (!supported()) {
    handlers.onStatus("unsupported");
    return null;
  }
  handlers.onStatus("connecting");

  let microphone: MediaStream;
  try {
    microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    handlers.onStatus("mic_denied");
    return null;
  }

  const tokenResponse = await fetch("/api/interviews/realtime-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId }),
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

  // Measures loudness on the live stream. No audio is recorded or uploaded.
  const meter = createDeliveryMeter(microphone);
  // Start of the answer currently being spoken, so metrics cover just that turn.
  let answerStartedAt = 0;

  const connection = new RTCPeerConnection();
  const audio = new Audio();
  audio.autoplay = true;

  // Tracks what the candidate actually heard, so an interruption can truncate
  // the model's history to match rather than to what it generated.
  let activeItemId: string | null = null;
  let audioStartedAt = 0;

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
      case "response.output_item.added": {
        const item = message.item as { id?: string } | undefined;
        activeItemId = item?.id ?? null;
        audioStartedAt = Date.now();
        handlers.onSpeakingChange?.(true);
        break;
      }
      case "response.output_audio_transcript.done": {
        const text = message.transcript;
        if (typeof text === "string" && text.trim())
          handlers.onTranscript("interviewer", text.trim());
        break;
      }
      case "conversation.item.input_audio_transcription.completed": {
        const text = message.transcript;
        if (typeof text === "string" && text.trim()) {
          const delivery = meter?.since(answerStartedAt) ?? undefined;
          handlers.onTranscript("candidate", text.trim(), delivery);
          answerStartedAt = meter?.elapsed() ?? 0;
        }
        break;
      }
      case "input_audio_buffer.speech_started": {
        if (meter && answerStartedAt === 0) answerStartedAt = meter.elapsed();
        if (activeItemId) {
          send({
            type: "conversation.item.truncate",
            item_id: activeItemId,
            content_index: 0,
            audio_end_ms: Math.max(0, Date.now() - audioStartedAt),
          });
          activeItemId = null;
        }
        break;
      }
      case "response.done": {
        handlers.onSpeakingChange?.(false);
        break;
      }
    }
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
    close: () => {
      handlers.onStatus("closed");
      cleanup();
    },
  };
}
