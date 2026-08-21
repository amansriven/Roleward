import type { Metadata } from "next";
import { EvidenceLibrary } from "@/components/resume/evidence-library";

export const metadata: Metadata = { title: "Education evidence" };

export default function EvidenceEducationPage() {
  return <EvidenceLibrary view="education" />;
}
