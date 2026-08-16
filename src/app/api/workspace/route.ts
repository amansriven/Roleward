import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getWorkspace, putWorkspace } from "@/modules/aws/workspace-store";
import {
  emptyWorkspace,
  workspaceSnapshotSchema,
} from "@/modules/workspace/repository";

export const runtime = "nodejs";
const maximumWorkspaceBytes = 350_000;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured)
    return NextResponse.json(
      { error: "Storage is not configured" },
      { status: 503 },
    );
  const item = await getWorkspace(session.user.id);
  return NextResponse.json({
    workspace: item?.workspace ?? emptyWorkspace,
    version: item?.version ?? 0,
    updatedAt: item?.updatedAt ?? null,
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured)
    return NextResponse.json(
      { error: "Storage is not configured" },
      { status: 503 },
    );
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maximumWorkspaceBytes)
    return NextResponse.json(
      { error: "Workspace is too large" },
      { status: 413 },
    );
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = workspaceSnapshotSchema.safeParse(
    (body as { workspace?: unknown }).workspace,
  );
  const version = (body as { version?: unknown }).version;
  if (!parsed.success || !Number.isInteger(version) || Number(version) < 0)
    return NextResponse.json({ error: "Invalid workspace" }, { status: 400 });
  try {
    const item = await putWorkspace(
      session.user.id,
      parsed.data,
      Number(version),
    );
    return NextResponse.json({
      version: item.version,
      updatedAt: item.updatedAt,
    });
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException)
      return NextResponse.json(
        { error: "Workspace changed on another device" },
        { status: 409 },
      );
    throw error;
  }
}
