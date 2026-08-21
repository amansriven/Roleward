import "server-only";

import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import type { ResumeLink } from "@/modules/candidates/contact";

/**
 * Pulls plain text out of an uploaded resume.
 *
 * Nothing downstream should ever run on a document we could not actually read:
 * an empty extraction means every claim would fail grounding anyway, so it is
 * reported as a failure here rather than as an empty review screen.
 */

export class DocumentReadError extends Error {}

export interface ExtractedDocumentContent {
  text: string;
  hyperlinks: ResumeLink[];
}

/** A resume with no readable text is almost always a scan, not a bug. */
const MIN_USEFUL_CHARACTERS = 200;

export async function extractDocumentText(
  bytes: ArrayBuffer,
  mediaType: string,
): Promise<string> {
  return (await extractDocumentContent(bytes, mediaType)).text;
}

export async function extractDocumentContent(
  bytes: ArrayBuffer,
  mediaType: string,
): Promise<ExtractedDocumentContent> {
  const { text, hyperlinks } = await read(bytes, mediaType);
  const cleaned = text.replace(/ /g, " ").trim();
  if (cleaned.length < MIN_USEFUL_CHARACTERS)
    throw new DocumentReadError(
      "We could not read any text from this file. If it is a scan or an image, export a text-based PDF and try again.",
    );
  return {
    text: cleaned,
    hyperlinks: dedupeLinks([
      ...hyperlinks,
      ...urlsInText(cleaned).map((url) => ({ label: labelForUrl(url), url })),
    ]),
  };
}

function safeWebUrl(value: string) {
  try {
    const trimmed = value.trim();
    const url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function urlsInText(text: string) {
  const visibleLinks =
    text.match(
      /https?:\/\/[^\s<>"')\]}]+|www\.[^\s<>"')\]}]+|(?:linkedin\.com|github\.com)\/[^\s<>"')\]}]+/gi,
    ) ?? [];
  return visibleLinks.flatMap((value) => {
    const url = safeWebUrl(value.replace(/[.,;:!?]+$/, ""));
    return url ? [url] : [];
  });
}

function labelForUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.hostname.toLowerCase().includes("linkedin.com")) return "LinkedIn";
  if (parsed.hostname.toLowerCase().includes("github.com")) return "GitHub";
  return parsed.hostname.replace(/^www\./, "");
}

function dedupeLinks(links: ResumeLink[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const normalized = link.url.replace(/\/$/, "").toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function linksFromHtml(html: string): ResumeLink[] {
  return [
    ...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
  ].flatMap((match) => {
    const url = safeWebUrl(match[1]!);
    if (!url) return [];
    const label = match[2]!
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return [{ label: label || labelForUrl(url), url }];
  });
}

async function read(bytes: ArrayBuffer, mediaType: string) {
  if (mediaType === "application/pdf") {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await extractText(pdf, { mergePages: true });
      const hyperlinks: ResumeLink[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const annotations = await page.getAnnotations();
        for (const annotation of annotations) {
          const url = safeWebUrl(
            typeof annotation.url === "string"
              ? annotation.url
              : typeof annotation.unsafeUrl === "string"
                ? annotation.unsafeUrl
                : "",
          );
          if (!url) continue;
          const label =
            typeof annotation.contents === "string"
              ? annotation.contents.trim()
              : labelForUrl(url);
          hyperlinks.push({ label: label || labelForUrl(url), url });
        }
      }
      return {
        text: Array.isArray(text) ? text.join("\n") : text,
        hyperlinks,
      };
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
      const buffer = Buffer.from(bytes);
      const [{ value }, { value: html }] = await Promise.all([
        mammoth.extractRawText({ buffer }),
        mammoth.convertToHtml({ buffer }),
      ]);
      return { text: value, hyperlinks: linksFromHtml(html) };
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
