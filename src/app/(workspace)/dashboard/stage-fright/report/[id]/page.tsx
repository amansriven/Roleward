import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { InterviewReportView } from "@/components/interviews/interview-report";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getInterview } from "@/modules/aws/interview-store";

export default async function InterviewReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard/stage-fright");
  if (!workspaceStorageConfigured) notFound();
  const { id } = await params;
  const interview = await getInterview(session.user.id, id);
  if (!interview) notFound();
  return <InterviewReportView session={interview} />;
}
