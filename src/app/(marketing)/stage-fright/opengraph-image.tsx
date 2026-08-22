import { ogContentType, ogSize, renderOgCard } from "@/lib/og";

export const alt = "Stage Fright — AI mock interviews and behavioral practice";
export const size = ogSize;
export const contentType = ogContentType;

export default function OpenGraphImage() {
  return renderOgCard({
    eyebrow: "Stage Fright",
    headline: "Rehearse the interview",
    accent: "before it counts.",
    footer: "Mock interviews · Behavioral practice · Feedback",
  });
}
