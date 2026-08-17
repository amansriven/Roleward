import { Suspense } from "react";
import { InterviewSetup } from "@/components/interviews/interview-setup";

export default function NewInterviewPage() {
  return (
    <Suspense fallback={null}>
      <InterviewSetup />
    </Suspense>
  );
}
