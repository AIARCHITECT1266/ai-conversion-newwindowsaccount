// ============================================================
// GET /api/dashboard/leads – Alle Leads des Tenants für CRM-Pipeline
// ============================================================

import { NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { parseVisitorDisplayName } from "@/lib/widget/publicKey";
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
          // Phase-2-Demo-Fix: widgetVisitorMeta liefert den
          // anzeigbaren displayName (via parseVisitorDisplayName)
          // an die Dashboard-UI. Raw-JSON wird nicht ausgeliefert.
          widgetVisitorMeta: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // widgetVisitorMeta nicht roh weitergeben — nur den abgeleiteten
  // displayName. So bleibt das Feld Dashboard-API-intern und kann
  // spaeter um weitere Metadaten wachsen, ohne den Response-Shape
  // unkontrolliert zu sprengen.
  const result = leads.map((l) => {
    const { widgetVisitorMeta, ...rest } = l.conversation;
    return {
      ...l,
      conversation: {
        ...rest,
        visitorDisplayName: parseVisitorDisplayName(widgetVisitorMeta),
      },
    };
  });

  return NextResponse.json({ leads: result });
}
