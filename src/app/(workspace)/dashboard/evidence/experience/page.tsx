import type { Metadata } from "next";
import { EvidenceLibrary } from "@/components/resume/evidence-library";

export const metadata: Metadata = { title: "Experience evidence" };

export default function EvidenceExperiencePage() {
  return <EvidenceLibrary view="experience" />;
}
