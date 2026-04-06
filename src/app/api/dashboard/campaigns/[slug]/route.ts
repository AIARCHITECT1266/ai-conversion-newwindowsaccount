// ============================================================
// PATCH /api/dashboard/campaigns/[slug] – Kampagne aktualisieren
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDashboardTenant } from "@/lib/dashboard-auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { slug } = await params;

  const campaign = await db.campaign.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug } },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Kampagne nicht gefunden" }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (body.isTemplate !== undefined) updateData.isTemplate = Boolean(body.isTemplate);
  if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
  if (body.templateData !== undefined) updateData.templateData = body.templateData ? JSON.stringify(body.templateData) : null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  const updated = await db.campaign.update({
    where: { id: campaign.id },
    data: updateData,
    select: { id: true, isTemplate: true, isActive: true },
  });

  return NextResponse.json({ campaign: updated });
}
