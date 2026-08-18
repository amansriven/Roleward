import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  DocumentReadError,
  extractDocumentText,
} from "@/modules/resume-kitchen/document-text";
import {
  ExtractionError,
  extractEvidence,
} from "@/modules/resume-kitchen/extraction";
import { interviewsConfigured } from "@/modules/interviews/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Comfortably above any real resume, and under the platform's body limit. */
const MAX_BYTES = 4 * 1024 * 1024;

const ACCEPTED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Turns an uploaded resume into evidence the candidate can confirm.
 *
 * The file is read here rather than fetched from S3: the deploy key can write
 * uploads but has not been given permission to read them back, and this needs
 * no such permission to exist.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!interviewsConfigured)
    return NextResponse.json(
      { error: "Resume extraction is not configured.", code: "unconfigured" },
      { status: 503 },
    );

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  if (!file)
    return NextResponse.json({ error: "No file was sent" }, { status: 400 });
  if (!ACCEPTED.includes(file.type))
    return NextResponse.json(
      { error: "Upload a PDF or DOCX file." },
      { status: 400 },
    );
  if (file.size === 0 || file.size > MAX_BYTES)
    return NextResponse.json(
      { error: "Resume files must be between 1 byte and 4 MB." },
      { status: 400 },
    );

  try {
    const text = await extractDocumentText(await file.arrayBuffer(), file.type);
    const { fullName, headline, items, dropped } = await extractEvidence(text);
    return NextResponse.json({
      fullName,
      headline,
      items,
      // Surfaced so the candidate is told something was withheld and why,
      // rather than silently seeing a shorter list.
      droppedCount: dropped.length,
      characters: text.length,
    });
  } catch (error) {
    if (error instanceof DocumentReadError)
      return NextResponse.json(
        { error: error.message, code: "unreadable" },
        { status: 422 },
      );
    if (error instanceof ExtractionError)
      return NextResponse.json(
        { error: error.message, code: "extraction_failed" },
        { status: 422 },
      );
    console.error("resume extraction failed", error);
    return NextResponse.json(
      { error: "We could not read this resume.", code: "extraction_error" },
      { status: 502 },
    );
  }
}
