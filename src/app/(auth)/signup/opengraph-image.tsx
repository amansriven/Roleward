import { ogContentType, ogSize, renderOgCard } from "@/lib/og";

export const alt = "Create your Roleward workspace";
export const size = ogSize;
export const contentType = ogContentType;

export default async function OpenGraphImage() {
  return renderOgCard({
    eyebrow: "Get started",
    headline: "Create your workspace.",
    accent: "Bring your job search with you.",
    footer: "Free to start · No credit card",
  });
}
