// ============================================================
// PATCH /api/dashboard/leads/[id] – Lead aktualisieren (Pipeline-Status, Notizen, Deal-Wert)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDashboardTenant } from "@/lib/dashboard-auth";
import { db } from "@/lib/db";

const VALID_PIPELINE_STATUSES = ["NEU", "QUALIFIZIERT", "TERMIN", "ANGEBOT", "GEWONNEN"] as const;
type PipelineStatus = (typeof VALID_PIPELINE_STATUSES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { id } = await params;

  // Prüfen ob Lead zum Tenant gehört
  const lead = await db.lead.findFirst({
    where: { id, tenantId: tenant.id },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  // Pipeline-Status validieren
  if (body.pipelineStatus !== undefined) {
    if (!VALID_PIPELINE_STATUSES.includes(body.pipelineStatus as PipelineStatus)) {
      return NextResponse.json({ error: "Ungültiger Pipeline-Status" }, { status: 400 });
    }
    updateData.pipelineStatus = body.pipelineStatus;
  }

  // Deal-Wert validieren
  if (body.dealValue !== undefined) {
    const val = body.dealValue === null ? null : Number(body.dealValue);
    if (val !== null && (isNaN(val) || val < 0)) {
      return NextResponse.json({ error: "Ungültiger Deal-Wert" }, { status: 400 });
    }
    updateData.dealValue = val;
  }

  // Notizen (Text, kann null sein)
  if (body.notes !== undefined) {
    updateData.notes = body.notes === "" ? null : String(body.notes);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  const updated = await db.lead.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      pipelineStatus: true,
      dealValue: true,
      notes: true,
    },
  });

  return NextResponse.json({ lead: updated });
}
