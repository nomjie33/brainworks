import { afterAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { endPool } from "@/server/repositories/health.repository";

// Requires DATABASE_URL pointing at a reachable Postgres (docker compose up, or a Neon branch).
afterAll(async () => {
  await endPool();
});

describe("GET /api/health", () => {
  it("returns 200 with status ok and db ok", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", db: "ok" });
  });
});
