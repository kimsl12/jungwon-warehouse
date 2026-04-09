import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin workspace root to this project folder.
  // Without this, Next.js may walk up and pick up a stray lockfile from a
  // parent directory.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
