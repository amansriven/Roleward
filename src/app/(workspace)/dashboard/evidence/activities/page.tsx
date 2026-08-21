import type { Metadata } from "next";
import { EvidenceLibrary } from "@/components/resume/evidence-library";

export const metadata: Metadata = { title: "Activity evidence" };

export default function EvidenceActivitiesPage() {
  return <EvidenceLibrary view="activities" />;
}
