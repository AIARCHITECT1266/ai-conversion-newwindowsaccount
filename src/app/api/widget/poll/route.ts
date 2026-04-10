// ============================================================
// GET /api/widget/poll
//
// Holt neue Nachrichten einer Widget-Session ab.
// Das Widget pollt periodisch (alle ~2 Sek laut Spec),
// daher KEIN Audit-Log je Request - wuerde Logs fluten.
//
// Query-Parameter:
//   token : Widget-Session-Token (ws_xxx)
//   since : optional, Unix-Millisekunden. Nur Nachrichten mit
//           timestamp > since werden zurueckgegeben.
//
// Sicherheit:
// - verifySessionToken prueft Token + Kanal + Status + Alter
// - Messages werden entschluesselt serialisiert
// - role === "SYSTEM" wird herausgefiltert (interne Markierungen)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/shared/rate-limit";
import { verifySessionToken, hashTokenForRateLimit } from "@/lib/widget/sessionToken";
import { decryptText } from "@/modules/encryption/aes";
import { db } from "@/shared/db";

// ---------- CORS ----------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// ---------- Zod-Schema ----------

const tokenSchema = z
  .string()
  .min(4)
  .max(100)
  .regex(/^ws_[A-Za-z0-9_-]+$/, "Ungueltiges Token-Format");

// since kommt als String aus searchParams, wird manuell zu Number konvertiert
const sinceSchema = z
  .number()
  .int()
  .nonnegative()
  .optional();

// ---------- OPTIONS (CORS Preflight) ----------

export async function OPTIONS(): Promise<NextResponse> {
  return withCors(new NextResponse(null, { status: 204 }));
}

// ---------- GET Handler ----------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rawToken = request.nextUrl.searchParams.get("token");
  const rawSince = request.nextUrl.searchParams.get("since");

  // Token validieren
  const tokenResult = tokenSchema.safeParse(rawToken);
  if (!tokenResult.success) {
    return withCors(
      NextResponse.json(
        { error: "Ungueltige Eingabe", details: tokenResult.error.flatten() },
        { status: 400 },
      ),
    );
  }
  const token = tokenResult.data;

  // since? optional, als Number parsen
  let since: number | undefined;
  if (rawSince !== null) {
    const parsed = Number(rawSince);
    const sinceResult = sinceSchema.safeParse(
      Number.isFinite(parsed) ? parsed : undefined,
    );
    if (!sinceResult.success) {
      return withCors(
        NextResponse.json(
          { error: "Ungueltiges since-Parameter" },
          { status: 400 },
        ),
      );
    }
    since = sinceResult.data;
  }

  // Rate-Limit: 3600/h = ca. 1/Sek. Key per gehashtem Token,
  // damit der Klartext-Token nicht im Upstash-Cache landet.
  const limit = await checkRateLimit(
    `widget-poll:${hashTokenForRateLimit(token)}`,
    {
      max: 3600,
      windowMs: 60 * 60 * 1000,
    },
  );
  if (!limit.allowed) {
    return withCors(
      NextResponse.json(
        { error: "Zu viele Poll-Requests" },
        { status: 429 },
      ),
    );
  }

  // Session pruefen
  const conversation = await verifySessionToken(token);
  if (!conversation) {
    return withCors(
      NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      ),
    );
  }

  // Messages laden. timestamp > since falls gesetzt.
  const sinceDate = since !== undefined ? new Date(since) : undefined;
  const rawMessages = await db.message.findMany({
    where: {
      conversationId: conversation.id,
      ...(sinceDate ? { timestamp: { gt: sinceDate } } : {}),
      role: { not: "SYSTEM" },
    },
    orderBy: { timestamp: "asc" },
  });

  // Entschluesseln und fuer das Widget serialisieren
  const messages = rawMessages.map((m) => ({
    id: m.id,
    role: m.role === "USER" ? "user" : "assistant",
    content: decryptText(m.contentEncrypted),
    timestamp: m.timestamp.getTime(),
  }));

  return withCors(
    NextResponse.json(
      {
        messages,
        conversationStatus: conversation.status,
      },
      { status: 200 },
    ),
  );
}
