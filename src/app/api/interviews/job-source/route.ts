import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  fetchJobDescription,
  JobSourceError,
} from "@/modules/interviews/job-source";

export const runtime = "nodejs";

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
    const description = await fetchJobDescription(parsed.data.url);
    return NextResponse.json({ description });
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
