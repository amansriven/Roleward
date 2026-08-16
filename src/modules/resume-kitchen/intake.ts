import { z } from "zod";
import { evidenceItemSchema } from "@/modules/evidence/schema";

export const acceptedResumeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const resumeDocumentSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  mediaType: z.enum(acceptedResumeTypes),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum([
    "uploaded",
    "queued",
    "processing",
    "review_required",
    "complete",
    "failed",
  ]),
  createdAt: z.string().datetime(),
});

export const resumeProcessingJobSchema = z.object({
  id: z.string().min(1),
  type: z.literal("parse_resume"),
  schemaVersion: z.literal("resume-parse-v1"),
  resumeId: z.string().min(1),
  ownerId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  attempt: z.number().int().positive(),
  createdAt: z.string().datetime(),
});

export const resumeExtractionSchema = z.object({
  resumeId: z.string().min(1),
  parserVersion: z.literal("local-demo-v1"),
  items: z.array(evidenceItemSchema),
});

export type ResumeDocument = z.infer<typeof resumeDocumentSchema>;
export type ResumeExtraction = z.infer<typeof resumeExtractionSchema>;

export function createResumeProcessingJob(
  resume: ResumeDocument,
  ownerId: string,
) {
  return resumeProcessingJobSchema.parse({
    id: crypto.randomUUID(),
    type: "parse_resume",
    schemaVersion: "resume-parse-v1",
    resumeId: resume.id,
    ownerId,
    idempotencyKey: `parse_resume:${ownerId}:${resume.contentHash}:resume-parse-v1`,
    attempt: 1,
    createdAt: new Date().toISOString(),
  });
}

export function validateResumeFile(file: Pick<File, "name" | "type" | "size">) {
  if (
    !acceptedResumeTypes.includes(
      file.type as (typeof acceptedResumeTypes)[number],
    )
  )
    return "Upload a PDF or DOCX file.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > 10 * 1024 * 1024)
    return "Resume files must be 10 MB or smaller.";
  return null;
}

export async function hashFile(file: Blob) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
