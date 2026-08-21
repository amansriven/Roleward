import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { LeetCodeSourceError } from "@/modules/zed/leetcode";
import { fetchLeetCodeProblem } from "@/modules/zed/leetcode-source";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({ url: z.string().trim().min(1).max(2048) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const { description: _description, ...problem } =
      await fetchLeetCodeProblem(parsed.data.url);
    return NextResponse.json({ problem });
  } catch (error) {
    if (error instanceof LeetCodeSourceError)
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 422 },
      );
    return NextResponse.json(
      { error: "Zed could not import that problem." },
      { status: 502 },
    );
  }
}
