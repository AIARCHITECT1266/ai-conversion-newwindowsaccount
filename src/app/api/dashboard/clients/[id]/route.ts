// ============================================================
// GET/PATCH /api/dashboard/clients/[id] – Client Detail + Update
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await params;
  const client = await db.client.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      lead: {
        select: {
          id: true, score: true, dealValue: true, qualification: true,
          pipelineStatus: true, notes: true, createdAt: true,
          conversation: { select: { externalId: true, status: true, createdAt: true } },
        },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Client nicht gefunden" }, { status: 404 });

  return NextResponse.json({ client });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await params;
  const client = await db.client.findFirst({ where: { id, tenantId: tenant.id } });
  if (!client) return NextResponse.json({ error: "Client nicht gefunden" }, { status: 404 });

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.companyName !== undefined) data.companyName = String(body.companyName).trim();
  if (body.contactName !== undefined) data.contactName = body.contactName ? String(body.contactName).trim() : null;
  if (body.status !== undefined && ["ONBOARDING", "ACTIVE", "PAUSED"].includes(body.status)) data.status = body.status;
  if (body.onboardingStep !== undefined) {
    const step = Number(body.onboardingStep);
    if (step >= 0 && step <= 5) data.onboardingStep = step;
  }
  if (body.milestones !== undefined) data.milestones = JSON.stringify(body.milestones);
  if (body.notes !== undefined) data.notes = body.notes || null;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });

  // Automatisch auf ACTIVE setzen wenn alle 5 Schritte erledigt
  if (data.onboardingStep === 5 && client.status === "ONBOARDING") {
    data.status = "ACTIVE";
  }

  const updated = await db.client.update({ where: { id }, data });
  return NextResponse.json({ client: updated });
}
