import { ogContentType, ogSize, renderOgCard } from "@/lib/og";

export const alt = "Zed — role-aware coding interview practice";
export const size = ogSize;
export const contentType = ogContentType;

export default async function OpenGraphImage() {
  return renderOgCard({
    eyebrow: "Zed · Coding practice",
    headline: "Practice the thinking,",
    accent: "not just the answer.",
    footer: "Role-aware problems · Hints · Feedback",
  });
}
