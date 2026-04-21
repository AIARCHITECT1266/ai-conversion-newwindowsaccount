// ============================================================
// GET /api/dashboard/leads – Alle Leads des Tenants für CRM-Pipeline
// ============================================================

import { NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const leads = await db.lead.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      score: true,
      qualification: true,
      status: true,
      pipelineStatus: true,
      dealValue: true,
      notes: true,
      appointmentAt: true,
      createdAt: true,
      predictiveScore: true,
      predictiveScoreAt: true,
      conversation: {
        select: {
          externalId: true,
          // Phase 6.3: channel wird fuer das Channel-Badge
          // in der CRM-Kanban-View benoetigt.
          channel: true,
          status: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ leads });
}
