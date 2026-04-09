// ============================================================
// Dashboard-API: Einzelne Conversation mit Nachrichten
// GET: Conversation + entschlüsselte Nachrichten + Lead-Daten
// Authentifizierung: via getDashboardTenant (Cookie/Header)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { decryptText } from "@/modules/encryption/aes";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await db.conversation.findFirst({
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
        },
      },
    },
  });

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

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      externalId: conversation.externalId,
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
            ...conversation.lead,
            appointmentAt: conversation.lead.appointmentAt?.toISOString() ?? null,
            createdAt: conversation.lead.createdAt.toISOString(),
          }
        : null,
    },
  });
}
