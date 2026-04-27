// ============================================================
// Admin-API: Preview-Login-Magic-Link generieren (TD-Pilot-08)
//
// Kurz-lebige Magic-Links (1 Stunde TTL) fuer Admin-unterstuetzten
// Zugriff auf Tenant-Dashboards ueber Vercel-Preview-Subdomains.
//
// Unterschied zum bestehenden `POST /api/admin/tenants/[id]`:
//   - Der Bestands-Endpoint rotiert Tokens mit 72h-TTL (Kunden-
//     Einladungen, script-basierter MOD-Refresh-Flow)
//   - Dieser Endpoint erzeugt 1h-TTL-Links fuer Preview-URL-Logins
//     (Cookie-Domain-Scope-Problem: ai-conversion.ai-Cookie gilt
//     nicht auf *.vercel.app-Subdomains)
//
// Beide Endpoints schreiben in dasselbe Feld `Tenant.dashboardToken`
// (SHA-256-Hash) und `dashboardTokenExpiresAt`. Ein neuer Magic-Link
// invalidiert also einen aelteren — das ist gewollt, weil das
// Feld per-Tenant-unique ist und die kuerzere TTL immer gewinnt.
//
// Auth: Admin-Session ueber Middleware (admin_token-Cookie oder
// Bearer), identisch zu allen anderen /api/admin/*-Routen.
// ADR: siehe docs/discovery-td-pilot-08-admin-magic-link.md
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { db } from "@/shared/db";
import { hashToken } from "@/modules/auth/dashboard-auth";
import { auditLog } from "@/modules/compliance/audit-log";
import { getClientIp } from "@/shared/rate-limit";

// Preview-Login-TTL: 1 Stunde. Inline-Konstante, bewusst getrennt
// von MAGIC_LINK_EXPIRY_MS (72h), weil die Semantik eine andere ist.
const PREVIEW_LOGIN_TTL_MS = 60 * 60 * 1000;

// Optionaler Metadaten-String fuer Audit-Kontext. Default deckt den
// Standard-Use-Case (Vercel-Preview-Login) ab; Script-Aufrufer koennen
// eigene Zwecke angeben (z.B. "mobile-preview", "staging").
const RequestBodySchema = z
  .object({
    purpose: z.string().trim().min(1).max(64).optional(),
  })
  .strip();

const idSchema = z.string().min(1);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: "Ungültige Tenant-ID" }, { status: 400 });
    }

    // Body parsen (leer oder optional { purpose }). Bei invalidem
    // JSON faellt der Endpoint auf das Default-Purpose zurueck —
    // fehlender Body ist kein Fehler.
    let purpose = "preview-login";
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const rawBody: unknown = await request.json();
        const parsed = RequestBodySchema.safeParse(rawBody ?? {});
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Ungültige Eingabe", details: parsed.error.flatten() },
            { status: 400 }
          );
        }
        if (parsed.data.purpose) purpose = parsed.data.purpose;
      } catch {
        // Leerer Body / invalides JSON: Default-Purpose verwenden, kein 400
      }
    }

    // Tenant lesen (Pflicht fuer tenantSlug im Audit-Log-Eintrag
    // und fuer 404-Antwort wenn die ID nicht existiert)
    const tenant = await db.tenant.findUnique({
      where: { id },
      select: { id: true, slug: true, isActive: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant nicht gefunden" }, { status: 404 });
    }

    // Token generieren: 32 Bytes Entropy als Hex-String.
    // Klartext bleibt einmalig in Response, DB speichert nur SHA-256-Hash.
    const rawToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + PREVIEW_LOGIN_TTL_MS);

    await db.tenant.update({
      where: { id },
      data: {
        dashboardToken: hashToken(rawToken),
        dashboardTokenExpiresAt: expiresAt,
      },
    });

    // Audit-Log: IP-Prefix (16 Hex-Zeichen) fuer Forensik, ohne die
    // volle IP zu loggen. Gleiches Pattern wie
    // src/app/api/dashboard/settings/scoring/route.ts:99-100.
    const ip = getClientIp(request);
    const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
    auditLog("admin.magic_link_regenerated", {
      tenantId: tenant.id,
      ip: ipHash,
      details: {
        tenantSlug: tenant.slug,
        expiresInSeconds: Math.round(PREVIEW_LOGIN_TTL_MS / 1000),
        purpose,
      },
    });

    return NextResponse.json({
      loginPath: `/dashboard/login?token=${rawToken}`,
      expiresAt: expiresAt.toISOString(),
      tenantSlug: tenant.slug,
    });
  } catch (error) {
    console.error("[Admin] Magic-Link-Generierung fehlgeschlagen", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
