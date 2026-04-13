// Test-Endpoint fuer Sentry-Verifikation.
// Loest NUR in Production einen Sentry-Event aus (siehe enabled-Flag in sentry.server.config.ts).
// Nach erfolgreicher Verifikation kann dieser Endpoint entfernt werden.
export async function GET() {
  throw new Error("Sentry-Test-Error 13.04.2026 — Pilot-Blocker #2 Verifikation");
}
