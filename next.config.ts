import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second dev instance (e.g. for integration tests) use its own build folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
