// ============================================================
// GET /api/dashboard/leads/[id] – Lead-Details mit Chat-Verlauf
// PATCH /api/dashboard/leads/[id] – Lead aktualisieren
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDashboardTenant } from "@/lib/dashboard-auth";
import { decryptText } from "@/lib/encryption";
import { db } from "@/lib/db";

const VALID_PIPELINE_STATUSES = ["NEU", "QUALIFIZIERT", "TERMIN", "ANGEBOT", "GEWONNEN"] as const;
type PipelineStatus = (typeof VALID_PIPELINE_STATUSES)[number];

// Lead-Details mit entschlüsseltem Chat-Verlauf laden
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { id } = await params;

  const lead = await db.lead.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      conversation: {
        select: {
          id: true,
          externalId: true,
          status: true,
          language: true,
          consentGiven: true,
          consentAt: true,
          createdAt: true,
          updatedAt: true,
          messages: {
            orderBy: { timestamp: "asc" },
            select: {
              id: true,
              role: true,
              contentEncrypted: true,
              messageType: true,
              timestamp: true,
            },
          },
        },
      },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 });
  }

  // Nachrichten entschlüsseln (DSGVO: nur im Dashboard sichtbar)
  const messages = lead.conversation.messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: decryptText(msg.contentEncrypted),
    messageType: msg.messageType,
    timestamp: msg.timestamp,
  }));

  return NextResponse.json({
    lead: {
      id: lead.id,
      score: lead.score,
      qualification: lead.qualification,
      status: lead.status,
      pipelineStatus: lead.pipelineStatus,
      dealValue: lead.dealValue,
      notes: lead.notes,
      followUpCount: lead.followUpCount,
      lastFollowUpAt: lead.lastFollowUpAt,
      predictiveScore: lead.predictiveScore,
      predictiveScoreAt: lead.predictiveScoreAt,
      appointmentAt: lead.appointmentAt,
      createdAt: lead.createdAt,
      conversation: {
        id: lead.conversation.id,
        externalId: lead.conversation.externalId,
        status: lead.conversation.status,
        language: lead.conversation.language,
        consentGiven: lead.conversation.consentGiven,
        consentAt: lead.conversation.consentAt,
        createdAt: lead.conversation.createdAt,
        updatedAt: lead.conversation.updatedAt,
      },
      messages,
    },
  });
}

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
