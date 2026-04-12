// ============================================================
// POST /api/widget/session
//
// Oeffentlicher Endpoint. Startet eine neue Web-Widget-Session
// fuer einen gegebenen Public Key.
//
// Ablauf:
// 1. Rate-Limit je IP
// 2. Zod-Validierung Body
// 3. resolvePublicKey - nur aktive Tenants mit aktiviertem Widget
// 4. Neue Conversation (channel=WEB, status=ACTIVE) anlegen
// 5. Session-Token zurueckgeben + welcomeMessage
//
// Sicherheit:
// - Kein tenantId im Response
// - ipHash im Audit-Log, niemals Klartext
// - visitorMeta wird als Json? persistiert, nicht geloggt
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { checkRateLimit, getClientIp } from "@/shared/rate-limit";
import { resolvePublicKey } from "@/lib/widget/publicKey";
import { generateSessionToken } from "@/lib/widget/sessionToken";
import { auditLog } from "@/modules/compliance/audit-log";
import { db } from "@/shared/db";
import type { Prisma } from "@/generated/prisma/client";

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
  publicKey: z
    .string()
    .min(4)
    .max(100)
    .regex(/^pub_[A-Za-z0-9_-]+$/, "Ungueltiges Key-Format"),
  // visitorMeta: beliebiges flaches Objekt, nicht tiefer typisiert
  visitorMeta: z.record(z.string(), z.unknown()).optional(),
  // Phase 4-pre: Frontend-Modal kann consentGiven=true vorab senden,
  // dann ueberspringt processMessage den Consent-Dance beim ersten Turn.
  consentGiven: z.boolean().optional(),
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
  const ip = getClientIp(request);

  // Rate-Limit STRENG laut WEB_WIDGET_INTEGRATION.md Phase 3 § 3.3:
  // 10 Sessions/IP/h. Verhindert Session-Flooding durch anonyme
  // Web-Besucher. Strenger als Config (100/h), weil Session-Erstellung
  // mehr Server-Ressourcen kostet (DB-Insert + Token-Generierung).
  const limit = await checkRateLimit(`widget-session:${ip}`, {
    max: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return withCors(
      NextResponse.json(
        { error: "Zu viele Anfragen - bitte spaeter erneut versuchen" },
        { status: 429 },
      ),
    );
  }

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
  const { publicKey, visitorMeta, consentGiven: preConsented } = parseResult.data;

  // Tenant ueber Public Key aufloesen
  const resolved = await resolvePublicKey(publicKey);
  if (!resolved) {
    return withCors(
      NextResponse.json(
        { error: "Widget not found or disabled" },
        { status: 404 },
      ),
    );
  }

  // Neue Conversation anlegen - externalId bleibt null (nur fuer Web erlaubt
  // seit Phase 3a.5), widgetSessionToken ist @unique.
  // Phase 4-pre: Wenn das Frontend den Consent-Dialog UX-seitig vor dem
  // Chat-Start eingeholt hat, sendet es consentGiven=true und wir koennen
  // den Server-seitigen Consent-Dance beim ersten Turn ueberspringen.
  const sessionToken = generateSessionToken();
  const now = new Date();
  const conversation = await db.conversation.create({
    data: {
      tenantId: resolved.tenantId,
      channel: "WEB",
      status: "ACTIVE",
      externalId: null,
      widgetSessionToken: sessionToken,
      widgetVisitorMeta: (visitorMeta ?? undefined) as Prisma.InputJsonValue | undefined,
      consentGiven: preConsented === true,
      consentAt: preConsented === true ? now : null,
      language: "de",
    },
    select: { id: true },
  });

  // Audit-Log (mit IP-Hash, niemals Klartext)
  auditLog("widget.session_started", {
    tenantId: resolved.tenantId,
    details: { conversationId: conversation.id, ipHash: hashIp(ip) },
  });

  // Response: Session-Token, Conversation-ID, Welcome-Message aus Config.
  // KEIN tenantId.
  return withCors(
    NextResponse.json(
      {
        sessionToken,
        conversationId: conversation.id,
        welcomeMessage: resolved.config.welcomeMessage,
      },
      { status: 200 },
    ),
  );
  } catch (error) {
    console.error("[widget/session] Unerwarteter Fehler", error);
    return withCors(
      NextResponse.json(
        { error: "Interner Serverfehler" },
        { status: 500 },
      ),
    );
  }
}
