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
import { pushLeadToHubSpot } from "../hubspot";
import { loadSystemPrompt } from "./system-prompts";
import type { MessageRole, LeadStatus } from "@/generated/prisma/enums";

// DSGVO: Telefonnummern nie als Klartext speichern
function hashPhoneNumber(phone: string): string {
  const salt = process.env.ENCRYPTION_KEY;
  if (!salt) {
    throw new Error("[Handler] ENCRYPTION_KEY fehlt – Telefonnummern können nicht gehasht werden");
  }
  return createHash("sha256").update(phone + salt).digest("hex");
}

// Lead-Status-Hierarchie: Höherer Index = weiter fortgeschritten
const LEAD_STATUS_ORDER = ["NEW", "CONTACTED", "APPOINTMENT_SET", "CONVERTED", "LOST"] as const;

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

const FALLBACK_MESSAGE =
  "Entschuldigung, es ist ein technischer Fehler aufgetreten. " +
  "Bitte versuchen Sie es in wenigen Minuten erneut.";

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
      select: { id: true, status: true, consentGiven: true },
    });

    // Campaign-Slug aus erster Nachricht parsen (wa.me/...?text=campaign:slug)
    const campaignMatch = !conversationBefore
      ? message.text.match(/^campaign:([a-z0-9-]+)$/i)
      : null;
    const campaignSlug = campaignMatch ? campaignMatch[1].toLowerCase() : null;

    const conversation = await db.conversation.upsert({
      where: {
        tenantId_externalId: { tenantId: tenant.id, externalId },
      },
      create: {
        tenantId: tenant.id,
        externalId,
        status: "ACTIVE",
        ...(campaignSlug ? { campaignSlug } : {}),
      },
      update: {}, // Keine Aenderung wenn bereits vorhanden
    });

    // Neue Konversation: DSGVO-Consent anfordern
    if (!conversationBefore) {
      const sendResult = await sendMessage(message.from, CONSENT_MESSAGE, message.phoneNumberId);
      if (!sendResult.success) {
        console.error("[Handler] Consent-Nachricht konnte nicht gesendet werden", {
          conversationId: conversation.id,
          error: sendResult.error,
        });
      }

      auditLog("bot.conversation_created", { tenantId: tenant.id, details: { conversationId: conversation.id } });
      auditLog("bot.consent_requested", { tenantId: tenant.id, details: { conversationId: conversation.id } });

      return { success: true, conversationId: conversation.id };
    }

    // 3. STOP-Befehl prüfen (DSGVO: Verarbeitung beenden)
    if (message.text.trim().toUpperCase() === "STOP") {
      // Bereits geschlossene Conversations nicht erneut verarbeiten
      if (conversationBefore.status === "CLOSED") {
        return { success: true, conversationId: conversation.id };
      }

      await db.conversation.update({
        where: { id: conversation.id },
        data: { status: "CLOSED" },
      });

      const sendResult = await sendMessage(
        message.from,
        "Ihre Daten werden nicht mehr verarbeitet. " +
          "Bestehende Daten werden nach Ablauf der Aufbewahrungsfrist gelöscht. " +
          "Vielen Dank für Ihr Vertrauen.",
        message.phoneNumberId
      );
      if (!sendResult.success) {
        console.error("[Handler] STOP-Bestätigung konnte nicht gesendet werden", {
          conversationId: conversation.id,
        });
      }

      auditLog("bot.conversation_stopped", { tenantId: tenant.id, details: { conversationId: conversation.id } });

      return { success: true, conversationId: conversation.id };
    }

    // 4. Consent als erteilt markieren (zweite Nachricht = Zustimmung)
    if (!conversationBefore.consentGiven) {
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
    // System-Prompt laden: Tenant-eigener Prompt oder plan-spezifischer Default
    const resolvedPrompt = loadSystemPrompt({
      systemPrompt: tenant.systemPrompt,
      paddlePlan: tenant.paddlePlan,
      brandName: tenant.brandName,
      name: tenant.name,
    });

    const claudeResult = await generateReply(
      resolvedPrompt,
      tenant.brandName,
      history.slice(0, -1), // Ohne die gerade gespeicherte Nachricht (wird als userMessage übergeben)
      message.text
    );

    if (!claudeResult.success || !claudeResult.reply) {
      console.error("[Handler] Claude-Antwort fehlgeschlagen", {
        conversationId: conversation.id,
        error: claudeResult.error,
      });

      // Fallback-Nachricht an den Nutzer senden, damit er nicht ohne Antwort bleibt
      await sendMessage(message.from, FALLBACK_MESSAGE, message.phoneNumberId);

      return {
        success: false,
        conversationId: conversation.id,
        error: claudeResult.error,
      };
    }

    // 7. Claude-Antwort verschlüsselt speichern & parallel senden
    const [, sendResult] = await Promise.all([
      saveMessage(conversation.id, "ASSISTANT", claudeResult.reply),
      sendMessage(message.from, claudeResult.reply, message.phoneNumberId),
    ]);

    if (!sendResult.success) {
      console.error("[Handler] WhatsApp-Nachricht konnte nicht gesendet werden", {
        conversationId: conversation.id,
        error: sendResult.error,
      });
      auditLog("bot.reply_failed", { tenantId: tenant.id, details: { conversationId: conversation.id } });
    }

    // 8. Lead-Score aktualisieren (im Hintergrund, blockiert nicht die Antwort)
    const fullHistory = [
      ...history,
      { role: "assistant" as const, content: claudeResult.reply },
    ];
    const scoringText = formatConversationForScoring(fullHistory);

    // Lead-Scoring asynchron – Fehler werden geloggt, blockieren aber nicht
    scoreLeadFromConversation(scoringText)
      .then(async (scoreResult) => {
        if (!scoreResult.success || scoreResult.score === undefined) return;

        // Bestehenden Lead laden um Status-Downgrade zu verhindern
        const existingLead = await db.lead.findUnique({
          where: { conversationId: conversation.id },
          select: { status: true },
        });

        // Neuen Status berechnen (nie herabstufen)
        const proposedStatus: LeadStatus = scoreResult.score >= 76 ? "CONTACTED" : "NEW";
        let finalStatus: LeadStatus = proposedStatus;
        if (existingLead) {
          const currentIdx = LEAD_STATUS_ORDER.indexOf(
            existingLead.status as typeof LEAD_STATUS_ORDER[number]
          );
          const proposedIdx = LEAD_STATUS_ORDER.indexOf(
            proposedStatus as typeof LEAD_STATUS_ORDER[number]
          );
          if (currentIdx > proposedIdx) {
            finalStatus = existingLead.status as LeadStatus;
          }
        }

        // Campaign-Zuordnung über Conversation-Slug auflösen
        let campaignId: string | undefined;
        const conv = await db.conversation.findUnique({
          where: { id: conversation.id },
          select: { campaignSlug: true },
        });
        if (conv?.campaignSlug) {
          const campaign = await db.campaign.findUnique({
            where: { tenantId_slug: { tenantId: tenant.id, slug: conv.campaignSlug } },
            select: { id: true },
          });
          if (campaign) campaignId = campaign.id;
        }

        await db.lead.upsert({
          where: { conversationId: conversation.id },
          create: {
            tenantId: tenant.id,
            conversationId: conversation.id,
            score: scoreResult.score,
            qualification: scoreResult.qualification || "UNQUALIFIED",
            status: "NEW",
            ...(campaignId ? { campaignId } : {}),
          },
          update: {
            score: scoreResult.score,
            qualification: scoreResult.qualification || "UNQUALIFIED",
            status: finalStatus,
          },
        });

        auditLog("bot.lead_scored", {
          tenantId: tenant.id,
          details: { conversationId: conversation.id, score: scoreResult.score },
        });

        // E-Mail-Benachrichtigung bei Hot-Leads (Score > 70)
        if (scoreResult.score > 70) {
          notifyHighScoreLead({
            tenantName: tenant.name,
            score: scoreResult.score,
            qualification: scoreResult.qualification || "UNQUALIFIED",
            lastMessage: message.text,
            conversationId: conversation.id,
          }).catch((err) => {
            console.error("[Handler] Lead-Benachrichtigung fehlgeschlagen", {
              error: err instanceof Error ? err.message : "Unbekannt",
            });
          });

          // HubSpot Auto-Push bei Score > 70 (wenn API-Key konfiguriert)
          const tenantFull = await db.tenant.findUnique({
            where: { id: tenant.id },
            select: { hubspotApiKey: true },
          });
          if (tenantFull?.hubspotApiKey) {
            const hubspotKey = decryptText(tenantFull.hubspotApiKey);
            const currentLead = await db.lead.findUnique({
              where: { conversationId: conversation.id },
              select: { pipelineStatus: true, dealValue: true, notes: true },
            });
            pushLeadToHubSpot(hubspotKey, {
              leadScore: scoreResult.score,
              qualification: scoreResult.qualification || "UNQUALIFIED",
              pipelineStatus: currentLead?.pipelineStatus ?? "NEU",
              conversationId: conversation.id,
              tenantName: tenant.name,
              dealValue: currentLead?.dealValue,
              notes: currentLead?.notes,
            }).then((result) => {
              if (result.success) {
                auditLog("bot.hubspot_pushed", { tenantId: tenant.id, details: { conversationId: conversation.id, contactId: result.contactId } });
              }
            }).catch((err) => {
              console.error("[Handler] HubSpot-Push fehlgeschlagen", {
                error: err instanceof Error ? err.message : "Unbekannt",
              });
            });
          }
        }
      })
      .catch((error) => {
        console.error("[Handler] Lead-Scoring fehlgeschlagen", {
          conversationId: conversation.id,
          error: error instanceof Error ? error.message : "Unbekannt",
        });
      });

    auditLog("bot.reply_sent", { tenantId: tenant.id, details: { conversationId: conversation.id } });

    return { success: true, conversationId: conversation.id };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";

    console.error("[Handler] Verarbeitungsfehler", { error: errorMessage });

    return { success: false, error: errorMessage };
  }
}
