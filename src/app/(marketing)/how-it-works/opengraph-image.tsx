import { ogContentType, ogSize, renderOgCard } from "@/lib/og";

export const alt = "How Roleward works";
export const size = ogSize;
export const contentType = ogContentType;

export default async function OpenGraphImage() {
  return renderOgCard({
    eyebrow: "How it works",
    headline: "One target role.",
    accent: "Every tool pointed at it.",
    footer: "Source material · Target job · Focused route",
  });
}
