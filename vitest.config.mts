import path from "node:path";
import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";

// Loads .env.local / .env the same way Next.js does.
nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/domain/**"],
    },
  },
});
