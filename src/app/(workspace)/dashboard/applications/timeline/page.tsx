import type { Metadata } from "next";
import { ApplicationTimeline } from "@/components/applications/application-insights";

export const metadata: Metadata = { title: "Application timeline" };

export default function ApplicationTimelinePage() {
  return <ApplicationTimeline />;
}
