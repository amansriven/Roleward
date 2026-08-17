import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getInterview, putInterview } from "@/modules/aws/interview-store";
import {
  nextInterviewerTurn,
  truncateAnswer,
} from "@/modules/interviews/conversation";
import { interviewsConfigured } from "@/modules/interviews/openai";
import { instructionsForSession } from "@/modules/interviews/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  sessionId: z.string().min(1),
  answer: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const auth_ = await auth();
  if (!auth_?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!interviewsConfigured || !workspaceStorageConfigured)
    return NextResponse.json(
      { error: "Interviews are not configured." },
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

  session.turns.push({
    id: randomUUID(),
    role: "candidate",
    content: truncateAnswer(parsed.data.answer),
    competency: null,
    createdAt: new Date().toISOString(),
  });

  const result = await nextInterviewerTurn(
    session,
    await instructionsForSession(auth_.user.id, session),
  );
  session.turns.push({
    id: randomUUID(),
    role: "interviewer",
    content: result.message,
    competency: result.competency,
    createdAt: new Date().toISOString(),
  });

  await putInterview(auth_.user.id, session);
  return NextResponse.json({
    message: result.message,
    shouldConclude: result.shouldConclude,
    session,
  });
}
