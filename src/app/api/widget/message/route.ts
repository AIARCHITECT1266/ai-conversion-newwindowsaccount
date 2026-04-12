// ============================================================
// POST /api/widget/message
//
// Nimmt eine User-Nachricht aus dem Web-Widget entgegen,
// ruft die kanal-agnostische processMessage() auf und gibt
// 202 Accepted zurueck. Die tatsaechliche Bot-Antwort wird
// vom Widget via /api/widget/poll abgeholt.
//
// processMessage persistiert User- und Bot-Message synchron
// (Decision 3 in docs/decisions/phase-0-decisions.md).
//
// Sicherheit:
// - Session-Token via verifySessionToken (Composite-Validierung
//   Kanal + Status + Alter)
// - Rate-Limit je Session, nicht je IP (Missbrauchs-Surface
//   ist die einzelne Session)
// - ipHash im Audit-Log, niemals Klartext
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { checkRateLimit, getClientIp } from "@/shared/rate-limit";
import { verifySessionToken, hashTokenForRateLimit } from "@/lib/widget/sessionToken";
import { processMessage } from "@/lib/bot/processMessage";
import { auditLog } from "@/modules/compliance/audit-log";
import { db } from "@/shared/db";

// ---------- CORS ----------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

const bodySchema = z.object({
  sessionToken: z
    .string()
    .min(4)
    .max(100)
    .regex(/^ws_[A-Za-z0-9_-]+$/, "Ungueltiges Token-Format"),
  message: z.string().min(1, "Nachricht fehlt").max(4000, "Nachricht zu lang"),
});

// ---------- Hilfsfunktionen ----------

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

// ---------- OPTIONS (CORS Preflight) ----------

export async function OPTIONS(): Promise<NextResponse> {
  return withCors(new NextResponse(null, { status: 204 }));
}

// ---------- POST Handler ----------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
  // Body parsen
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return withCors(
      NextResponse.json({ error: "Ungueltige Eingabe" }, { status: 400 }),
    );
  }

  const parseResult = bodySchema.safeParse(rawBody);
  if (!parseResult.success) {
    return withCors(
      NextResponse.json(
        {
          error: "Ungueltige Eingabe",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      ),
    );
  }
  const { sessionToken, message } = parseResult.data;

  // Rate-Limit je Session: 60 Nachrichten pro Stunde.
  // Token wird gehasht, damit er nicht im Klartext als Cache-Key landet.
  const limit = await checkRateLimit(
    `widget-message:${hashTokenForRateLimit(sessionToken)}`,
    {
      max: 60,
      windowMs: 60 * 60 * 1000,
    },
  );
  if (!limit.allowed) {
    return withCors(
      NextResponse.json(
        { error: "Zu viele Nachrichten - bitte spaeter erneut versuchen" },
        { status: 429 },
      ),
    );
  }

  // Session pruefen (Kanal + Status + Alter)
  const conversation = await verifySessionToken(sessionToken);
  if (!conversation) {
    return withCors(
      NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      ),
    );
  }

  // isNewConversation: erster Turn OHNE vorab erteilten Consent.
  // Phase 4-pre: Wenn das Frontend consentGiven=true an /session geliefert
  // hat, setzen wir isNewConversation=false, damit processMessage den
  // Consent-Dance-Branch ueberspringt und direkt in die normale Bot-Logik
  // geht (Nutzer-Input speichern, Claude aufrufen, Antwort persistieren).
  const messageCount = await db.message.count({
    where: { conversationId: conversation.id },
  });
  const isNewConversation = messageCount === 0 && !conversation.consentGiven;

  // senderIdentifier: gehashter, opaquer String fuer processMessage.
  // SHA-256-Hash des Session-Tokens — stabil zwischen Turns (wie
  // vom Phase-3b.5-Consent-Fix benoetigt), aber kein Bearer-Credential.
  // Defense-in-Depth: spaetere Code-Pfade koennten den senderIdentifier
  // versehentlich loggen oder persistieren — ein Hash ist sicher.
  // Analog zu WhatsApp, wo externalId ein Phone-Hash ist.
  const senderIdentifier = hashTokenForRateLimit(sessionToken);

  // Kanal-agnostische Bot-Logik aufrufen.
  // Signatur exakt wie in src/modules/bot/handler.ts:383-391 gespiegelt.
  await processMessage({
    tenantId: conversation.tenantId,
    channel: "WEB",
    conversationId: conversation.id,
    senderIdentifier,
    message,
    isNewConversation,
    consentGiven: conversation.consentGiven,
  });

  // Audit-Log (Laenge ist nicht sensitiv, Inhalt wird NICHT geloggt)
  auditLog("widget.message_received", {
    tenantId: conversation.tenantId,
    details: {
      conversationId: conversation.id,
      messageLength: message.length,
      ipHash: hashIp(getClientIp(request)),
    },
  });

  // 202 Accepted: Die Bot-Antwort liegt persistiert in der DB,
  // das Widget holt sie via /api/widget/poll ab.
  return withCors(NextResponse.json({ ok: true }, { status: 202 }));
  } catch (error) {
    console.error("[widget/message] Unerwarteter Fehler", error);
    return withCors(
      NextResponse.json(
        { error: "Interner Serverfehler" },
        { status: 500 },
      ),
    );
  }
}
