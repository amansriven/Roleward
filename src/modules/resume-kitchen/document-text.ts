import "server-only";

import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * Pulls plain text out of an uploaded resume.
 *
 * Nothing downstream should ever run on a document we could not actually read:
 * an empty extraction means every claim would fail grounding anyway, so it is
 * reported as a failure here rather than as an empty review screen.
 */

export class DocumentReadError extends Error {}

/** A resume with no readable text is almost always a scan, not a bug. */
const MIN_USEFUL_CHARACTERS = 200;

export async function extractDocumentText(
  bytes: ArrayBuffer,
  mediaType: string,
): Promise<string> {
  const text = await read(bytes, mediaType);
  const cleaned = text.replace(/ /g, " ").trim();
  if (cleaned.length < MIN_USEFUL_CHARACTERS)
    throw new DocumentReadError(
      "We could not read any text from this file. If it is a scan or an image, export a text-based PDF and try again.",
    );
  return cleaned;
}

async function read(bytes: ArrayBuffer, mediaType: string) {
  if (mediaType === "application/pdf") {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await extractText(pdf, { mergePages: true });
      return Array.isArray(text) ? text.join("\n") : text;
    } catch (error) {
      throw new DocumentReadError(
        `This PDF could not be opened: ${
          error instanceof Error ? error.message.slice(0, 120) : "unknown error"
        }`,
      );
    }
  }

  if (
    mediaType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const { value } = await mammoth.extractRawText({
        buffer: Buffer.from(bytes),
      });
      return value;
    } catch (error) {
      throw new DocumentReadError(
        `This DOCX could not be opened: ${
          error instanceof Error ? error.message.slice(0, 120) : "unknown error"
        }`,
      );
    }
  }

  throw new DocumentReadError("Upload a PDF or DOCX file.");
}
