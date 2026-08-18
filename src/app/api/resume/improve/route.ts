import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { interviewsConfigured } from "@/modules/interviews/openai";
import {
  improveBullet,
  TailoringError,
} from "@/modules/resume-kitchen/tailoring";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  bullet: z.string().trim().min(5).max(600),
  context: z.string().trim().max(200).default(""),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!interviewsConfigured)
    return NextResponse.json(
      { error: "Rewriting is not configured.", code: "unconfigured" },
      { status: 503 },
    );

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    return NextResponse.json(
      await improveBullet(parsed.data.bullet, parsed.data.context),
    );
  } catch (error) {
    if (error instanceof TailoringError)
      return NextResponse.json(
        { error: error.message, code: "rewrite_failed" },
        { status: 422 },
      );
    console.error("bullet rewrite failed", error);
    return NextResponse.json(
      { error: "We could not rewrite that.", code: "rewrite_error" },
      { status: 502 },
    );
  }
}
