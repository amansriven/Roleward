import type { Metadata } from "next";
import { ResumeIntakeFlow } from "@/components/resume/resume-intake-flow";
export const metadata: Metadata = { title: "Import resume" };
export default function ResumeIntakePage() {
  return (
    <div>
      <ResumeIntakeFlow />
    </div>
  );
}
