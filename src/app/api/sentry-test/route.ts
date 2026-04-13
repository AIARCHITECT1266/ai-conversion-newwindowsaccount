import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

// TEMPORAER: Diagnose-Endpoint — prueft ob Sentry SDK korrekt initialisiert ist.
// Gibt JSON mit Init-Status zurueck statt zu werfen.
// NACH Diagnose entfernen.
export async function GET() {
  const client = Sentry.getClient();
  const isInitialized = !!client;
  const dsn = client?.getDsn();
  const dsnString = dsn
    ? `${dsn.protocol}://...@${dsn.host}/${dsn.projectId}`
    : null;

  let captureResult = null;
  let captureError = null;
  let flushResult = null;

  try {
    const eventId = Sentry.captureException(
      new Error(
        "Sentry-Test-Error 13.04.2026 — Pilot-Blocker #2 Verifikation",
      ),
    );
    captureResult = eventId;

    flushResult = await Sentry.flush(5000);
  } catch (e) {
    captureError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    sentry: {
      isInitialized,
      hasClient: !!client,
      dsnFromClient: dsnString,
      captureEventId: captureResult,
      captureError,
      flushSucceeded: flushResult,
    },
    runtime: process.env.NEXT_RUNTIME,
    nodeEnv: process.env.NODE_ENV,
  });
}
