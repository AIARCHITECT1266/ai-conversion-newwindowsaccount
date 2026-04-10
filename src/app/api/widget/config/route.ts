// ============================================================
// GET /api/widget/config
//
// Oeffentlicher Endpoint fuer das Web-Widget. Liefert zu einem
// gueltigen Public Key NUR nicht-sensitive Tenant-Anzeigedaten
// zurueck (primaryColor, logoUrl, welcomeMessage).
//
// Sicherheitsregeln:
// - Key via Query-Param ?key=pub_xxx
// - Zod-Schema validiert Format strikt
// - Rate-Limit 100/h pro IP (checkRateLimit)
// - CORS: Access-Control-Allow-Origin: * (oeffentlich gewollt)
// - Kein tenantId, keine internen Felder im Response
// - auditLog mit sha256(ip), niemals Klartext-IP
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { checkRateLimit, getClientIp } from "@/shared/rate-limit";
import { resolvePublicKey } from "@/lib/widget/publicKey";
import { auditLog } from "@/modules/compliance/audit-log";

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

// Public-Key-Format: "pub_" + base64url-Zeichen (A-Za-z0-9_-),
// Laenge zwischen 4 und 100 Zeichen gesamt.
const keySchema = z
  .string()
  .min(4)
  .max(100)
  .regex(/^pub_[A-Za-z0-9_-]+$/, "Ungueltiges Key-Format");

// ---------- Hilfsfunktionen ----------

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

// ---------- OPTIONS (CORS Preflight) ----------

export async function OPTIONS(): Promise<NextResponse> {
  // 204 No Content ist der Standard fuer Preflight-Responses.
  return withCors(new NextResponse(null, { status: 204 }));
}

// ---------- GET Handler ----------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request);

  // Rate-Limit: 100 Requests pro Stunde pro IP
  const limit = await checkRateLimit(`widget-config:${ip}`, {
    max: 100,
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

  // Query-Parameter ?key=pub_xxx auslesen und validieren
  const rawKey = request.nextUrl.searchParams.get("key");
  const parseResult = keySchema.safeParse(rawKey);
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
  const publicKey = parseResult.data;

  // Public-Key aufloesen
  const resolved = await resolvePublicKey(publicKey);
  if (!resolved) {
    return withCors(
      NextResponse.json(
        { error: "Widget not found or disabled" },
        { status: 404 },
      ),
    );
  }

  // Audit-Log (mit IP-Hash, niemals Klartext)
  auditLog("widget.config_fetched", {
    tenantId: resolved.tenantId,
    details: { ipHash: hashIp(ip) },
  });

  // Antwort: NUR die 10 nicht-sensitiven Config-Felder,
  // KEIN tenantId, keine internen Felder.
  return withCors(
    NextResponse.json(
      {
        backgroundColor: resolved.config.backgroundColor,
        primaryColor: resolved.config.primaryColor,
        accentColor: resolved.config.accentColor,
        textColor: resolved.config.textColor,
        mutedTextColor: resolved.config.mutedTextColor,
        logoUrl: resolved.config.logoUrl,
        botName: resolved.config.botName,
        botSubtitle: resolved.config.botSubtitle,
        welcomeMessage: resolved.config.welcomeMessage,
        avatarInitials: resolved.config.avatarInitials,
      },
      { status: 200 },
    ),
  );
}
