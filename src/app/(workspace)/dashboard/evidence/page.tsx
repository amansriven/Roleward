import type { Metadata } from "next";
import { EvidenceLibrary } from "@/components/resume/evidence-library";
export const metadata: Metadata = { title: "Evidence Library" };
export default function EvidencePage() {
  return <EvidenceLibrary view="overview" />;
}
