import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    unoptimized: true,
  },
  // Handle font loading issues during build
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
