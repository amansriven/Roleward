import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getGoal, listGoals, putGoal } from "@/modules/aws/moxie-store";
import {
  addMoxieMilestone,
  createMoxieGoal,
  moxieGoalDraftSchema,
  moxieGoalStatuses,
  removeMoxieMilestone,
  setMoxieGoalStatus,
  sortMoxieGoals,
  withdrawMoxieGoal,
  toggleMoxieMilestone,
} from "@/modules/moxie/goal";

export const runtime = "nodejs";

const unavailable = () =>
  NextResponse.json(
    { error: "Moxie goals are not configured yet." },
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
  const goals = await listGoals(userId).catch(() => null);
  if (!goals)
    return NextResponse.json(
      { error: "Moxie could not read your goals." },
      { status: 502 },
    );
  return NextResponse.json({ goals: sortMoxieGoals(goals) });
}

export async function POST(request: Request) {
  const userId = await requireUser();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured) return unavailable();
  const parsed = moxieGoalDraftSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "That goal could not be read." },
      { status: 400 },
    );
  // Posting from the panel is the user's explicit approval.
  const goal = await putGoal(userId, createMoxieGoal(parsed.data)).catch(
    () => null,
  );
  if (!goal)
    return NextResponse.json(
      { error: "Moxie could not save that goal." },
      { status: 502 },
    );
  return NextResponse.json({ goal }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(moxieGoalStatuses).optional(),
  toggleMilestoneId: z.string().min(1).optional(),
});

export async function PATCH(request: Request) {
  const userId = await requireUser();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured) return unavailable();
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "That change could not be read." },
      { status: 400 },
    );
  const existing = await getGoal(userId, parsed.data.id).catch(() => null);
  if (!existing)
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  let next = existing;
  if (parsed.data.status) next = setMoxieGoalStatus(next, parsed.data.status);
  if (parsed.data.toggleMilestoneId)
    next = toggleMoxieMilestone(next, parsed.data.toggleMilestoneId);
  const saved = await putGoal(userId, next).catch(() => null);
  if (!saved)
    return NextResponse.json(
      { error: "Moxie could not update that goal." },
      { status: 502 },
    );
  return NextResponse.json({ goal: saved });
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(request: Request) {
  const userId = await requireUser();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured) return unavailable();
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Missing goal id." }, { status: 400 });
  const existing = await getGoal(userId, parsed.data.id).catch(() => null);
  if (!existing)
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  // Soft delete: the deployed role cannot DeleteItem, and this keeps goals
  // consistent with memory's auditable removal.
  const removed = await putGoal(userId, withdrawMoxieGoal(existing))
    .then(() => true)
    .catch(() => false);
  if (!removed)
    return NextResponse.json(
      { error: "Moxie could not remove that goal." },
      { status: 502 },
    );
  return NextResponse.json({ ok: true });
}
