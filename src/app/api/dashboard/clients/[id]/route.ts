// ============================================================
// GET/PATCH /api/dashboard/clients/[id] – Client Detail + Update
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";

const clientUpdateSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  contactName: z.string().max(255).nullable().optional(),
  status: z.enum(["ONBOARDING", "ACTIVE", "PAUSED"]).optional(),
  onboardingStep: z.number().int().min(0).max(5).optional(),
  milestones: z.array(z.unknown()).optional(),
  notes: z.string().max(10000).nullable().optional(),
});

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
  const result = clientUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const validated = result.data;
  const data: Record<string, unknown> = {};

  if (validated.companyName !== undefined) data.companyName = validated.companyName.trim();
  if (validated.contactName !== undefined) data.contactName = validated.contactName ? validated.contactName.trim() : null;
  if (validated.status !== undefined) data.status = validated.status;
  if (validated.onboardingStep !== undefined) data.onboardingStep = validated.onboardingStep;
  if (validated.milestones !== undefined) data.milestones = JSON.stringify(validated.milestones);
  if (validated.notes !== undefined) data.notes = validated.notes || null;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });

  // Automatisch auf ACTIVE setzen wenn alle 5 Schritte erledigt
  if (data.onboardingStep === 5 && client.status === "ONBOARDING") {
    data.status = "ACTIVE";
  }

  const updated = await db.client.update({ where: { id }, data });
  return NextResponse.json({ client: updated });
}
