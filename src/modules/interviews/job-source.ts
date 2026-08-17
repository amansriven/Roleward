import "server-only";

import { lookup } from "node:dns/promises";

import { addressBlocked } from "./net-guard";

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

export class JobSourceError extends Error {
  constructor(
    public code:
      "invalid_url" | "blocked_host" | "unreachable" | "too_large" | "empty",
    message: string,
  ) {
    super(message);
    this.name = "JobSourceError";
  }
}

/**
 * Rejects hosts that resolve to internal addresses. A determined attacker can
 * still DNS-rebind between this check and the fetch; blocking that fully needs
 * connection-level IP pinning. This is a best-effort guard on a best-effort
 * import path, not a hard security boundary.
 */
async function assertPublicHost(hostname: string) {
  let records: { address: string; family: number }[];
  try {
    records = await lookup(hostname, { all: true });
  } catch {
    throw new JobSourceError(
      "unreachable",
      "That hostname could not be resolved.",
    );
  }
  if (!records.length)
    throw new JobSourceError(
      "unreachable",
      "That hostname could not be resolved.",
    );
  for (const record of records)
    if (addressBlocked(record.address, record.family))
      throw new JobSourceError(
        "blocked_host",
        "That address is not reachable from Sweet+.",
      );
}

function assertHttpsUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new JobSourceError("invalid_url", "That does not look like a URL.");
  }
  if (url.protocol !== "https:")
    throw new JobSourceError("invalid_url", "Only https links are supported.");
  return url;
}

function htmlToText(html: string) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readCapped(response: Response) {
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES)
    throw new JobSourceError("too_large", "That page is too large to read.");
  return new TextDecoder().decode(buffer);
}

export async function fetchJobDescription(rawUrl: string) {
  let url = assertHttpsUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      await assertPublicHost(url.hostname);
      let response: Response;
      try {
        response = await fetch(url, {
          redirect: "manual",
          signal: controller.signal,
          headers: { accept: "text/html,text/plain" },
        });
      } catch {
        throw new JobSourceError(
          "unreachable",
          "Sweet+ could not open that link.",
        );
      }
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location)
          throw new JobSourceError(
            "unreachable",
            "That link redirected nowhere.",
          );
        // Re-validated on the next pass, so redirects cannot escape the guard.
        url = assertHttpsUrl(new URL(location, url).toString());
        continue;
      }
      if (!response.ok)
        throw new JobSourceError(
          "unreachable",
          `That site returned ${response.status}. Paste the description instead.`,
        );
      const text = htmlToText(await readCapped(response));
      if (text.length < 200)
        throw new JobSourceError(
          "empty",
          "That page did not contain a readable job description.",
        );
      return text.slice(0, 12_000);
    }
    throw new JobSourceError(
      "unreachable",
      "That link redirected too many times.",
    );
  } finally {
    clearTimeout(timer);
  }
}
