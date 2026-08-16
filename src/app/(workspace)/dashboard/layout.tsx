import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/dashboard");
  return <WorkspaceShell user={session.user}>{children}</WorkspaceShell>;
}
