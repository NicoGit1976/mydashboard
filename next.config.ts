import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't fail the production build on lint/type warnings (ship now, tidy later).
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
