// ============================================================
// PATCH /api/dashboard/campaigns/[slug] – Kampagne aktualisieren
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";

const campaignUpdateSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(2048).optional(),
  isActive: z.boolean().optional(),
  isTemplate: z.boolean().optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "Mindestens ein Feld erforderlich"
});

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
  const result = campaignUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const validated = result.data;
  const updateData: Record<string, unknown> = {};

  if (validated.name !== undefined) updateData.name = validated.name;
  if (validated.description !== undefined) updateData.description = validated.description;
  if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
  if (validated.isTemplate !== undefined) updateData.isTemplate = validated.isTemplate;
  if (validated.templateData !== undefined) updateData.templateData = validated.templateData ? JSON.stringify(validated.templateData) : null;

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
