// ============================================================
// GET /api/dashboard/clients – Client-Übersicht
// ============================================================

import { NextResponse } from "next/server";
import { getDashboardTenant } from "@/lib/dashboard-auth";
import { db } from "@/lib/db";

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const clients = await db.client.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, companyName: true, contactName: true, status: true,
      onboardingStep: true, milestones: true, createdAt: true,
      lead: { select: { score: true, dealValue: true, pipelineStatus: true } },
    },
  });

  return NextResponse.json({ clients });
}
