import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withSentryConfig(nextConfig, {
  org: "ai-conversion",
  project: "ai-conversion-web",

  // Source-Maps NICHT zu Sentry uploaden (Free-Tier sparen, spaeter aktivieren)
  // Siehe docs/tech-debt.md TD-Monitoring-02
  sourcemaps: {
    disable: true,
  },

  // Debug-Logging deaktivieren
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
