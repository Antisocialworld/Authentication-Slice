import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly set the Turbopack filesystem root to this project's own
    // directory. Without this, Next auto-detects the root by walking up for a
    // lockfile and picks up a stray pnpm-lock.yaml in a parent directory
    // (C:\Users\SETUP\), which points the root at the wrong folder.
    root: __dirname,
  },
};

export default nextConfig;
