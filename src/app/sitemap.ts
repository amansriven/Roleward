import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

const publicRoutes = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
  { path: "/resume-kitchen", changeFrequency: "monthly", priority: 0.9 },
  { path: "/stage-fright", changeFrequency: "monthly", priority: 0.9 },
  { path: "/zed", changeFrequency: "monthly", priority: 0.9 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.7 },
  { path: "/login", changeFrequency: "monthly", priority: 0.6 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
