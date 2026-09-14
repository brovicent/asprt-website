import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/video-stream/:path*",
        destination: "http://127.0.0.1:8080/:path*", // Proxy to Python DASH server
      },
    ];
  },
};

export default nextConfig;
