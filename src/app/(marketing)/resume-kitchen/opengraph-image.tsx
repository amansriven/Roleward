import { ogContentType, ogSize, renderOgCard } from "@/lib/og";

export const alt = "Resume Kitchen — AI resume review and tailoring";
export const size = ogSize;
export const contentType = ogContentType;

export default function OpenGraphImage() {
  return renderOgCard({
    eyebrow: "Resume Kitchen",
    headline: "Tailor your resume",
    accent: "to evidence, not adjectives.",
    footer: "Review · Tailoring · Verified experience",
  });
}
