import type { Metadata } from "next";
import { ApplicationProgress } from "@/components/applications/application-insights";

export const metadata: Metadata = { title: "Application progress" };

export default function ApplicationProgressPage() {
  return <ApplicationProgress />;
}
