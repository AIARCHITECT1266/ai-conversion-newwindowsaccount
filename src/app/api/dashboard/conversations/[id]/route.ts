// ============================================================
// Dashboard-API: Einzelne Conversation mit Nachrichten
// GET: Conversation + entschlüsselte Nachrichten + Lead-Daten
// Authentifizierung: via getDashboardTenant (Cookie/Header)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { decryptText } from "@/modules/encryption/aes";
import { loadQualificationLabels } from "@/modules/bot/scoring";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { id } = await params;

  // Tenant-Labels parallel laden (zweites Lightweight-Query, damit
  // Dashboard die tenant-spezifischen Qualification-Labels anzeigen kann).
  const [conversation, tenantRecord] = await Promise.all([
    db.conversation.findFirst({
      where: { id, tenantId: tenant.id },
      include: {
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
        lead: {
          select: {
            id: true,
            score: true,
            qualification: true,
            status: true,
            pipelineStatus: true,
            dealValue: true,
            source: true,
            appointmentAt: true,
            createdAt: true,
            scoringSignals: true,
          },
        },
      },
    }),
    db.tenant.findUnique({
      where: { id: tenant.id },
      select: { qualificationLabels: true },
    }),
  ]);

  if (!conversation) {
    return NextResponse.json(
      { error: "Konversation nicht gefunden" },
      { status: 404 }
    );
  }

  // Nachrichten entschlüsseln
  const messages = conversation.messages.map((m) => {
    let content: string;
    try {
      content = decryptText(m.contentEncrypted);
    } catch {
      content = "[Nachricht nicht lesbar]";
    }
    return {
      id: m.id,
      role: m.role,
      content,
      messageType: m.messageType,
      timestamp: m.timestamp.toISOString(),
    };
  });

  // Signals aus Prisma-JSON sauber auf string[] herunterbrechen. Fremd-
  // geschriebene Eintraege oder Legacy-null bleiben sicher behandelt.
  const signalsRaw = conversation.lead?.scoringSignals;
  const scoringSignals: string[] = Array.isArray(signalsRaw)
    ? signalsRaw.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];

  // Tenant-Qualification-Labels aufloesen (Fallback auf Defaults via Loader).
  const qualificationLabels = loadQualificationLabels({
    qualificationLabels: tenantRecord?.qualificationLabels,
  });

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      externalId: conversation.externalId,
      channel: conversation.channel, // Phase 6.3: Channel fuer das Badge in der Detail-View
      status: conversation.status,
      language: conversation.language,
      consentGiven: conversation.consentGiven,
      consentAt: conversation.consentAt?.toISOString() ?? null,
      campaignSlug: conversation.campaignSlug,
      leadSource: conversation.leadSource,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages,
      lead: conversation.lead
        ? {
            id: conversation.lead.id,
            score: conversation.lead.score,
            qualification: conversation.lead.qualification,
            status: conversation.lead.status,
            pipelineStatus: conversation.lead.pipelineStatus,
            dealValue: conversation.lead.dealValue,
            source: conversation.lead.source,
            appointmentAt: conversation.lead.appointmentAt?.toISOString() ?? null,
            createdAt: conversation.lead.createdAt.toISOString(),
            scoringSignals,
          }
        : null,
    },
    qualificationLabels,
  });
}
