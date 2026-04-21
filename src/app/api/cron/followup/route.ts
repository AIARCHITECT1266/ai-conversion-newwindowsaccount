// ============================================================
// Follow-Up Cron-Job: Automatische Nachfass-Nachrichten
// Prüft täglich welche Leads seit 24h/48h/72h nicht geantwortet
// haben und sendet eskalierende Follow-Up Nachrichten via WhatsApp.
// Absicherung: Nur mit CRON_SECRET aufrufbar
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import { encryptText } from "@/modules/encryption/aes";
import { safeCompare } from "@/modules/auth/session";

// Follow-Up Stufen: eskalierende Dringlichkeit
const FOLLOW_UP_TEMPLATES: Record<number, (brandName: string) => string> = {
  // Stufe 1: Freundliche Erinnerung nach 24h
  1: (brand) =>
    `Hallo! 👋 Hier ist ${brand}. Wir wollten nur kurz nachfragen, ob Sie noch ` +
    `Fragen haben oder wir Ihnen bei etwas helfen können. Wir sind jederzeit für Sie da!`,

  // Stufe 2: Wertangebot nach 48h
  2: (brand) =>
    `Guten Tag! ${brand} hier. Wir möchten sicherstellen, dass wir alle Ihre Fragen ` +
    `beantwortet haben. Dürfen wir Ihnen vielleicht ein unverbindliches Angebot erstellen ` +
    `oder einen kurzen Beratungstermin vereinbaren? 📅`,

  // Stufe 3: Letzte Nachricht nach 72h
  3: (brand) =>
    `Hallo nochmal von ${brand}. Dies ist unsere letzte Nachricht – wir möchten Sie ` +
    `nicht stören. Falls Sie in Zukunft Interesse haben, sind wir jederzeit erreichbar. ` +
    `Wir wünschen Ihnen alles Gute! 🙏`,
};

// Zeitfenster in Stunden pro Follow-Up Stufe
const FOLLOW_UP_THRESHOLDS_HOURS = [24, 48, 72] as const;

export async function GET(request: NextRequest) {
  // Absicherung: CRON_SECRET prüfen
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[Follow-Up] CRON_SECRET nicht konfiguriert");
    return NextResponse.json({ error: "Nicht konfiguriert" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  const providedToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!providedToken || !safeCompare(providedToken, cronSecret)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const BATCH_SIZE = 100;
    let cursor: string | undefined = undefined;
    let followUpsSent = 0;
    let errors = 0;
    let candidatesChecked = 0;

    while (true) {
      const paginationArgs: { skip?: number; cursor?: { id: string } } = cursor
        ? { skip: 1, cursor: { id: cursor } }
        : {};

      const batch = await db.lead.findMany({
        where: {
          followUpCount: { lt: 3 },
          status: { notIn: ["CONVERTED", "LOST"] },
          conversation: {
            status: "ACTIVE",
            consentGiven: true,
          },
          tenant: { isActive: true },
        },
        select: {
          id: true,
          followUpCount: true,
          lastFollowUpAt: true,
          score: true,
          conversation: { select: { id: true, externalId: true } },
          tenant: { select: { id: true, brandName: true, whatsappPhoneId: true } },
        },
        take: BATCH_SIZE,
        ...paginationArgs,
        orderBy: { id: "asc" },
      });

      if (batch.length === 0) break;

      // Batch-Query für letzte User-Nachrichten (eliminiert N+1)
      const conversationIds = batch.map((l) => l.conversation.id);
      const lastMessages = await db.message.findMany({
        where: {
          conversationId: { in: conversationIds },
          role: "USER",
        },
        orderBy: { timestamp: "desc" },
        distinct: ["conversationId"],
        take: 100,
        select: { conversationId: true, timestamp: true },
      });
      const lastMessageMap = new Map(
        lastMessages.map((m) => [m.conversationId, m.timestamp])
      );

      for (const lead of batch) {
        try {
          const lastMessageTimestamp = lastMessageMap.get(lead.conversation.id);
          if (!lastMessageTimestamp) continue;

          const hoursSinceLastMessage =
            (Date.now() - lastMessageTimestamp.getTime()) / (1000 * 60 * 60);

          // Nächste Follow-Up Stufe bestimmen (0-basiert → 1-basiert)
          const nextFollowUpLevel = lead.followUpCount + 1;
          if (nextFollowUpLevel > 3) continue;

          const requiredHours = FOLLOW_UP_THRESHOLDS_HOURS[nextFollowUpLevel - 1];

          // Noch nicht fällig?
          if (hoursSinceLastMessage < requiredHours) continue;

          // Bereits ein Follow-Up auf dieser Stufe gesendet? (Schutz vor Doppel-Sends)
          if (lead.lastFollowUpAt) {
            const hoursSinceLastFollowUp =
              (Date.now() - lead.lastFollowUpAt.getTime()) / (1000 * 60 * 60);
            // Mindestens 20h seit letztem Follow-Up (Puffer)
            if (hoursSinceLastFollowUp < 20) continue;
          }

          // Follow-Up Nachricht generieren
          const template = FOLLOW_UP_TEMPLATES[nextFollowUpLevel];
          const followUpText = template(lead.tenant.brandName);

          // Follow-Up als ASSISTANT-Nachricht verschlüsselt speichern
          await db.message.create({
            data: {
              conversationId: lead.conversation.id,
              role: "ASSISTANT",
              contentEncrypted: encryptText(followUpText),
              messageType: "TEXT",
            },
          });

          // Lead-Follow-Up Status aktualisieren
          await db.lead.update({
            where: { id: lead.id },
            data: {
              followUpCount: nextFollowUpLevel,
              lastFollowUpAt: new Date(),
            },
          });

          followUpsSent++;

          console.log("[Follow-Up] Gesendet", {
            tenantId: lead.tenant.id,
            leadId: lead.id,
            level: nextFollowUpLevel,
            hoursSinceLastMessage: Math.round(hoursSinceLastMessage),
          });
        } catch (error) {
          errors++;
          console.error("[Follow-Up] Fehler bei Lead", {
            leadId: lead.id,
            error: error instanceof Error ? error.message : "Unbekannt",
          });
        }
      }

      cursor = batch[batch.length - 1].id;
      candidatesChecked += batch.length;
      if (batch.length < BATCH_SIZE) break;
    }

    console.log("[Follow-Up] Abgeschlossen", {
      candidatesChecked,
      followUpsSent,
      errors,
    });

    return NextResponse.json({
      success: true,
      candidatesChecked,
      followUpsSent,
      errors,
    });
  } catch (error) {
    console.error("[Follow-Up] Kritischer Fehler", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
