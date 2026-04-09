// ============================================================
// DSGVO Cron-Job: Automatische Datenloeschung
// Loescht Nachrichten und Conversations die aelter als
// retentionDays des jeweiligen Tenants sind.
// Absicherung: Nur mit CRON_SECRET aufrufbar
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import { safeCompare } from "@/modules/auth/session";
import { auditLog } from "@/modules/compliance/audit-log";

export async function GET(request: NextRequest) {
  // Absicherung: CRON_SECRET muss konfiguriert sein
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[DSGVO Cleanup] CRON_SECRET nicht konfiguriert – Endpoint gesperrt");
    return NextResponse.json({ error: "Nicht konfiguriert" }, { status: 503 });
  }

  // Timing-sicherer Vergleich des Authorization-Headers
  const authHeader = request.headers.get("authorization");
  const providedToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!providedToken || !safeCompare(providedToken, cronSecret)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const tenants = await db.tenant.findMany({
      select: { id: true, name: true, retentionDays: true },
    });

    // Deduplizierung: Verarbeitete Message-IDs älter als 24h löschen
    const dedupCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deletedProcessed = await db.processedMessage.deleteMany({
      where: { createdAt: { lt: dedupCutoff } },
    });
    if (deletedProcessed.count > 0) {
      console.log("[DSGVO Cleanup] ProcessedMessages geloescht", {
        count: deletedProcessed.count,
      });
    }

    let totalMessagesDeleted = 0;
    let totalConversationsDeleted = 0;

    for (const tenant of tenants) {
      const cutoff = new Date(
        Date.now() - tenant.retentionDays * 24 * 60 * 60 * 1000
      );

      // 1. Alte Nachrichten loeschen (Messages gehoeren zu Conversations)
      const deletedMessages = await db.message.deleteMany({
        where: {
          conversation: { tenantId: tenant.id },
          timestamp: { lt: cutoff },
        },
      });
      totalMessagesDeleted += deletedMessages.count;

      // 2. Geschlossene/Archivierte Conversations ohne Nachrichten loeschen
      const emptyConversations = await db.conversation.findMany({
        where: {
          tenantId: tenant.id,
          updatedAt: { lt: cutoff },
          status: { in: ["CLOSED", "ARCHIVED"] },
          messages: { none: {} },
        },
        select: { id: true },
      });

      if (emptyConversations.length > 0) {
        // Zuerst zugehoerige Leads loeschen
        await db.lead.deleteMany({
          where: {
            conversationId: { in: emptyConversations.map((c) => c.id) },
          },
        });

        const deletedConvs = await db.conversation.deleteMany({
          where: {
            id: { in: emptyConversations.map((c) => c.id) },
          },
        });
        totalConversationsDeleted += deletedConvs.count;
      }

      // Stufe 3: Eigenstaendige Lead-Retention
      // Leads loeschen, die aelter als retentionDays sind – UNABHAENGIG vom Conversation-Status
      // Ausnahme: Leads mit verknuepftem Client bleiben erhalten (aktive Kundenbeziehung)
      const orphanedLeads = await db.lead.deleteMany({
        where: {
          tenantId: tenant.id,
          createdAt: { lt: cutoff },
          client: { is: null },
        },
      });

      // Stufe 4: Verwaiste Clients bereinigen
      // Cascade loescht Clients mit ihrem Lead, diese Stufe faengt Edge-Cases ab
      const allClientIds = (await db.client.findMany({
        where: { tenantId: tenant.id },
        select: { id: true, leadId: true },
      }));
      const existingLeadIds = new Set(
        (await db.lead.findMany({
          where: { tenantId: tenant.id },
          select: { id: true },
        })).map((l) => l.id)
      );
      const orphanedClientIds = allClientIds
        .filter((c) => !existingLeadIds.has(c.leadId))
        .map((c) => c.id);
      const orphanedClients = orphanedClientIds.length > 0
        ? await db.client.deleteMany({ where: { id: { in: orphanedClientIds } } })
        : { count: 0 };

      if (deletedMessages.count > 0 || emptyConversations.length > 0 || orphanedLeads.count > 0 || orphanedClients.count > 0) {
        auditLog("cron.cleanup_completed", {
          tenantId: tenant.id,
          details: {
            messagesDeleted: deletedMessages.count,
            conversationsDeleted: emptyConversations.length,
            leadsDeleted: orphanedLeads.count,
            clientsDeleted: orphanedClients.count,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedMessagesDeleted: deletedProcessed.count,
      messagesDeleted: totalMessagesDeleted,
      conversationsDeleted: totalConversationsDeleted,
      tenantsProcessed: tenants.length,
    });
  } catch (error) {
    console.error("[DSGVO Cleanup] Fehler", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
