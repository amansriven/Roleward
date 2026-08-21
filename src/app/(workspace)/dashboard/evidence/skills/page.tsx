import type { Metadata } from "next";
import { EvidenceLibrary } from "@/components/resume/evidence-library";

export const metadata: Metadata = { title: "Skills evidence" };

export default function EvidenceSkillsPage() {
  return <EvidenceLibrary view="skills" />;
}
