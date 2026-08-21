import "server-only";

import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { listAttempts } from "@/modules/aws/practice-store";
import { summarizeMastery } from "@/modules/zed/practice";
import { aggregateSkills } from "@/modules/zed/skills";

export async function getZedDashboard() {
  const session = await auth();
  const attempts =
    session?.user?.id && workspaceStorageConfigured
      ? await listAttempts(session.user.id).catch(() => [])
      : [];
  const mastery = summarizeMastery(
    attempts.map((attempt) => ({
      archetypeId: attempt.archetypeId,
      classificationCorrect: attempt.classificationCorrect,
      solved: attempt.solved,
      hintsUsed: attempt.hintsUsed,
      completedAt: attempt.completedAt,
    })),
  );
  const skills = aggregateSkills(
    attempts.map((attempt) => ({
      archetypeId: attempt.archetypeId,
      difficulty: attempt.difficulty,
      classificationCorrect: attempt.classificationCorrect,
      complexityCorrect: attempt.complexityCorrect,
      edgeCasesScore: attempt.edgeCasesScore,
      solved: attempt.solved,
      hintsUsed: attempt.hintsUsed,
      runs: attempt.runs,
      completedAt: attempt.completedAt,
    })),
  );
  return { attempts, mastery, skills };
}
