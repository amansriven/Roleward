import { ogContentType, ogSize, renderOgCard } from "@/lib/og";

export const alt =
  "Roleward — one contextualized AI workspace for your entire job search";
export const size = ogSize;
export const contentType = ogContentType;

export default async function OpenGraphImage() {
  return renderOgCard({
    eyebrow: "Move forward · Go further",
    headline: "Your entire job search.",
    accent: "One contextualized AI workspace.",
    footer: "Applications · Resume · Coding · Interviews",
  });
}
