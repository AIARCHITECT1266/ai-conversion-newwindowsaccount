import { NextResponse } from "next/server";

// TEMPORAERER Debug-Endpoint — zeigt ob Sentry-Env-Vars im Runtime verfuegbar sind.
// NACH Diagnose entfernen. Gibt keine Credentials aus, nur Existenz + Laenge + Praefix.
export async function GET() {
  return NextResponse.json({
    hasServerDsn: !!process.env.SENTRY_DSN,
    hasPublicDsn: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    serverDsnLength: process.env.SENTRY_DSN?.length || 0,
    serverDsnFirst10: process.env.SENTRY_DSN?.substring(0, 10) || null,
    nodeEnv: process.env.NODE_ENV,
    runtime: process.env.NEXT_RUNTIME || "unknown",
  });
}
