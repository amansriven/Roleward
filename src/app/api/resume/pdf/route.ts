import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { candidateContactSchema } from "@/modules/candidates/contact";
import { renderResumePdf } from "@/modules/resume-kitchen/resume-pdf";
import {
  resumeVersionItemSchema,
  resumeVersionSkillGroupSchema,
} from "@/modules/resume-kitchen/versions";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  name: z.string().trim().max(200).default(""),
  contact: candidateContactSchema.nullable().default(null),
  headline: z.string().trim().max(200).default(""),
  skills: z.array(resumeVersionSkillGroupSchema).max(20).default([]),
  items: z.array(resumeVersionItemSchema).max(40),
  fileName: z.string().trim().max(120).default("resume"),
});

/** Turns a resume version into the file an applicant tracking system wants. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const pdf = await renderResumePdf(parsed.data);
    // Sanitised because this value goes straight into a response header.
    const fileName =
      parsed.data.fileName.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "resume";
    return new NextResponse(pdf as BodyInit, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${fileName}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("resume pdf render failed", error);
    return NextResponse.json(
      { error: "We could not build the PDF.", code: "pdf_error" },
      { status: 502 },
    );
  }
}
