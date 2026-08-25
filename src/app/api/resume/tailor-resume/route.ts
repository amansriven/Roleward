import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { interviewsConfigured } from "@/modules/interviews/openai";
import {
  ResumeTailoringError,
  tailorResume,
} from "@/modules/resume-kitchen/tailor-resume";
import {
  tailorScopeSchema,
  wholeResumeScope,
} from "@/modules/resume-kitchen/tailor-resume-merge";
import {
  resumeVersionItemSchema,
  resumeVersionSkillGroupSchema,
} from "@/modules/resume-kitchen/versions";

export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.object({
  resume: z.object({
    headline: z.string().trim().max(200).default(""),
    skills: z.array(resumeVersionSkillGroupSchema).max(20).default([]),
    items: z.array(resumeVersionItemSchema).max(40),
  }),
  target: z.object({
    companyName: z.string().trim().max(200).default(""),
    roleTitle: z.string().trim().max(200).default(""),
    jobDescription: z.string().trim().min(80).max(40_000),
    requirements: z
      .array(z.string().trim().min(1).max(400))
      .max(40)
      .default([]),
  }),
  /** The candidate's own notes for this run: new detail, or what to emphasise. */
  extraContext: z.string().trim().max(4_000).default(""),
  /** Which parts they ticked. Absent means the whole resume. */
  scope: tailorScopeSchema.optional(),
});

/**
 * The resume arrives from the browser because that is where the workspace
 * lives. Nothing here trusts it beyond its own shape: it is both the material
 * the rewrite may use and the thing every rewrite is checked against, so a
 * tampered resume can only produce a worse tailoring of itself.
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
    return NextResponse.json(
      {
        error:
          "Pick a resume version and a job description of at least 80 characters.",
      },
      { status: 400 },
    );

  try {
    const result = await tailorResume(
      parsed.data.resume,
      parsed.data.target,
      parsed.data.extraContext,
      parsed.data.scope ?? wholeResumeScope,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ResumeTailoringError)
      return NextResponse.json(
        { error: error.message, code: "tailoring_failed" },
        { status: 422 },
      );
    console.error("resume tailoring failed", error);
    return NextResponse.json(
      { error: "We could not tailor this resume.", code: "tailoring_error" },
      { status: 502 },
    );
  }
}
