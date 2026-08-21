import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

const publicRoutes = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
  { path: "/resume-kitchen", changeFrequency: "monthly", priority: 0.9 },
  { path: "/stage-fright", changeFrequency: "monthly", priority: 0.9 },
  { path: "/zed", changeFrequency: "monthly", priority: 0.9 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  }));
}
