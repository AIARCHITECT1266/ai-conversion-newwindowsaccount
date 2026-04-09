// ============================================================
// GET /api/dashboard/leads/[id] – Lead-Details mit Chat-Verlauf
// PATCH /api/dashboard/leads/[id] – Lead aktualisieren
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { decryptText } from "@/modules/encryption/aes";
import { db } from "@/shared/db";

const leadUpdateSchema = z.object({
  status: z.enum(["NEW","CONTACTED","QUALIFIED","CONVERTED","LOST"]).optional(),
  pipelineStatus: z.string().max(64).optional(),
  score: z.number().int().min(0).max(100).optional(),
  dealValue: z.number().min(0).optional(),
  notes: z.string().max(10000).optional(),
  qualification: z.enum(["UNQUALIFIED","POTENTIAL","QUALIFIED","HOT"]).optional(),
});

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
  const result = leadUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const validated = result.data;
  const updateData: Record<string, unknown> = {};

  if (validated.pipelineStatus !== undefined) updateData.pipelineStatus = validated.pipelineStatus;
  if (validated.dealValue !== undefined) updateData.dealValue = validated.dealValue;
  if (validated.notes !== undefined) updateData.notes = validated.notes === "" ? null : validated.notes;

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

  // Auto-Client erstellen wenn Pipeline auf GEWONNEN gesetzt wird
  if (updateData.pipelineStatus === "GEWONNEN" && lead.pipelineStatus !== "GEWONNEN") {
    const existingClient = await db.client.findFirst({ where: { leadId: id, tenantId: tenant.id } });
    if (!existingClient) {
      await db.client.create({
        data: {
          tenantId: tenant.id,
          leadId: id,
          companyName: `Kunde #${id.slice(0, 6)}`,
          status: "ONBOARDING",
          onboardingStep: 0,
          milestones: JSON.stringify([]),
        },
      });
    }
  }

  return NextResponse.json({ lead: updated });
}
