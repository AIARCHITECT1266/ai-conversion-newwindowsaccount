// ============================================================
// Zentrale Bot-Logik – Nachrichtenverarbeitung
// Ablauf: Nachricht empfangen → DB speichern (verschlüsselt)
// → Claude antwortet → GPT bewertet Lead → Antwort senden
// ============================================================

import { createHash } from "crypto";
import { db } from "../db";
import { getTenantByPhoneId } from "../tenant";
import { encryptText, decryptText } from "../encryption";
import { generateReply } from "./claude";
import { scoreLeadFromConversation } from "./gpt";
import { sendMessage } from "../whatsapp";
import { auditLog } from "../audit-log";
import { notifyHighScoreLead } from "../lead-notification";
import type { MessageRole } from "@/generated/prisma/enums";

// DSGVO: Telefonnummern nie als Klartext speichern
function hashPhoneNumber(phone: string): string {
  const salt = process.env.ENCRYPTION_KEY || "";
  return createHash("sha256").update(phone + salt).digest("hex");
}

// ---------- Typen ----------

interface IncomingMessage {
  phoneNumberId: string; // WhatsApp Business Phone Number ID
  from: string; // Absender-Telefonnummer
  messageId: string; // WhatsApp Message ID
  text: string; // Nachrichteninhalt
  timestamp: string; // Unix-Timestamp
}

interface HandleResult {
  success: boolean;
  conversationId?: string;
  error?: string;
}

// ---------- DSGVO: Consent-Nachricht ----------

const CONSENT_MESSAGE =
  "Willkommen! Bevor wir starten: Ihre Nachrichten werden verschlüsselt " +
  "gespeichert und nach unserer Aufbewahrungsfrist automatisch gelöscht. " +
  "Mit Ihrer nächsten Nachricht stimmen Sie der Verarbeitung gemäß unserer " +
  'Datenschutzerklärung zu. Antworten Sie "STOP" um die Verarbeitung zu beenden.';

// ---------- Gesprächsverlauf laden (entschlüsselt) ----------

async function loadConversationHistory(conversationId: string) {
  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: "asc" },
    take: 20, // Letzte 20 Nachrichten für Kontext
  });

  return messages.map((msg) => ({
    role: msg.role === "USER" ? ("user" as const) : ("assistant" as const),
    content: decryptText(msg.contentEncrypted),
  }));
}

// ---------- Gesprächstext für Lead-Scoring formatieren ----------

function formatConversationForScoring(
  messages: Array<{ role: "user" | "assistant"; content: string }>
): string {
  return messages
    .map((msg) => {
      const label = msg.role === "user" ? "Kunde" : "Assistent";
      return `${label}: ${msg.content}`;
    })
    .join("\n");
}

// ---------- Nachricht in DB speichern (verschlüsselt) ----------

async function saveMessage(
  conversationId: string,
  role: MessageRole,
  content: string
) {
  return db.message.create({
    data: {
      conversationId,
      role,
      contentEncrypted: encryptText(content),
      messageType: "TEXT",
    },
  });
}

// ---------- Hauptverarbeitung ----------

/**
 * Verarbeitet eine eingehende WhatsApp-Nachricht:
 * 1. Tenant anhand Phone ID ermitteln
 * 2. Conversation finden oder erstellen
 * 3. DSGVO-Consent prüfen
 * 4. Nachricht verschlüsselt speichern
 * 5. Claude-Antwort generieren
 * 6. Antwort verschlüsselt speichern & senden
 * 7. Lead-Score mit GPT-4o aktualisieren
 */
