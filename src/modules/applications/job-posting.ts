export interface ImportedJobPosting {
  description: string;
  companyName: string;
  roleTitle: string;
  location: string;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (entity, code: string) => {
      const point = Number(code);
      return Number.isInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : entity;
    });
}

export function jobPostingHtmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isJobPosting(value: JsonObject) {
  const type = value["@type"];
  return (Array.isArray(type) ? type : [type]).some(
    (entry) => text(entry).toLowerCase() === "jobposting",
  );
}

function findJobPosting(value: unknown): JsonObject | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const match = findJobPosting(entry);
      if (match) return match;
    }
    return null;
  }
  if (!isObject(value)) return null;
  if (isJobPosting(value)) return value;
  for (const child of Object.values(value)) {
    const match = findJobPosting(child);
    if (match) return match;
  }
  return null;
}

function structuredJobPosting(html: string) {
  const scripts = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of scripts) {
    try {
      const posting = findJobPosting(JSON.parse(match[1]!.trim()));
      if (posting) return posting;
    } catch {
      // A page may contain several JSON-LD blocks. Ignore malformed blocks and
      // keep looking for a valid JobPosting object.
    }
  }
  return null;
}

function organizationName(value: unknown) {
  if (typeof value === "string") return value.trim();
  return isObject(value) ? text(value.name) : "";
}

function formatAddress(value: unknown) {
  if (!isObject(value)) return "";
  const address = isObject(value.address) ? value.address : value;
  const country = isObject(address.addressCountry)
    ? text(address.addressCountry.name)
    : text(address.addressCountry);
  return [text(address.addressLocality), text(address.addressRegion), country]
    .filter(Boolean)
    .join(", ");
}

function postingLocation(posting: JsonObject) {
  if (text(posting.jobLocationType).toLowerCase().includes("telecommute"))
    return "Remote";
  const locations = Array.isArray(posting.jobLocation)
    ? posting.jobLocation
    : [posting.jobLocation];
  return locations.map(formatAddress).filter(Boolean).join(" · ");
}

export function parseJobPostingDocument(html: string): ImportedJobPosting {
  const pageText = jobPostingHtmlToText(html);
  const posting = structuredJobPosting(html);
  if (!posting)
    return {
      description: pageText,
      companyName: "",
      roleTitle: "",
      location: "",
    };

  const structuredDescription = jobPostingHtmlToText(text(posting.description));
  return {
    description:
      structuredDescription.length >= 80 ? structuredDescription : pageText,
    companyName: organizationName(posting.hiringOrganization),
    roleTitle: text(posting.title),
    location: postingLocation(posting),
  };
}
