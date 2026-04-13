import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // KEIN Tracing (DSGVO + Free-Tier)
  tracesSampleRate: 0,

  // Nur in Production aktiv
  enabled: process.env.NODE_ENV === "production",

  // PII-Minimierung (keine IP, keine Cookies)
  sendDefaultPii: false,
});
