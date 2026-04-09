// ============================================================
// Broadcast Manager API
// GET: Liste aller Broadcasts, POST: Neuen Broadcast erstellen + senden
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";
import { checkLimit } from "@/lib/plan-limits";

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const broadcasts = await db.broadcast.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, message: true, segment: true, totalSent: true,
      totalFailed: true, status: true, createdAt: true, sentAt: true,
      campaign: { select: { name: true, slug: true } },
      _count: { select: { recipients: true } },
    },
  });

  return NextResponse.json({ broadcasts });
}

export async function POST(request: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await request.json();
  const { message, campaignId, segment } = body;

  // Plan-Limit pruefen
  const gate = await checkLimit(tenant.id, tenant.paddlePlan, "broadcasts");
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Plan-Limit erreicht", current: gate.current, limit: gate.limit, upgrade: true },
      { status: 403 },
    );
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: "Nachricht ist erforderlich" }, { status: 400 });
  }
  if (!segment) {
    return NextResponse.json({ error: "Segment ist erforderlich" }, { status: 400 });
  }

  // Leads basierend auf Segment filtern
  const where: Record<string, unknown> = { tenantId: tenant.id };
  if (campaignId) where.campaignId = campaignId;
  if (segment.minScore) where.score = { gte: Number(segment.minScore) };
  if (segment.pipelineStatus) where.pipelineStatus = segment.pipelineStatus;

  const leads = await db.lead.findMany({
    where,
    select: { id: true },
  });

  if (leads.length === 0) {
    return NextResponse.json({ error: "Keine Leads im Segment gefunden" }, { status: 400 });
  }

  // Broadcast erstellen mit Recipients
  const broadcast = await db.broadcast.create({
    data: {
      tenantId: tenant.id,
      campaignId: campaignId || null,
      message: message.trim(),
      segment: JSON.stringify(segment),
      status: "PENDING",
      recipients: {
        create: leads.map((l) => ({ leadId: l.id })),
      },
    },
    select: {
      id: true, status: true, _count: { select: { recipients: true } },
    },
  });

  return NextResponse.json({
    broadcast,
    recipientCount: broadcast._count.recipients,
  }, { status: 201 });
}
