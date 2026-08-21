import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  fetchJobPosting,
  JobSourceError,
} from "@/modules/interviews/job-source";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({ url: z.string().trim().min(1).max(2048) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    return NextResponse.json(await fetchJobPosting(parsed.data.url));
  } catch (error) {
    if (error instanceof JobSourceError)
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 422 },
      );
    return NextResponse.json(
      {
        error:
          "Backstage could not read that link. Paste the description instead.",
      },
      { status: 502 },
    );
  }
}
