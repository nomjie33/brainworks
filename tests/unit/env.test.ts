import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("accepts a valid configuration and defaults feature flags to false", () => {
    const env = parseEnv({ DATABASE_URL: "postgresql://user:pass@localhost:5432/brainworks" });
    expect(env.DATABASE_URL).toContain("localhost");
    expect(env.FLAG_PUBLIC_ENROLLMENT).toBe(false);
    expect(env.FLAG_TUTOR_PORTAL).toBe(false);
    expect(env.FLAG_ADMIN_PORTAL).toBe(false);
  });

  it("fails with a clear message when DATABASE_URL is missing", () => {
    expect(() => parseEnv({})).toThrow(EnvError);
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({})).toThrow(/\.env\.example/);
  });

  it("fails when DATABASE_URL is not a PostgreSQL URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "mysql://localhost/db" })).toThrow(/PostgreSQL/);
  });

  it("reads feature flags", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://localhost/db",
      FLAG_PUBLIC_ENROLLMENT: "true",
    });
    expect(env.FLAG_PUBLIC_ENROLLMENT).toBe(true);
  });

  it("treats an empty SENTRY_DSN as unset", () => {
    const env = parseEnv({ DATABASE_URL: "postgresql://localhost/db", SENTRY_DSN: "" });
    expect(env.SENTRY_DSN).toBeUndefined();
  });
});
