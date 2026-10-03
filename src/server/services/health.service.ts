import { getEnv } from "@/lib/env";
import { pingDatabase } from "@/server/repositories/health.repository";

export type HealthReport = {
  status: "ok" | "error";
  db: "ok" | "error";
  version: string;
};

export function getAppVersion(): string {
  return getEnv().VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";
}

export async function getHealth(): Promise<HealthReport> {
  const version = getAppVersion();
  try {
    const dbOk = await pingDatabase();
    return { status: dbOk ? "ok" : "error", db: dbOk ? "ok" : "error", version };
  } catch (error) {
    console.error("Health check: database ping failed", error);
    return { status: "error", db: "error", version };
  }
}
