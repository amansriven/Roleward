import type { Metadata } from "next";
import { ResumeKitchenWorkspace } from "@/components/resume/resume-kitchen-workspace";

export const metadata: Metadata = { title: "Tailor resume" };

export default function ResumeTailorPage() {
  return <ResumeKitchenWorkspace view="tailor" />;
}
