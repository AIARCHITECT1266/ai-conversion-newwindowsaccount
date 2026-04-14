// ============================================================
// Admin-API: Einzelnen Tenant lesen und aktualisieren
// GET: Tenant-Details inkl. systemPrompt (ohne dashboardToken)
// PATCH: Tenant-Einstellungen ändern
// POST: Dashboard-Token neu generieren
// Authentifizierung: via Middleware (Bearer-Token / Cookie)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/shared/db";
import { hashToken, MAGIC_LINK_EXPIRY_MS } from "@/modules/auth/dashboard-auth";
import { auditLog } from "@/modules/compliance/audit-log";
import { generatePublicKey } from "@/lib/widget/publicKey";
import { hasPlanFeature } from "@/lib/plan-limits";

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

    // Widget-Aktivierung: Plan pruefen + Public-Key generieren falls noch keiner da ist
    type TenantUpdate = typeof data & { webWidgetPublicKey?: string };
    const updateData: TenantUpdate = { ...data };
    if (data.webWidgetEnabled === true) {
      const current = await db.tenant.findUnique({
        where: { id },
        select: { paddlePlan: true, webWidgetPublicKey: true },
      });
      if (!current) {
        return NextResponse.json(
          { error: "Tenant nicht gefunden" },
          { status: 404 }
        );
      }
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

    await db.tenant.delete({ where: { id } });

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
  _request: NextRequest,
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
      select: { id: true, name: true },
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
