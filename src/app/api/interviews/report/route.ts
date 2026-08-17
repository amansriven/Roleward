import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getInterview, putInterview } from "@/modules/aws/interview-store";
import { scoreInterview } from "@/modules/interviews/conversation";
import { interviewsConfigured } from "@/modules/interviews/openai";
import { summarizeSession } from "@/modules/interviews/schema";
import { instructionsForSession } from "@/modules/interviews/server";

export const runtime = "nodejs";

const requestSchema = z.object({ sessionId: z.string().min(1) });

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
  if (session.report)
    return NextResponse.json({
      session,
      summary: summarizeSession(session),
    });
  if (!session.turns.some((turn) => turn.role === "candidate"))
    return NextResponse.json(
      { error: "Answer at least one question before finishing." },
      { status: 400 },
    );

  session.report = await scoreInterview(
    session,
    await instructionsForSession(auth_.user.id, session),
  );
  session.status = "complete";
  session.completedAt = new Date().toISOString();
  await putInterview(auth_.user.id, session);

  return NextResponse.json({ session, summary: summarizeSession(session) });
}
