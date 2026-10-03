import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Fail fast at server start with a readable message if configuration is wrong.
  const { getEnv } = await import("@/lib/env");
  getEnv();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
