import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getInterview } from "@/modules/aws/interview-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured)
    return NextResponse.json(
      { error: "Interview storage is not configured." },
      { status: 503 },
    );
  const { id } = await params;
  const interview = await getInterview(session.user.id, id);
  if (!interview)
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  return NextResponse.json({ session: interview });
}
