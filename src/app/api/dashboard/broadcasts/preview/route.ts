// ============================================================
// POST /api/dashboard/broadcasts/preview – Empfänger-Vorschau
// Gibt Anzahl Leads im gewählten Segment zurück
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";

const previewSchema = z.object({
  campaignId: z.string().optional(),
  segment: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const result = previewSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", details: result.error.flatten() },
      { status: 400 }
    );
  }
  const { campaignId, segment } = result.data;

  const where: Record<string, unknown> = { tenantId: tenant.id };
  if (campaignId) where.campaignId = campaignId;
  if (segment?.minScore) where.score = { gte: Number(segment.minScore) };
  if (segment?.pipelineStatus) where.pipelineStatus = segment.pipelineStatus;

  const count = await db.lead.count({ where });

  return NextResponse.json({ count });
}
