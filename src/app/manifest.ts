import type { MetadataRoute } from "next";

import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0f1116",
    theme_color: "#0f1116",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/roleward-logo.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
