// ============================================================
// DSGVO Cron-Job: Automatische Datenloeschung
// Loescht Nachrichten und Conversations die aelter als
// retentionDays des jeweiligen Tenants sind.
// Absicherung: Nur mit CRON_SECRET aufrufbar
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  // Absicherung: Nur via Vercel Cron oder mit CRON_SECRET aufrufbar
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
  }

  try {
    const tenants = await db.tenant.findMany({
      select: { id: true, name: true, retentionDays: true },
    });

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
