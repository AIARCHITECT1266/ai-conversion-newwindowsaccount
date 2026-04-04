// ============================================================
// Admin-API: Einzelnen Tenant lesen und aktualisieren
// GET: Tenant-Details inkl. systemPrompt
// PATCH: Tenant-Einstellungen ändern
// Hinweis: Keine Authentifizierung – nur für lokale Nutzung/Tests
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";

// ---------- GET: Tenant-Details ----------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
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

interface UpdateTenantBody {
  name?: string;
  brandName?: string;
  brandColor?: string;
  retentionDays?: number;
  systemPrompt?: string;
  isActive?: boolean;
}

const ALLOWED_FIELDS: (keyof UpdateTenantBody)[] = [
  "name",
  "brandName",
  "brandColor",
  "retentionDays",
  "systemPrompt",
  "isActive",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateTenantBody;

    // Nur erlaubte Felder übernehmen
    const data: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Keine gültigen Felder zum Aktualisieren" },
        { status: 400 }
      );
    }

    // retentionDays validieren
    if (data.retentionDays !== undefined) {
      const days = Number(data.retentionDays);
      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        return NextResponse.json(
          { error: "retentionDays muss zwischen 1 und 3650 liegen" },
          { status: 400 }
        );
      }
      data.retentionDays = days;
    }

    const tenant = await db.tenant.update({
      where: { id },
      data,
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

// ---------- POST: Dashboard-Token neu generieren ----------

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dashboardToken = randomBytes(32).toString("hex");

    const tenant = await db.tenant.update({
      where: { id },
      data: { dashboardToken },
      select: { id: true, name: true },
    });

    console.log("[Admin] Dashboard-Token regeneriert", { tenantId: tenant.id });

    return NextResponse.json({
      tenantId: tenant.id,
      dashboardLoginPath: `/dashboard/login?token=${dashboardToken}`,
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
