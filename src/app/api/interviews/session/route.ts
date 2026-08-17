import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { listInterviews, putInterview } from "@/modules/aws/interview-store";
import { getWorkspace } from "@/modules/aws/workspace-store";
import {
  buildInterviewerInstructions,
  resolveRoleTarget,
} from "@/modules/interviews/context";
import { selectProblem } from "@/modules/interviews/coding/problems";
import { nextInterviewerTurn } from "@/modules/interviews/conversation";
import { interviewsConfigured } from "@/modules/interviews/openai";
import {
  interviewConfigSchema,
  interviewSessionSchema,
} from "@/modules/interviews/schema";
import { emptyWorkspace } from "@/modules/workspace/repository";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured) return NextResponse.json({ interviews: [] });
  try {
    return NextResponse.json({
      interviews: await listInterviews(session.user.id),
    });
  } catch {
    return NextResponse.json({ interviews: [] });
  }
}

export async function POST(request: Request) {
  const auth_ = await auth();
  if (!auth_?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!interviewsConfigured)
    return NextResponse.json(
      { error: "Interviews are not configured on this deployment." },
      { status: 503 },
    );
  if (!workspaceStorageConfigured)
    return NextResponse.json(
      { error: "Interview storage is not configured." },
      { status: 503 },
    );

  const parsed = interviewConfigSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "That interview setup is incomplete." },
      { status: 400 },
    );

  const stored = await getWorkspace(auth_.user.id).catch(() => null);
  const workspace = stored?.workspace ?? emptyWorkspace;
  const role = resolveRoleTarget(
    parsed.data.roleTarget,
    workspace.applications,
  );
  if (!role)
    return NextResponse.json(
      { error: "That saved application could not be found." },
      { status: 400 },
    );

  const codingProblem =
    parsed.data.type === "coding"
      ? selectProblem(parsed.data.difficulty ?? "medium")
      : null;

  const instructions = buildInterviewerInstructions({
    config: parsed.data,
    role,
    profile: workspace.profile,
    evidence: workspace.evidence,
    codingProblem,
  });

  const created = interviewSessionSchema.parse({
    id: randomUUID(),
    config: parsed.data,
    status: "in_progress",
    roleLabel: role.label,
    roleDescription: role.description,
    codingProblem,
    turns: [],
    report: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  });

  const opening = await nextInterviewerTurn(created, instructions);
  created.turns.push({
    id: randomUUID(),
    role: "interviewer",
    content: opening.message,
    competency: opening.competency,
    createdAt: new Date().toISOString(),
  });

  await putInterview(auth_.user.id, created);
  return NextResponse.json({ session: created });
}
