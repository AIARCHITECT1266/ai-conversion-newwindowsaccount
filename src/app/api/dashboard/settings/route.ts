// ============================================================
// GET/PATCH /api/dashboard/settings – Tenant-Einstellungen
// HubSpot API-Key wird verschlüsselt gespeichert
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { encryptText, decryptText } from "@/modules/encryption/aes";
import { db } from "@/shared/db";

const settingsSchema = z.object({
  brandName: z.string().min(1).max(255).optional(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  retentionDays: z.number().int().min(1).max(3650).optional(),
  hubspotApiKey: z.string().startsWith("pat-").nullable().optional(),
  webhookUrl: z.string().url().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "Mindestens ein Feld erforderlich"
});

// GET: Aktuelle Einstellungen laden (API-Key nur als Boolean)
export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const data = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: { hubspotApiKey: true },
  });

  return NextResponse.json({
    hubspotConnected: !!data?.hubspotApiKey,
  });
}

// PATCH: Einstellungen aktualisieren
export async function PATCH(request: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await request.json();
  const result = settingsSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};

  if (result.data.hubspotApiKey !== undefined) {
    updateData.hubspotApiKey = result.data.hubspotApiKey === null
      ? null
      : encryptText(result.data.hubspotApiKey);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  await db.tenant.update({
    where: { id: tenant.id },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}
