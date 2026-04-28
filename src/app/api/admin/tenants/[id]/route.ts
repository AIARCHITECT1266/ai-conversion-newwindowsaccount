// ============================================================
// Admin-API: Einzelnen Tenant lesen und aktualisieren
// GET: Tenant-Details inkl. systemPrompt (ohne dashboardToken)
// PATCH: Tenant-Einstellungen ändern
// POST: Dashboard-Token neu generieren
// Authentifizierung: via Middleware (Bearer-Token / Cookie)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/shared/db";
import { hashToken, MAGIC_LINK_EXPIRY_MS } from "@/modules/auth/dashboard-auth";
import { auditLog } from "@/modules/compliance/audit-log";
import { generatePublicKey } from "@/lib/widget/publicKey";
import { hasPlanFeature } from "@/lib/plan-limits";
import { QualificationLabelsSchema } from "@/modules/bot/scoring";
import { getClientIp } from "@/shared/rate-limit";
import { invalidateTenantCache } from "@/modules/tenant/resolver";

// Oeffentliche Felder fuer API-Responses (ohne dashboardToken!)
const TENANT_PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  whatsappPhoneId: true,
  systemPrompt: true,
  brandName: true,
  brandColor: true,
  retentionDays: true,
  paddlePlan: true,
  webWidgetEnabled: true,
  webWidgetPublicKey: true,
  webWidgetConfig: true,
  isActive: true,
  createdAt: true,
} as const;

// Erlaubte paddlePlan-Werte (muss mit detectPlanType() kompatibel sein)
const ALLOWED_PLANS = [
  "starter",
  "growth_monthly",
  "growth_yearly",
  "professional_monthly",
  "professional_yearly",
] as const;

// Zod-Schema fuer PATCH-Body
const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  brandName: z.string().min(1).max(255).optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  retentionDays: z.number().int().min(1).max(3650).optional(),
  systemPrompt: z.string().max(30000).optional(),
  paddlePlan: z.enum(ALLOWED_PLANS).nullable().optional(),
  webWidgetEnabled: z.boolean().optional(),
  // Partielles Config-Update — wird serverseitig in bestehendes JSON gemergt,
  // damit andere Config-Felder (primaryColor, logoUrl etc.) nicht verloren gehen.
  //
  // botName/botSubtitle/avatarInitials: redundante Felder zum Dashboard-
  // Widget-Config-Endpoint, hier bewusst dupliziert fuer API-basierten
  // Tenant-Seed (z.B. seed-mod-education-prompts.ts), bei dem der
  // Dashboard-Magic-Link noch nicht verteilt wurde.
  //
  // leadType: Tenant-Klassifikation B2C vs. B2B (MOD-Demo-Phase 1).
  // Beeinflusst Dashboard-UI (Signals-Anzeige) und kann spaeter Scoring-
  // Kriterien parametrisieren. Optional + backward-compatible.
  webWidgetConfig: z
    .object({
      welcomeMessage: z.string().max(500).optional(),
      botName: z.string().min(1).max(50).optional(),
      botSubtitle: z.string().min(0).max(100).optional(),
      avatarInitials: z.string().min(1).max(3).optional(),
      leadType: z.enum(["B2C", "B2B"]).optional(),
    })
    .optional(),
  // Scoring-Customization (ADR scoring-per-tenant).
  // scoringPrompt: null = Default nutzen. String >= 50 Zeichen sonst.
  // qualificationLabels: null = Default-Labels. Objekt-Struktur s. Schema.
  scoringPrompt: z.string().min(50).max(30000).nullable().optional(),
  qualificationLabels: QualificationLabelsSchema.nullable().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Mindestens ein Feld muss angegeben werden",
});

// ID-Validierung (CUID-Format)
const idSchema = z.string().min(1);

