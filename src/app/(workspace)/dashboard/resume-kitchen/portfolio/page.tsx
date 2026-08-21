import type { Metadata } from "next";
import { ResumeKitchenWorkspace } from "@/components/resume/resume-kitchen-workspace";

export const metadata: Metadata = { title: "Résumé portfolio" };

export default function ResumePortfolioPage() {
  return <ResumeKitchenWorkspace view="portfolio" />;
}
