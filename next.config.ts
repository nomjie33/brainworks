import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  // Source maps are uploaded only when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are set.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
