// ============================================================
// GET/PATCH /api/dashboard/settings – Tenant-Einstellungen
// HubSpot API-Key wird verschlüsselt gespeichert
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { encryptText, decryptText } from "@/modules/encryption/aes";
import { db } from "@/shared/db";

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
  const updateData: Record<string, unknown> = {};

  // HubSpot API-Key verschlüsselt speichern
  if (body.hubspotApiKey !== undefined) {
    if (body.hubspotApiKey === null || body.hubspotApiKey === "") {
      updateData.hubspotApiKey = null;
    } else {
      // Validierung: HubSpot API-Keys beginnen mit "pat-"
      const key = String(body.hubspotApiKey).trim();
      if (!key.startsWith("pat-")) {
        return NextResponse.json(
          { error: "Ungültiger HubSpot API-Key (muss mit 'pat-' beginnen)" },
          { status: 400 }
        );
      }
      updateData.hubspotApiKey = encryptText(key);
    }
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
