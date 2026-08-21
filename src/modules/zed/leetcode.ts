export interface LeetCodeProblem {
  url: string;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  description: string;
}

export class LeetCodeSourceError extends Error {
  constructor(
    public code: "invalid_url" | "unreachable" | "not_found" | "empty",
    message: string,
  ) {
    super(message);
    this.name = "LeetCodeSourceError";
  }
}

export function parseLeetCodeUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new LeetCodeSourceError(
      "invalid_url",
      "Paste a full LeetCode problem link.",
    );
  }
  if (
    url.protocol !== "https:" ||
    !["leetcode.com", "www.leetcode.com"].includes(url.hostname.toLowerCase())
  )
    throw new LeetCodeSourceError(
      "invalid_url",
      "Zed companion supports links from leetcode.com.",
    );

  const match = url.pathname.match(/^\/problems\/([^/]+)/i);
  if (!match?.[1])
    throw new LeetCodeSourceError(
      "invalid_url",
      "That link does not point to a LeetCode problem.",
    );
  const slug = decodeURIComponent(match[1]).trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug))
    throw new LeetCodeSourceError(
      "invalid_url",
      "That problem link is invalid.",
    );
  return {
    slug,
    url: `https://leetcode.com/problems/${slug}/`,
  };
}

export function leetCodeHtmlToText(html: string) {
  return html
    .replace(/<pre\b[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|pre|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
