// ============================================================
// GET + PATCH /api/dashboard/widget-config
//
// Dashboard-seitiges Lesen und Aendern der Widget-Config eines
// Tenants. GET liefert den aktuellen Zustand inkl. aufgefuellter
// Defaults, PATCH nimmt partielle Updates an und merged sie mit
// der bestehenden Config.
//
// Auth: getDashboardTenant() aus dem Dashboard-Auth-Modul.
// Plan-Gating: hasPlanFeature(paddlePlan, "web_widget") — Starter
// bekommt 403.
// Tenant-Isolation: tenantId kommt IMMER aus der Auth-Session,
// niemals aus dem Request-Body.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { hasPlanFeature } from "@/lib/plan-limits";
import { parseConfig, DEFAULT_CONFIG } from "@/lib/widget/publicKey";
import { auditLog } from "@/modules/compliance/audit-log";
import { getClientIp } from "@/shared/rate-limit";
import { detectPlanType } from "@/modules/bot/system-prompts";
import { db } from "@/shared/db";

// ---------- Hilfsfunktionen ----------

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

// Plan-Gating via hasPlanFeature() statt checkLimit(..., 'web_widget'):
// Spec WEB_WIDGET_INTEGRATION.md Phase 6 schrieb checkLimit vor, aber
// checkLimit ist Count-basiert (Quota), nicht Feature-Flag-basiert.
// hasPlanFeature ist die semantisch korrekte Trennung. Begruendung im
// ADR: docs/decisions/phase-6-dashboard-widget.md Sektion
// "Feature-Flag-Helper-Split".
function forbidIfFeatureUnavailable(
  paddlePlan: string | null,
): NextResponse | null {
  if (!hasPlanFeature(paddlePlan, "web_widget")) {
    return NextResponse.json(
      {
        error: "Web-Widget ist ab dem Growth-Plan verfuegbar",
        code: "plan_upgrade_required",
      },
      { status: 403 },
    );
  }
  return null;
}

// ---------- Zod-Schema fuer PATCH ----------

// Hex-Farben exakt im 6-stelligen Format (#RRGGBB), identisch zur
// Validierung in src/lib/widget/publicKey.ts parseHexColor().
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

// URL-Validierung: https/http-absolute oder same-origin-Pfad.
// Wir akzeptieren String mit einfacher Shape-Pruefung, statt z.url()
// zu nehmen, weil z.url() keine same-origin-Pfade zulaesst.
function isValidLogoUrl(raw: string | null | undefined): boolean {
  if (raw === null || raw === undefined) return true;
  if (typeof raw !== "string" || raw.length === 0) return false;
  return (
    raw.startsWith("https://") ||
    raw.startsWith("http://") ||
    raw.startsWith("/")
  );
}

// PATCH-Body: alle Felder optional, Partial Update.
// bubbleIconUrl ist Phase-6.2 bewusst nicht editierbar und wird
// daher auch nicht im Schema akzeptiert (siehe ADR).
const updateConfigSchema = z
  .object({
    backgroundColor: z.string().regex(HEX_COLOR_RE).optional(),
    primaryColor: z.string().regex(HEX_COLOR_RE).optional(),
    accentColor: z.string().regex(HEX_COLOR_RE).optional(),
    textColor: z.string().regex(HEX_COLOR_RE).optional(),
    mutedTextColor: z.string().regex(HEX_COLOR_RE).optional(),
    logoUrl: z.string().nullable().optional(),
    botName: z.string().min(1).max(50).optional(),
    botSubtitle: z.string().min(0).max(100).optional(),
    welcomeMessage: z.string().min(1).max(500).optional(),
    avatarInitials: z.string().min(1).max(3).optional(),
  })
  .refine((d) => isValidLogoUrl(d.logoUrl), {
    message: "Ungueltiges logoUrl-Format",
    path: ["logoUrl"],
  });

// ---------- GET Handler ----------

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Plan-Gating: Starter kann den Endpoint aufrufen, bekommt aber
  // ein 403 mit klarer Upgrade-Meldung. Die UI zeigt dann statt der
  // Settings den Upgrade-Prompt.
  const forbidden = forbidIfFeatureUnavailable(tenant.paddlePlan);
  if (forbidden) return forbidden;

  const data = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      webWidgetEnabled: true,
      webWidgetPublicKey: true,
      webWidgetConfig: true,
    },
  });

  if (!data) {
    return NextResponse.json({ error: "Tenant nicht gefunden" }, { status: 404 });
  }

  // Config defensiv parsen, mit Defaults auffuellen — der Editor
  // braucht fuer jedes Feld einen sinnvollen Startwert.
  const parsedConfig = parseConfig(data.webWidgetConfig);

  return NextResponse.json({
    enabled: data.webWidgetEnabled,
    publicKey: data.webWidgetPublicKey,
    config: parsedConfig,
    defaults: DEFAULT_CONFIG,
    plan: detectPlanType(tenant.paddlePlan),
    featureAvailable: true,
  });
}

// ---------- PATCH Handler ----------

export async function PATCH(req: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const forbidden = forbidIfFeatureUnavailable(tenant.paddlePlan);
  if (forbidden) return forbidden;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungueltige Eingabe" }, { status: 400 });
  }

  const parseResult = updateConfigSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Ungueltige Eingabe",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  // Bestehende Config laden und partiell mergen.
  const existing = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: { webWidgetConfig: true },
  });

  const currentConfig =
    existing?.webWidgetConfig && typeof existing.webWidgetConfig === "object"
      ? (existing.webWidgetConfig as Record<string, unknown>)
      : {};

  const mergedConfig = { ...currentConfig, ...parseResult.data };

  await db.tenant.update({
    where: { id: tenant.id },
    data: { webWidgetConfig: mergedConfig },
  });

  // Audit-Log: nur Action + tenantId + Liste der geaenderten Feld-Namen.
  // Keine Werte (auch nicht Hex-Farben), keine publicKey-Bezug.
  auditLog("widget.config_updated", {
    tenantId: tenant.id,
    ip: hashIp(getClientIp(req)),
    details: { fieldsChanged: Object.keys(parseResult.data) },
  });

  return NextResponse.json({ success: true, config: parseConfig(mergedConfig) });
}
