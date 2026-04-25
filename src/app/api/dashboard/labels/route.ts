// ============================================================
// Dashboard-API: Tenant-spezifische Qualification-Labels
//
// GET /api/dashboard/labels
//
// Helper-Route fuer Client-Components (KpiCards ScoreBar,
// spaeter Top-Signals etc.), die tenant-spezifische
// Qualification-Labels rendern muessen ohne den Server-only
// loadQualificationLabels()-Helper direkt aufrufen zu koennen.
//
// Liefert die ADR-002-konformen Labels — entweder die
// tenant-eigenen aus tenant.qualificationLabels, oder die
// DEFAULT_QUALIFICATION_LABELS aus scoring/defaults.ts. Die
// Fallback-Logik liegt komplett in loadQualificationLabels.
//
// Tenant-Isolation: tenant kommt aus getDashboardTenant().
// Per-Tenant isoliert via Cookie-Auth-Boundary.
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/shared/db";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { loadQualificationLabels } from "@/modules/bot/scoring";

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Eine Lightweight-Read fuer das Labels-Feld. getDashboardTenant
  // selbst laedt das Feld nicht mit (Auth-Pfad bleibt schlank).
  const tenantData = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: { qualificationLabels: true },
  });

  const labels = loadQualificationLabels({
    qualificationLabels: tenantData?.qualificationLabels,
  });

  return NextResponse.json({ labels });
}
