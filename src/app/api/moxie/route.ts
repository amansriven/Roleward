import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  interviewsConfigured,
  MOXIE_MODEL,
  openai,
} from "@/modules/interviews/openai";
import { buildMoxieContext, moxieRequestSchema } from "@/modules/moxie/context";
import {
  moxiePayloadSchema,
  moxieResponseJsonSchema,
} from "@/modules/moxie/contract";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { listAttempts } from "@/modules/aws/practice-store";
import { listGoals, listMemories } from "@/modules/aws/moxie-store";
import { listInterviews } from "@/modules/aws/interview-store";
import { buildMoxieTranscripts } from "@/modules/moxie/transcript";

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
  const [attempts, memories, goals, interviews] = workspaceStorageConfigured
    ? await Promise.all([
        listAttempts(session.user.id, 40).catch(() => []),
        listMemories(session.user.id).catch(() => []),
        listGoals(session.user.id).catch(() => []),
        // Transcripts live outside the workspace snapshot; coaching needs them.
        listInterviews(session.user.id, 6).catch(() => []),
      ])
    : [[], [], [], []];
  const context = buildMoxieContext({
    workspace: parsed.data.workspace,
    pathname: parsed.data.pathname,
    attempts,
    memories,
    goals,
    transcripts: buildMoxieTranscripts(interviews),
  });
  const instructions = [
    "You are Moxie, Roleward's calm, perceptive career operating partner.",
    "You help with recruiting, career planning, resumes, applications, coding practice, and interview preparation.",
    "Use only the supplied workspace context for personal facts. Never invent employers, outcomes, metrics, skills, or experiences.",
    "Distinguish verified workspace facts from suggestions. If context is missing, say so plainly.",
    "You never change a record yourself. You propose a draft and the user accepts or denies it, so do not claim you changed, saved, sent, submitted, or published anything.",
    "Be concise, specific, warm, and candid. Prefer an actionable answer over generic encouragement.",
    "Treat `memory` and `goals` in the context as facts and commitments the user approved; honour them without restating them back unprompted.",
    "Answer as an array of blocks. Prose belongs in `paragraph` and `list` blocks; reach for a richer block only when the shape genuinely fits.",
    "`interviewTranscripts` holds real answers the candidate gave, with the question and a words-per-minute figure measured across the answer window, which includes thinking time. Coach from these words rather than from scores alone, and quote the answer you mean.",
    "Put measured figures in a coach block's `evidence` and your reading in `observation`. Never present a reading as a measurement.",
    "Use `plan` for a sequence of actions, `coach` for delivery feedback, `table` to compare options, and `draft` for content you are writing on the user's behalf.",
    "On a `draft` that rewrites an existing resume bullet, set `bulletId` from the resume bullets in context so the user can accept the change; otherwise leave it null.",
    "Populate `citations` on any block resting on workspace facts, naming the source as 'Active application', 'Evidence · Title', 'Active resume', 'Zed', or 'Stage Fright'.",
    "Use `proposals` sparingly: a `memory` when the user states a durable fact about themselves, a `goal` when they commit to an outcome. Never propose something already in `memory`, and never claim you saved one.",
  ].join("\n");

  try {
    const completion = await openai().chat.completions.create({
      model: MOXIE_MODEL,
      messages: [
        { role: "system" as const, content: instructions },
        ...parsed.data.history.map((item) => ({
          role: item.role,
          content: item.content,
        })),
        {
          role: "user" as const,
          content: `WORKSPACE CONTEXT\n${context}\n\nUSER REQUEST\n${parsed.data.message}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "moxie_response",
          strict: true,
          schema: moxieResponseJsonSchema,
        },
      },
      max_completion_tokens: 2_000,
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const payload = moxiePayloadSchema.safeParse(
      JSON.parse(raw || "null") ?? null,
    );
    if (!payload.success || payload.data.blocks.length === 0)
      return NextResponse.json(
        { error: "Moxie could not compose an answer." },
        { status: 502 },
      );
    // Stored as the contract JSON; the renderer parses it back into blocks.
    return NextResponse.json({ message: JSON.stringify(payload.data) });
  } catch (error) {
    console.error("Moxie response failed", error);
    return NextResponse.json(
      { error: "Moxie could not respond right now." },
      { status: 502 },
    );
  }
}
