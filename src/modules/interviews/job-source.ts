import "server-only";

import { lookup } from "node:dns/promises";

import { parseJobPostingDocument } from "@/modules/applications/job-posting";
import { addressBlocked } from "./net-guard";

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;
const IMPORTER_TIMEOUT_MS = 45_000;

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

type ImporterPosting = {
  title?: unknown;
  company?: unknown;
  locations?: unknown;
  description_text?: unknown;
};

function importerText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function fetchFromImporterService(rawUrl: string) {
  const serviceUrl = process.env.JOB_IMPORTER_URL?.trim();
  const serviceSecret = process.env.JOB_IMPORTER_SECRET?.trim();
  if (!serviceUrl) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMPORTER_TIMEOUT_MS);
  try {
    const endpoint = new URL("/jobs/import", serviceUrl);
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(serviceSecret ? { authorization: `Bearer ${serviceSecret}` } : {}),
      },
      body: JSON.stringify({ url: rawUrl }),
    });
    if (!response.ok) return null;

    const posting = (await response.json()) as ImporterPosting;
    const description = importerText(posting.description_text);
    if (description.length < 200) return null;

    const locations = Array.isArray(posting.locations)
      ? posting.locations.map(importerText).filter(Boolean)
      : [];
    return {
      description: description.slice(0, 12_000),
      companyName: importerText(posting.company),
      roleTitle: importerText(posting.title),
      location: locations.join(" · "),
    };
  } catch {
    // The worker is an enhancement. Keep the cheap document parser available
    // if it is unavailable, cold-starting, or cannot handle a particular site.
    return null;
  } finally {
    clearTimeout(timer);
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
        "That address is not reachable from Backstage.",
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

async function readCapped(response: Response) {
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES)
    throw new JobSourceError("too_large", "That page is too large to read.");
  return new TextDecoder().decode(buffer);
}

export async function fetchJobPosting(rawUrl: string) {
  let url = assertHttpsUrl(rawUrl);
  const imported = await fetchFromImporterService(url.toString());
  if (imported) return imported;

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
          "Backstage could not open that link.",
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
      const posting = parseJobPostingDocument(await readCapped(response));
      if (posting.description.length < 200)
        throw new JobSourceError(
          "empty",
          "That page did not contain a readable job description.",
        );
      return {
        ...posting,
        description: posting.description.slice(0, 12_000),
      };
    }
    throw new JobSourceError(
      "unreachable",
      "That link redirected too many times.",
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJobDescription(rawUrl: string) {
  return (await fetchJobPosting(rawUrl)).description;
}
