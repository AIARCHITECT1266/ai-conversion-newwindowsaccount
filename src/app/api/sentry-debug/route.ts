import { NextResponse } from "next/server";

// TEMPORAERER Debug-Endpoint — Char-Level-Diagnose fuer DSN-Quoting-Bug.
// NACH Diagnose entfernen.
export async function GET() {
  const dsn = process.env.SENTRY_DSN || "";
  const publicDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || "";

  return NextResponse.json({
    serverDsn: {
      length: dsn.length,
      first15: dsn.substring(0, 15),
      last15: dsn.substring(dsn.length - 15),
      // Char-Codes der ersten 5 Zeichen — zeigt versteckte Whitespaces/Quotes
      first5CharCodes: Array.from(dsn.substring(0, 5)).map((c) => c.charCodeAt(0)),
      // Char-Codes der letzten 5 Zeichen
      last5CharCodes: Array.from(dsn.substring(dsn.length - 5)).map((c) => c.charCodeAt(0)),
      // Hat es Quotes irgendwo?
      hasQuotes: dsn.includes('"') || dsn.includes("'"),
      // Hat es Whitespaces?
      hasLeadingWhitespace: /^\s/.test(dsn),
      hasTrailingWhitespace: /\s$/.test(dsn),
      // Hat es Newlines?
      hasNewlines: dsn.includes("\n") || dsn.includes("\r"),
    },
    publicDsn: {
      length: publicDsn.length,
      first15: publicDsn.substring(0, 15),
      last15: publicDsn.substring(publicDsn.length - 15),
      first5CharCodes: Array.from(publicDsn.substring(0, 5)).map((c) => c.charCodeAt(0)),
      hasQuotes: publicDsn.includes('"') || publicDsn.includes("'"),
    },
    nodeEnv: process.env.NODE_ENV,
    runtime: process.env.NEXT_RUNTIME || "unknown",
  });
}
