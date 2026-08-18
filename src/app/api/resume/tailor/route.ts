import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { interviewsConfigured } from "@/modules/interviews/openai";
import {
  tailorBullet,
  TailoringError,
} from "@/modules/resume-kitchen/tailoring";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  requirement: z.string().trim().min(3).max(400),
  claims: z
    .array(
      z.object({
        id: z.string().min(1),
        content: z.string().trim().min(1).max(600),
        itemTitle: z.string().trim().min(1).max(200),
      }),
    )
    .max(60),
});

/**
 * Claims arrive from the browser because the workspace lives there. That is
 * safe for this route: they are only ever used as the material a suggestion is
 * checked against, so sending fewer or worse claims produces a weaker
 * suggestion, never a less grounded one.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!interviewsConfigured)
    return NextResponse.json(
      { error: "Tailoring is not configured.", code: "unconfigured" },
      { status: 503 },
    );

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const result = await tailorBullet(
      parsed.data.requirement,
      parsed.data.claims,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TailoringError)
      return NextResponse.json(
        { error: error.message, code: "tailoring_failed" },
        { status: 422 },
      );
    console.error("tailoring failed", error);
    return NextResponse.json(
      { error: "We could not draft a suggestion.", code: "tailoring_error" },
      { status: 502 },
    );
  }
}
