import "server-only";

import {
  leetCodeHtmlToText,
  LeetCodeSourceError,
  parseLeetCodeUrl,
  type LeetCodeProblem,
} from "./leetcode";

const QUERY = `query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    title titleSlug difficulty content
    topicTags { name }
  }
}`;

export async function fetchLeetCodeProblem(
  rawUrl: string,
): Promise<LeetCodeProblem> {
  const source = parseLeetCodeUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    let response: Response;
    try {
      response = await fetch("https://leetcode.com/graphql/", {
        method: "POST",
        signal: controller.signal,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          referer: source.url,
          "user-agent": "Roleward Zed Companion/1.0",
        },
        body: JSON.stringify({
          operationName: "questionData",
          query: QUERY,
          variables: { titleSlug: source.slug },
        }),
        cache: "no-store",
      });
    } catch {
      throw new LeetCodeSourceError(
        "unreachable",
        "Zed could not reach LeetCode right now.",
      );
    }
    if (!response.ok)
      throw new LeetCodeSourceError(
        "unreachable",
        "LeetCode did not make that problem available.",
      );
    const body = (await response.json()) as {
      data?: { question?: Record<string, unknown> | null };
    };
    const question = body.data?.question;
    if (!question)
      throw new LeetCodeSourceError("not_found", "That problem was not found.");
    const description = leetCodeHtmlToText(String(question.content ?? ""));
    if (description.length < 40)
      throw new LeetCodeSourceError(
        "empty",
        "That problem is unavailable or requires a LeetCode subscription.",
      );
    const difficulty = String(question.difficulty);
    if (!["Easy", "Medium", "Hard"].includes(difficulty))
      throw new LeetCodeSourceError(
        "empty",
        "That problem could not be parsed.",
      );
    return {
      ...source,
      title: String(question.title ?? source.slug),
      difficulty: difficulty as LeetCodeProblem["difficulty"],
      description: description.slice(0, 15_000),
      topics: Array.isArray(question.topicTags)
        ? question.topicTags
            .map((tag) =>
              tag && typeof tag === "object" && "name" in tag
                ? String(tag.name)
                : "",
            )
            .filter(Boolean)
            .slice(0, 12)
        : [],
    };
  } finally {
    clearTimeout(timer);
  }
}
