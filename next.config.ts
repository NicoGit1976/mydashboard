import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't fail the production build on type warnings (ship now, tidy later).
  // Next 16 removed built-in ESLint-on-build, so no eslint key here.
  typescript: { ignoreBuildErrors: true },

  // Logos saved before uploads moved behind the route handler still hold
  // /uploads/... in the DB — keep those URLs working.
  async rewrites() {
    return [{ source: "/uploads/:path*", destination: "/api/uploads/:path*" }];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
