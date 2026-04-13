import * as Sentry from "@sentry/nextjs";

// Test-Endpoint fuer Sentry-Verifikation.
// Loest NUR in Production einen Sentry-Event aus (siehe enabled-Flag in sentry.server.config.ts).
// Sentry.flush() ist KRITISCH in Vercel Serverless — Functions terminieren
// sonst bevor der Sentry-HTTP-Call abgeschlossen ist.
// Nach erfolgreicher Verifikation kann dieser Endpoint entfernt werden.
export async function GET() {
  try {
    throw new Error("Sentry-Test-Error 13.04.2026 — Pilot-Blocker #2 Verifikation");
  } catch (e) {
    Sentry.captureException(e);
    await Sentry.flush(2000);
    throw e;
  }
}