export async function handleIncomingMessage(
  message: IncomingMessage
): Promise<HandleResult> {
  try {
    // 1. Tenant ermitteln
    const tenant = await getTenantByPhoneId(message.phoneNumberId);
    if (!tenant) {
      return { success: false, error: "Kein Tenant für diese Phone ID" };
    }

    // 2. Conversation finden oder erstellen (atomar via upsert gegen Race Conditions)
    const externalId = hashPhoneNumber(message.from);
    const conversationBefore = await db.conversation.findUnique({
      where: {
        tenantId_externalId: { tenantId: tenant.id, externalId },
      },
      select: { id: true },
    });

    const conversation = await db.conversation.upsert({
      where: {
        tenantId_externalId: { tenantId: tenant.id, externalId },
      },
      create: {
        tenantId: tenant.id,
        externalId,
        status: "ACTIVE",
      },
      update: {}, // Keine Aenderung wenn bereits vorhanden
    });

    // Neue Konversation: DSGVO-Consent anfordern
    if (!conversationBefore) {
      await sendMessage(message.from, CONSENT_MESSAGE, message.phoneNumberId);

      auditLog("bot.conversation_created", { tenantId: tenant.id, details: { conversationId: conversation.id } });
      auditLog("bot.consent_requested", { tenantId: tenant.id, details: { conversationId: conversation.id } });

      return { success: true, conversationId: conversation.id };
    }

    // 3. STOP-Befehl prüfen (DSGVO: Verarbeitung beenden)
    if (message.text.trim().toUpperCase() === "STOP") {
      await db.conversation.update({
        where: { id: conversation.id },
        data: { status: "CLOSED" },
      });

      await sendMessage(
        message.from,
        "Ihre Daten werden nicht mehr verarbeitet. " +
          "Bestehende Daten werden nach Ablauf der Aufbewahrungsfrist gelöscht. " +
          "Vielen Dank für Ihr Vertrauen.",
        message.phoneNumberId
      );

      auditLog("bot.conversation_stopped", { tenantId: tenant.id, details: { conversationId: conversation.id } });

      return { success: true, conversationId: conversation.id };
    }

    // 4. Consent als erteilt markieren (zweite Nachricht = Zustimmung)
    if (!conversation.consentGiven) {
      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          consentGiven: true,
          consentAt: new Date(),
        },
      });
    }

    // 5. Nutzer-Nachricht verschlüsselt speichern
    await saveMessage(conversation.id, "USER", message.text);

    // 6. Gesprächsverlauf laden und Claude-Antwort generieren
    const history = await loadConversationHistory(conversation.id);
    const claudeResult = await generateReply(
      tenant.systemPrompt,
      tenant.brandName,
      history.slice(0, -1), // Ohne die gerade gespeicherte Nachricht (die wird als userMessage übergeben)
      message.text
    );

    if (!claudeResult.success || !claudeResult.reply) {
      console.error("[Handler] Claude-Antwort fehlgeschlagen", {
        conversationId: conversation.id,
        error: claudeResult.error,
      });
      return {
        success: false,
        conversationId: conversation.id,
        error: claudeResult.error,
      };
    }

    // 7. Claude-Antwort verschlüsselt speichern & senden
    await saveMessage(conversation.id, "ASSISTANT", claudeResult.reply);
    await sendMessage(message.from, claudeResult.reply, message.phoneNumberId);

    // 8. Lead-Score aktualisieren – History wiederverwenden statt erneut laden
    const fullHistory = [
      ...history,
      { role: "assistant" as const, content: claudeResult.reply },
    ];
    const scoringText = formatConversationForScoring(fullHistory);
    const scoreResult = await scoreLeadFromConversation(scoringText);

    if (scoreResult.success && scoreResult.score !== undefined) {
      await db.lead.upsert({
        where: { conversationId: conversation.id },
        create: {
          tenantId: tenant.id,
          conversationId: conversation.id,
          score: scoreResult.score,
          qualification: scoreResult.qualification || "UNQUALIFIED",
          status: "NEW",
        },
        update: {
          score: scoreResult.score,
          qualification: scoreResult.qualification || "UNQUALIFIED",
          status:
            scoreResult.score >= 76 ? "CONTACTED" : "NEW",
        },
      });
    }

    auditLog("bot.reply_sent", { tenantId: tenant.id, details: { conversationId: conversation.id } });
    if (scoreResult.success) {
      auditLog("bot.lead_scored", { tenantId: tenant.id, details: { conversationId: conversation.id, score: scoreResult.score } });

      // E-Mail-Benachrichtigung bei Hot-Leads (Score > 70)
      if (scoreResult.score !== undefined && scoreResult.score > 70) {
        notifyHighScoreLead({
          tenantName: tenant.name,
          score: scoreResult.score,
          qualification: scoreResult.qualification || "UNQUALIFIED",
          lastMessage: message.text,
          conversationId: conversation.id,
        });
      }
    }

    return { success: true, conversationId: conversation.id };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";

    console.error("[Handler] Verarbeitungsfehler", { error: errorMessage });

    return { success: false, error: errorMessage };
  }
}
