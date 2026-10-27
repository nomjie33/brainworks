import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

// Next.js skips .env.local when NODE_ENV=test, so load it directly (existing variables win, as in CI).
for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

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
