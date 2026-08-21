import { LiveDashboard } from "@/components/workspace/live-dashboard";
import { getZedDashboard } from "@/modules/zed/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { attempts } = await getZedDashboard();
  const completed = attempts.filter((attempt) => attempt.completedAt);
  const recognitionRate = completed.length
    ? Math.round(
        (completed.filter((attempt) => attempt.classificationCorrect).length /
          completed.length) *
          100,
      )
    : null;
  const lastCompletedAt =
    completed
      .map((attempt) => attempt.completedAt)
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1) ?? null;
  return (
    <LiveDashboard
      zed={{
        attempts: completed.length,
        solved: completed.filter((attempt) => attempt.solved).length,
        recognitionRate,
        lastCompletedAt,
      }}
    />
  );
}
