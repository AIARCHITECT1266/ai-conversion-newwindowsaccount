// ============================================================
// GET /api/dashboard/campaigns/[slug]/stats – Kampagnen-Metriken
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { slug } = await params;

  const campaign = await db.campaign.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug } },
    select: { id: true, name: true, slug: true, isActive: true, createdAt: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Kampagne nicht gefunden" }, { status: 404 });
  }

  // Alle Leads dieser Kampagne laden
  const leads = await db.lead.findMany({
    where: { campaignId: campaign.id },
    select: {
      score: true,
      qualification: true,
      pipelineStatus: true,
      dealValue: true,
      appointmentAt: true,
    },
  });

  const totalLeads = leads.length;
  const avgScore = totalLeads > 0
    ? Math.round(leads.reduce((s, l) => s + l.score, 0) / totalLeads)
    : 0;

  // Pipeline-Funnel
  const pipeline: Record<string, number> = {
    NEU: 0, QUALIFIZIERT: 0, TERMIN: 0, ANGEBOT: 0, GEWONNEN: 0,
  };
  let totalValue = 0;
  let appointments = 0;

  // Qualifikations-Counts
  const qualifications: Record<string, number> = {
    UNQUALIFIED: 0, MARKETING_QUALIFIED: 0, SALES_QUALIFIED: 0, OPPORTUNITY: 0, CUSTOMER: 0,
  };

  for (const lead of leads) {
    pipeline[lead.pipelineStatus]++;
    totalValue += lead.dealValue ?? 0;
    if (lead.appointmentAt) appointments++;
    qualifications[lead.qualification]++;
  }

  // Qualifizierte Leads = alles außer UNQUALIFIED
  const qualifiedLeads = totalLeads - qualifications.UNQUALIFIED;

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      isActive: campaign.isActive,
      createdAt: campaign.createdAt,
    },
    metrics: {
      totalLeads,
      avgScore,
      qualifiedLeads,
      appointments,
      totalValue,
      pipeline,
      qualifications,
    },
  });
}
