// ============================================================
// DSGVO Cron-Job: Automatische Datenloeschung
// Loescht Nachrichten und Conversations die aelter als
// retentionDays des jeweiligen Tenants sind.
// Absicherung: Nur mit CRON_SECRET aufrufbar
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import { safeCompare } from "@/modules/auth/session";

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

      if (deletedMessages.count > 0 || emptyConversations.length > 0) {
        console.log("[DSGVO Cleanup] Daten geloescht", {
          tenantId: tenant.id,
          messagesDeleted: deletedMessages.count,
          conversationsDeleted: emptyConversations.length,
          retentionDays: tenant.retentionDays,
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
