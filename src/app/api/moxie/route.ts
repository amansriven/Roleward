import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  interviewsConfigured,
  MOXIE_MODEL,
  openai,
} from "@/modules/interviews/openai";
import { buildMoxieContext, moxieRequestSchema } from "@/modules/moxie/context";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { listAttempts } from "@/modules/aws/practice-store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!interviewsConfigured)
    return NextResponse.json(
      { error: "Moxie is not configured yet." },
      { status: 503 },
    );
  const parsed = moxieRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Moxie could not read that request." },
      { status: 400 },
    );
  const attempts = workspaceStorageConfigured
    ? await listAttempts(session.user.id, 40).catch(() => [])
    : [];
  const context = buildMoxieContext({
    workspace: parsed.data.workspace,
    pathname: parsed.data.pathname,
    attempts,
  });
  try {
    const response = await openai().responses.create({
      model: MOXIE_MODEL,
      store: false,
      instructions: [
        "You are Moxie, Roleward's calm, perceptive career operating partner.",
        "You help with recruiting, career planning, resumes, applications, coding practice, and interview preparation.",
        "Use only the supplied workspace context for personal facts. Never invent employers, outcomes, metrics, skills, or experiences.",
        "Distinguish verified workspace facts from suggestions. If context is missing, say so plainly.",
        "This release is read-only. Do not claim you changed, saved, sent, submitted, or published anything.",
        "Be concise, specific, warm, and candid. Prefer an actionable answer over generic encouragement.",
        "When relying on workspace facts, end the relevant sentence with a compact citation like [Source: Active application], [Source: Evidence · Project title], [Source: Zed], or [Source: Stage Fright].",
      ].join("\n"),
      input: [
        ...parsed.data.history.map((item) => ({
          role: item.role,
          content: item.content,
        })),
        {
          role: "user" as const,
          content: `WORKSPACE CONTEXT\n${context}\n\nUSER REQUEST\n${parsed.data.message}`,
        },
      ],
      max_output_tokens: 1_200,
    });
    return NextResponse.json({ message: response.output_text });
  } catch (error) {
    console.error("Moxie response failed", error);
    return NextResponse.json(
      { error: "Moxie could not respond right now." },
      { status: 502 },
    );
  }
}
