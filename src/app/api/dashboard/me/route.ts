// ============================================================
// Dashboard Auth-Info
// GET /api/dashboard/me — Gibt Tenant-Infos des eingeloggten Nutzers zurück
// ============================================================

import { NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { parseLeadType } from "@/lib/widget/publicKey";
import { db } from "@/shared/db";

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // leadType aus Tenant-Config lesen (B2C/B2B fuer Dashboard-Anzeige).
  // Separater Read statt im getDashboardTenant(), weil das Feld nur fuer
  // Dashboard-UI relevant ist und der Auth-Pfad schlank bleiben soll.
  const config = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: { webWidgetConfig: true },
  });

  return NextResponse.json({
    tenantId: tenant.id,
    tenantName: tenant.name,
    brandName: tenant.brandName,
    leadType: parseLeadType(config?.webWidgetConfig),
  });
}
