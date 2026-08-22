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

function storageError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "ResourceNotFoundException")
    return NextResponse.json(
      { error: "Workspace table was not found", code: "table_not_found" },
      { status: 503 },
    );
  if (
    name === "UnrecognizedClientException" ||
    name === "InvalidSignatureException" ||
    name === "CredentialsProviderError"
  )
    return NextResponse.json(
      { error: "AWS credentials were rejected", code: "credentials" },
      { status: 503 },
    );
  if (name === "AccessDeniedException")
    return NextResponse.json(
      { error: "AWS denied workspace access", code: "access_denied" },
      { status: 503 },
    );
  return NextResponse.json(
    { error: "Workspace storage failed", code: "storage_error" },
    { status: 503 },
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured)
    return NextResponse.json(
      { error: "Storage is not configured" },
      { status: 503 },
    );
  try {
    const item = await getWorkspace(session.user.id);
    return NextResponse.json({
      owner: session.user.id,
      workspace: item?.workspace ?? emptyWorkspace,
      version: item?.version ?? 0,
      updatedAt: item?.updatedAt ?? null,
    });
  } catch (error) {
    return storageError(error);
  }
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
    return storageError(error);
  }
}
