import type { Metadata } from "next";
import { CompanyResearchWorkspace } from "@/components/applications/company-research";

export const metadata: Metadata = { title: "Company research" };

export default function CompanyResearchPage() {
  return <CompanyResearchWorkspace />;
}
