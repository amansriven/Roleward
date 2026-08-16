import { describe, expect, it } from "vitest";
import {
  createResumeProcessingJob,
  resumeDocumentSchema,
  validateResumeFile,
} from "./intake";

describe("resume intake", () => {
  it("rejects unsupported and oversized files", () => {
    expect(
      validateResumeFile({ name: "resume.txt", type: "text/plain", size: 10 }),
    ).toContain("PDF or DOCX");
    expect(
      validateResumeFile({
        name: "resume.pdf",
        type: "application/pdf",
        size: 11 * 1024 * 1024,
      }),
    ).toContain("10 MB");
  });

  it("creates a stable idempotency key for the same owner, hash, and parser version", () => {
    const resume = resumeDocumentSchema.parse({
      id: "resume-1",
      fileName: "resume.pdf",
      mediaType: "application/pdf",
      sizeBytes: 100,
      contentHash: "a".repeat(64),
      status: "queued",
      createdAt: new Date().toISOString(),
    });
    const first = createResumeProcessingJob(resume, "user-1");
    const second = createResumeProcessingJob(resume, "user-1");
    expect(first.idempotencyKey).toBe(second.idempotencyKey);
    expect(first.id).not.toBe(second.id);
  });
});
