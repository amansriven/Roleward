import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { interviewsConfigured, INTERVIEW_MODEL, openai } from "@/modules/interviews/openai";
import { LeetCodeSourceError } from "@/modules/zed/leetcode";
import { fetchLeetCodeProblem } from "@/modules/zed/leetcode-source";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  messages: z
    .array(z.object({ role: z.enum(["assistant", "user"]), content: z.string().trim().min(1).max(4000) }))
    .max(20),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!interviewsConfigured)
    return NextResponse.json({ error: "AI coaching is not configured." }, { status: 503 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const problem = await fetchLeetCodeProblem(parsed.data.url);
    const response = await openai().chat.completions.create({
      model: INTERVIEW_MODEL,
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content: [
            "You are Zed, a patient coding-interview coach.",
            `The candidate is working on ${problem.title} (${problem.difficulty}). Topics listed by LeetCode: ${problem.topics.join(", ") || "not provided"}.`,
            `Problem statement for private coaching context:\n${problem.description}`,
            "Coach with one focused question at a time. Begin by checking the candidate's understanding, then examples/constraints, brute force, pattern, complexity, implementation, and edge cases as appropriate.",
            "Do not reproduce the statement. Do not immediately reveal the pattern or complete solution. Give progressive hints based on what the candidate has tried. If they explicitly ask for the solution after attempting it, explain it, but still ask them to articulate the key invariant.",
            "Keep the response under 140 words. Never claim you ran their code; they run it on LeetCode.",
          ].join("\n\n"),
        },
        ...(parsed.data.messages.length
          ? parsed.data.messages
          : [{ role: "user" as const, content: "Start the guided walkthrough." }]),
      ],
    });
    const message = response.choices[0]?.message?.content?.trim();
    if (!message) throw new Error("empty coaching response");
    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof LeetCodeSourceError)
      return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ error: "Zed could not continue the walkthrough." }, { status: 502 });
  }
}
