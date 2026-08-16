import type { Metadata } from "next";
import { ApplicationIntakeFlow } from "@/components/applications/application-intake-flow";
export const metadata: Metadata = { title: "Add application" };
export default function NewApplicationPage() {
  return <ApplicationIntakeFlow />;
}
