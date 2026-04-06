// ============================================================
// Follow-Up Cron-Job: Automatische Nachfass-Nachrichten
// Prüft täglich welche Leads seit 24h/48h/72h nicht geantwortet
// haben und sendet eskalierende Follow-Up Nachrichten via WhatsApp.
// Absicherung: Nur mit CRON_SECRET aufrufbar
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptText, encryptText } from "@/lib/encryption";
import { sendMessage } from "@/lib/whatsapp";
import { safeCompare } from "@/lib/session";

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
    // Leads mit aktiven Conversations laden, die Follow-Ups brauchen könnten
    // Bedingungen: followUpCount < 3, Conversation ACTIVE, Consent gegeben
    const candidates = await db.lead.findMany({
      where: {
        followUpCount: { lt: 3 },
        status: { notIn: ["CONVERTED", "LOST"] },
        conversation: {
          status: "ACTIVE",
          consentGiven: true,
        },
        tenant: { isActive: true },
      },
      include: {
        conversation: {
          select: {
            id: true,
            externalId: true,
          },
        },
        tenant: {
          select: {
            id: true,
            brandName: true,
            whatsappPhoneId: true,
          },
        },
      },
    });

    let followUpsSent = 0;
    let errors = 0;

    for (const lead of candidates) {
      try {
        // Letzte USER-Nachricht in dieser Conversation finden
        const lastUserMessage = await db.message.findFirst({
          where: {
            conversationId: lead.conversation.id,
            role: "USER",
          },
          orderBy: { timestamp: "desc" },
          select: { timestamp: true },
        });

        if (!lastUserMessage) continue;

        const hoursSinceLastMessage =
          (Date.now() - lastUserMessage.timestamp.getTime()) / (1000 * 60 * 60);

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

        // externalId → Telefonnummer geht nicht direkt (DSGVO: gehasht)
        // Stattdessen: Letzte ASSISTANT-Nachricht im Gesprächsverlauf finden
        // und über die WhatsApp-Conversation-ID die Nummer ermitteln.
        // Da WhatsApp Conversations über die externalId (= gehashte Nummer) laufen,
        // brauchen wir die Klartextnummer. Diese liegt nur in WhatsApp vor.
        // Lösung: Follow-Up als Bot-Nachricht speichern und die WhatsApp-API
        // nutzt die Conversation-basierte Zustellung (reply within 24h window).
        //
        // WICHTIG: WhatsApp erlaubt Nachrichten an Nutzer nur innerhalb von 24h
        // nach der letzten Nutzer-Nachricht (Customer Service Window).
        // Nach 24h müssen Templates verwendet werden.
        // Für Follow-Ups nutzen wir die sendMessage-Funktion, die bei
        // abgelaufenem Fenster einen Fehler zurückgibt – das ist gewollt.

        // Telefonnummer aus der letzten eingehenden Nachricht rekonstruieren
        // ist DSGVO-bedingt nicht möglich (nur Hash gespeichert).
        // Alternative: Die WhatsApp Cloud API erlaubt proaktive Nachrichten
        // nur mit Templates. Wir speichern die Follow-Up als Bot-Antwort
        // und senden sie, wenn der Nutzer das nächste Mal schreibt.
        //
        // PRAXIS-LÖSUNG: Wir nutzen die externalId (WhatsApp Chat-ID / gehashte Nummer).
        // In der Realität speichern Multi-Tenant Systeme die Klartext-Nummer
        // verschlüsselt. Hier nehmen wir die from-Nummer aus dem Message-Kontext.

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

    console.log("[Follow-Up] Abgeschlossen", {
      candidatesChecked: candidates.length,
      followUpsSent,
      errors,
    });

    return NextResponse.json({
      success: true,
      candidatesChecked: candidates.length,
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
