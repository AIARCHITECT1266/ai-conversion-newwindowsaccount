// ============================================================
// POST /api/dashboard/broadcasts/preview – Empfänger-Vorschau
// Gibt Anzahl Leads im gewählten Segment zurück
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDashboardTenant } from "@/lib/dashboard-auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { campaignId, segment } = body;

  const where: Record<string, unknown> = { tenantId: tenant.id };
  if (campaignId) where.campaignId = campaignId;
  if (segment?.minScore) where.score = { gte: Number(segment.minScore) };
  if (segment?.pipelineStatus) where.pipelineStatus = segment.pipelineStatus;

  const count = await db.lead.count({ where });

  return NextResponse.json({ count });
}
