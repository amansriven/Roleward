import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getInterview, putInterview } from "@/modules/aws/interview-store";
import { truncateAnswer } from "@/modules/interviews/conversation";
import { deliveryMetricsSchema } from "@/modules/interviews/schema";

export const runtime = "nodejs";

/**
 * Voice turns are exchanged directly between the browser and OpenAI, so the
 * server never sees them. The client posts the collected transcript here so the
 * session can be scored and stored like a text interview.
 */
const requestSchema = z.object({
  sessionId: z.string().min(1),
  turns: z
    .array(
      z.object({
        role: z.enum(["interviewer", "candidate"]),
        content: z.string().trim().min(1),
        // Loudness-derived numbers only; the audio never leaves the browser.
        delivery: deliveryMetricsSchema.optional(),
      }),
    )
    .max(200),
});

export async function POST(request: Request) {
  const auth_ = await auth();
  if (!auth_?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured)
    return NextResponse.json(
      { error: "Interview storage is not configured." },
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

  const now = new Date().toISOString();
  session.turns = parsed.data.turns.map((turn) => ({
    id: randomUUID(),
    role: turn.role,
    content: truncateAnswer(turn.content),
    competency: null,
    ...(turn.delivery ? { delivery: turn.delivery } : {}),
    createdAt: now,
  }));
  await putInterview(auth_.user.id, session);
  return NextResponse.json({ session });
}
