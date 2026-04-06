// ============================================================
// GET /api/dashboard/campaigns/templates/[id] – Einzelnes Template laden
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDashboardTenant } from "@/lib/dashboard-auth";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await params;

  const template = await db.campaignTemplate.findFirst({
    where: {
      id,
      OR: [{ isSystem: true }, { tenantId: tenant.id }],
    },
  });

  if (!template) return NextResponse.json({ error: "Template nicht gefunden" }, { status: 404 });

  return NextResponse.json({
    template: {
      ...template,
      briefing: JSON.parse(template.briefing),
      openers: JSON.parse(template.openers),
      abVarianten: template.abVarianten ? JSON.parse(template.abVarianten) : null,
      ziele: JSON.parse(template.ziele),
    },
  });
}
