// ============================================================
// Dashboard Auth-Info
// GET /api/dashboard/me — Gibt Tenant-Infos des eingeloggten Nutzers zurück
// ============================================================

import { NextResponse } from "next/server";
import { getDashboardTenant } from "@/lib/dashboard-auth";

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  return NextResponse.json({
    tenantId: tenant.id,
    tenantName: tenant.name,
    brandName: tenant.brandName,
  });
}