// ---------- GET: Tenant-Details ----------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: "Ungültige Tenant-ID" }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id },
      select: {
        ...TENANT_PUBLIC_SELECT,
        _count: {
          select: {
            conversations: true,
            leads: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("[Admin] Fehler beim Laden des Tenants", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// ---------- PATCH: Tenant aktualisieren ----------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: "Ungültige Tenant-ID" }, { status: 400 });
    }

    const rawBody: unknown = await request.json();
    const parseResult = updateTenantSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const data = parseResult.data;

    // qualificationLabels: Prisma unterscheidet zwischen JSON-`null` und DB-NULL.
    // Der Client sendet null um "Default nutzen" zu signalisieren — das muss
    // als Prisma.DbNull persistiert werden, damit die Spalte SQL-NULL bleibt.
    const labelsUpdate: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined =
      data.qualificationLabels === undefined
        ? undefined
        : data.qualificationLabels === null
          ? Prisma.DbNull
          : (data.qualificationLabels as Prisma.InputJsonValue);

    // Widget-Aktivierung: Plan pruefen + Public-Key generieren falls noch keiner da ist
    // webWidgetConfig: partiell mergen statt ueberschreiben
    const updateData: Prisma.TenantUpdateInput = {
      ...data,
      webWidgetConfig: undefined,
      qualificationLabels: labelsUpdate,
    };

    // Vorab-Lese nur wenn noetig (Activation oder Config-Merge)
    const needsCurrent =
      data.webWidgetEnabled === true || data.webWidgetConfig !== undefined;
    const current = needsCurrent
      ? await db.tenant.findUnique({
          where: { id },
          select: {
            paddlePlan: true,
            webWidgetPublicKey: true,
            webWidgetConfig: true,
          },
        })
      : null;

    if (needsCurrent && !current) {
      return NextResponse.json(
        { error: "Tenant nicht gefunden" },
        { status: 404 }
      );
    }

    if (data.webWidgetEnabled === true && current) {
      // Plan-Gate: nur Growth+ darf Widget aktivieren
      const effectivePlan = data.paddlePlan !== undefined ? data.paddlePlan : current.paddlePlan;
      if (!hasPlanFeature(effectivePlan, "web_widget")) {
        return NextResponse.json(
          { error: "Growth-Plan erforderlich fuer Web-Widget" },
          { status: 400 }
        );
      }
      // Public-Key bei Erstaktivierung generieren
      if (!current.webWidgetPublicKey) {
        updateData.webWidgetPublicKey = generatePublicKey();
      }
    }

    // Config-Merge: bestehende Felder (primaryColor, logoUrl etc.) beibehalten
    if (data.webWidgetConfig !== undefined && current) {
      const currentConfig =
        (current.webWidgetConfig as Prisma.JsonObject | null) ?? {};
      updateData.webWidgetConfig = {
        ...currentConfig,
        ...data.webWidgetConfig,
      } as Prisma.InputJsonValue;
    }

    const tenant = await db.tenant.update({
      where: { id },
      data: updateData,
      select: {
        ...TENANT_PUBLIC_SELECT,
        _count: {
          select: {
            conversations: true,
            leads: true,
          },
        },
      },
    });

    // Cache invalidieren falls Felder geaendert wurden, die der
    // Resolver-Cache abdeckt (Tenant-Identitaet via whatsappPhoneId
    // + WHERE-Filter isActive: true). whatsappPhoneId selbst ist im
    // PATCH-Schema NICHT mutierbar, also reicht Single-Key-Wipe auf
    // tenant.whatsappPhoneId. isActive: false → naechster Webhook
    // bekommt sofort null statt eines bis zu 60s alten Tenant-Hits.
    invalidateTenantCache(tenant.whatsappPhoneId);

    console.log("[Admin] Tenant aktualisiert", {
      tenantId: tenant.id,
      fields: Object.keys(data),
    });

    return NextResponse.json({ tenant });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json(
        { error: "Tenant nicht gefunden" },
        { status: 404 }
      );
    }

    console.error("[Admin] Fehler beim Aktualisieren des Tenants", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// ---------- DELETE: Tenant loeschen ----------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: "Ungültige Tenant-ID" }, { status: 400 });
    }

    // delete({ select: ... }) liefert das geloeschte Record zurueck,
    // damit wir die whatsappPhoneId fuer die Cache-Invalidation
    // haben — kein zusaetzlicher findUnique-Roundtrip noetig.
    const deleted = await db.tenant.delete({
      where: { id },
      select: { whatsappPhoneId: true },
    });

    // Resolver-Cache fuer die geloeschte Phone-ID invalidieren —
    // sonst koennte ein bis zu 60s alter Cache-Hit Webhooks weiter
    // an den nicht mehr existenten Tenant routen.
    invalidateTenantCache(deleted.whatsappPhoneId);

    // DSGVO-Pflicht: Tenant-Loeschung im Audit-Log dokumentieren
    auditLog("admin.tenant_deleted", {
      tenantId: id,
      details: { deletedBy: "admin" },
    });

    console.log("[Admin] Tenant gelöscht", { tenantId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      return NextResponse.json(
        { error: "Tenant nicht gefunden" },
        { status: 404 }
      );
    }

    console.error("[Admin] Fehler beim Löschen des Tenants", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}

// ---------- POST: Dashboard-Token neu generieren ----------

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

    const rawToken = randomBytes(32).toString("hex");

    const tenant = await db.tenant.update({
      where: { id },
      data: {
        dashboardToken: hashToken(rawToken),
        dashboardTokenExpiresAt: new Date(Date.now() + MAGIC_LINK_EXPIRY_MS),
      },
      select: { id: true, name: true, slug: true },
    });

    // Audit-Log fuer 72h-Token-Regen (TD-Pilot-08 Bonus-Fix: Enum-Wert
    // admin.token_regenerated war bereits deklariert, wurde aber nie
    // befeuert — jetzt geschlossen).
    const ip = getClientIp(request);
    const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
    auditLog("admin.token_regenerated", {
      tenantId: tenant.id,
      ip: ipHash,
      details: {
        tenantSlug: tenant.slug,
        expiresInSeconds: Math.round(MAGIC_LINK_EXPIRY_MS / 1000),
        source: "admin-ui-or-script",
      },
    });

    console.log("[Admin] Dashboard-Token regeneriert", { tenantId: tenant.id });

    // Klartext-Token einmalig dem Admin zeigen – in DB nur als Hash gespeichert
    return NextResponse.json({
      tenantId: tenant.id,
      message: "Dashboard-Token wurde regeneriert",
      dashboardLoginPath: `/dashboard/login?token=${rawToken}`,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json(
        { error: "Tenant nicht gefunden" },
        { status: 404 }
      );
    }

    console.error("[Admin] Fehler beim Regenerieren des Tokens", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
