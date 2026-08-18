import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { interviewsConfigured } from "@/modules/interviews/openai";
import {
  extractRequirementsFromPosting,
  RequirementExtractionError,
} from "@/modules/resume-kitchen/requirements";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  jobDescription: z.string().trim().min(80).max(40_000),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!interviewsConfigured)
    return NextResponse.json(
      {
        error: "Requirement extraction is not configured.",
        code: "unconfigured",
      },
      { status: 503 },
    );

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Paste the job description itself, at least 80 characters." },
      { status: 400 },
    );

  try {
    const result = await extractRequirementsFromPosting(
      parsed.data.jobDescription,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RequirementExtractionError)
      return NextResponse.json(
        { error: error.message, code: "extraction_failed" },
        { status: 422 },
      );
    console.error("requirement extraction failed", error);
    return NextResponse.json(
      { error: "We could not read this posting.", code: "extraction_error" },
      { status: 502 },
    );
  }
}
