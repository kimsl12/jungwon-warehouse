import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin workspace root to this project folder.
  // Without this, Next.js may walk up and pick up a stray lockfile from a
  // parent directory.
  outputFileTracingRoot: path.join(__dirname),

  // The /api/pdf/delivery route reads Korean fonts and the logo from disk
  // at request time via `process.cwd()`. Next.js's tracer can't see these
  // dynamic file reads, so on Vercel they would be missing from the
  // serverless function bundle. Explicitly include them so the route works
  // in production.
  outputFileTracingIncludes: {
    "/api/pdf/delivery": ["./src/fonts/**/*", "./public/jungwon-logo.png"],
  },
};

export default nextConfig;
