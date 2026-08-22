import { ogContentType, ogSize, renderOgCard } from "@/lib/og";

export const alt = "Roleward pricing";
export const size = ogSize;
export const contentType = ogContentType;

export default function OpenGraphImage() {
  return renderOgCard({
    eyebrow: "Pricing",
    headline: "Start free.",
    accent: "Upgrade when it pays off.",
    footer: "Applications · Resume · Coding · Interviews",
  });
}
