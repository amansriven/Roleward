import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getInterview } from "@/modules/aws/interview-store";
import {
  interviewsConfigured,
  openaiApiKey,
  REALTIME_MODEL,
} from "@/modules/interviews/openai";
import { instructionsForSession } from "@/modules/interviews/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  sessionId: z.string().min(1),
  voice: z.string().trim().min(1).max(40).default("marin"),
});

/**
 * Mints a short-lived Realtime client secret. The real OPENAI_API_KEY stays on
 * the server; the browser gets only this ephemeral credential.
 */
export async function POST(request: Request) {
  const auth_ = await auth();
  if (!auth_?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!interviewsConfigured || !workspaceStorageConfigured)
    return NextResponse.json(
      { error: "Voice interviews are not configured." },
      { status: 503 },
    );

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const session = await getInterview(auth_.user.id, parsed.data.sessionId);
  if (!session)
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  if (session.status !== "in_progress")
    return NextResponse.json(
      { error: "This interview is already finished." },
      { status: 409 },
    );

  const instructions = await instructionsForSession(auth_.user.id, session);
  const response = await fetch(
    "https://api.openai.com/v1/realtime/client_secrets",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${openaiApiKey()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: REALTIME_MODEL,
          instructions,
          audio: {
            input: { transcription: { model: "whisper-1" } },
            output: { voice: parsed.data.voice },
          },
        },
      }),
    },
  );

  if (!response.ok)
    return NextResponse.json(
      { error: "Could not start a voice session. Use text instead." },
      { status: 502 },
    );

  const body = (await response.json()) as {
    value?: string;
    expires_at?: number;
  };
  if (!body.value)
    return NextResponse.json(
      { error: "Could not start a voice session. Use text instead." },
      { status: 502 },
    );
  return NextResponse.json({
    clientSecret: body.value,
    expiresAt: body.expires_at ?? null,
    model: REALTIME_MODEL,
  });
}
