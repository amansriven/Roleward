import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
