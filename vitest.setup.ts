import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { config as loadEnv } from "dotenv";
import { afterEach } from "vitest";

// Load .env.local for integration tests that need Supabase credentials.
// `override: false` so explicit shell env wins (useful in CI).
loadEnv({ path: ".env.local", override: false, quiet: true });

afterEach(() => {
  cleanup();
});
