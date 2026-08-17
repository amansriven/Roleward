import "server-only";

import { getWorkspace } from "@/modules/aws/workspace-store";
import { emptyWorkspace } from "@/modules/workspace/repository";
import { buildInterviewerInstructions } from "./context";
import type { InterviewSession } from "./schema";

/**
 * Rebuilds interviewer instructions for an in-flight session. The role is read
 * from the session itself so a later workspace edit cannot change the interview
 * mid-run; profile and evidence are read fresh.
 */
export async function instructionsForSession(
  userId: string,
  session: InterviewSession,
) {
  const stored = await getWorkspace(userId).catch(() => null);
  const workspace = stored?.workspace ?? emptyWorkspace;
  return buildInterviewerInstructions({
    config: session.config,
    role: { label: session.roleLabel, description: session.roleDescription },
    profile: workspace.profile,
    evidence: workspace.evidence,
    codingProblem: session.codingProblem,
  });
}
