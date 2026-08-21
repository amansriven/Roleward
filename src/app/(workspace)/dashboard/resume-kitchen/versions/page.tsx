import type { Metadata } from "next";
import { ResumeKitchenWorkspace } from "@/components/resume/resume-kitchen-workspace";

export const metadata: Metadata = { title: "Resume versions" };

export default function ResumeVersionsPage() {
  return <ResumeKitchenWorkspace view="versions" />;
}
