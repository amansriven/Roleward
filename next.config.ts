import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  // OG cards read their font and lockup files at render time; without this the
  // tracer prunes them and the lambda throws ENOENT on a missing font.
  outputFileTracingIncludes: {
    "/*": ["assets/og/**/*"],
  },
};

export default nextConfig;
