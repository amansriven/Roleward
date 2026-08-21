import type { Metadata } from "next";
import { EvidenceLibrary } from "@/components/resume/evidence-library";

export const metadata: Metadata = { title: "Project evidence" };

export default function EvidenceProjectsPage() {
  return <EvidenceLibrary view="projects" />;
}
