import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // TMDB serves posters/backdrops/profile photos from this CDN.
    // next/image requires remote image hosts to be explicitly allowed.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
};

export default nextConfig;
