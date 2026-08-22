import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getMemory, listMemories, putMemory } from "@/modules/aws/moxie-store";
import {
  createMoxieMemory,
  moxieMemoryDraftSchema,
  withdrawMoxieMemory,
} from "@/modules/moxie/memory";

export const runtime = "nodejs";

const unavailable = () =>
  NextResponse.json(
    { error: "Moxie memory is not configured yet." },
    { status: 503 },
  );

async function requireUser() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await requireUser();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured) return unavailable();
  const memories = await listMemories(userId).catch(() => null);
  if (!memories)
    return NextResponse.json(
      { error: "Moxie could not read your memory." },
      { status: 502 },
    );
  return NextResponse.json({ memories });
}

export async function POST(request: Request) {
  const userId = await requireUser();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured) return unavailable();
  const parsed = moxieMemoryDraftSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "That memory could not be read." },
      { status: 400 },
    );
  // Reaching this route is the user's approval; nothing is stored unprompted.
  const memory = createMoxieMemory(parsed.data);
  const saved = await putMemory(userId, memory).catch(() => null);
  if (!saved)
    return NextResponse.json(
      { error: "Moxie could not save that memory." },
      { status: 502 },
    );
  return NextResponse.json({ memory: saved }, { status: 201 });
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(request: Request) {
  const userId = await requireUser();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured) return unavailable();
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Missing memory id." }, { status: 400 });
  const existing = await getMemory(userId, parsed.data.id).catch(() => null);
  if (!existing)
    return NextResponse.json({ error: "Memory not found." }, { status: 404 });
  // Soft delete keeps the record auditable, per the spec's memory model.
  const saved = await putMemory(userId, withdrawMoxieMemory(existing)).catch(
    () => null,
  );
  if (!saved)
    return NextResponse.json(
      { error: "Moxie could not remove that memory." },
      { status: 502 },
    );
  return NextResponse.json({ memory: saved });
}
