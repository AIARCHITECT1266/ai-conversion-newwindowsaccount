// ============================================================
// Zentrale Bot-Logik – Nachrichtenverarbeitung
// Ablauf: Nachricht empfangen → DB speichern (verschlüsselt)
// → Claude antwortet → GPT bewertet Lead → Antwort senden
//
// Webhook gibt sofort 200 OK zurueck – diese Datei laeuft
// komplett asynchron im Hintergrund (fire-and-forget).
// ============================================================

import { createHash } from "crypto";
import { db } from "@/shared/db";
import { getTenantByPhoneId } from "@/modules/tenant/resolver";
import { encryptText, decryptText } from "@/modules/encryption/aes";
import { generateReply } from "./claude";
import { scoreLeadFromConversation } from "./gpt";
import { sendMessage } from "@/modules/whatsapp/client";
import { auditLog } from "@/modules/compliance/audit-log";
import { notifyHighScoreLead } from "@/modules/crm/lead-notification";
import { pushLeadToHubSpot } from "@/modules/crm/hubspot";
import { loadSystemPrompt } from "./system-prompts";
import type { MessageRole, LeadStatus } from "@/generated/prisma/enums";
import { processMessage } from "@/lib/bot/processMessage";

// ---------- Retry-Konfiguration ----------

const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelay: 600,
  maxDelay: 2000,
  timeoutMs: 12000, // maximal 12 Sekunden pro Versuch
};

// ---------- Retry-Wrapper mit Timeout ----------

async function withRetry<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T | null> {
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout after ${RETRY_CONFIG.timeoutMs}ms`)),
            RETRY_CONFIG.timeoutMs
          )
        ),
      ]);
    } catch (error) {
      if (attempt === RETRY_CONFIG.maxRetries) {
        console.error(
          `[Handler] ${context} fehlgeschlagen nach ${attempt + 1} Versuchen`,
          { error: error instanceof Error ? error.message : "Unbekannt" }
        );
        return null;
      }
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(1.5, attempt),
        RETRY_CONFIG.maxDelay
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return null;
}

// ---------- DSGVO: Telefonnummern hashen ----------

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
  phoneNumberId: string;
  from: string;
  messageId: string;
  text: string;
  timestamp: string;
}

interface HandleResult {
  success: boolean;
  conversationId?: string;
  error?: string;
}

// ---------- Nachrichten ----------

const CONSENT_MESSAGE =
  "Willkommen! Bevor wir starten: Ihre Nachrichten werden verschlüsselt " +
  "gespeichert und nach unserer Aufbewahrungsfrist automatisch gelöscht. " +
  "Mit Ihrer nächsten Nachricht stimmen Sie der Verarbeitung gemäß unserer " +
  'Datenschutzerklärung zu. Antworten Sie "STOP" um die Verarbeitung zu beenden.';

const FALLBACK_MESSAGE =
  "Entschuldigung, es ist ein technischer Fehler aufgetreten. " +
  "Bitte versuchen Sie es in wenigen Minuten erneut.";

const RETRY_FALLBACK_MESSAGE =
  "Entschuldigung, ich hatte gerade einen kurzen technischen Hänger. " +
  "Können Sie Ihre letzte Nachricht noch einmal schicken? " +
  "Ich bin sofort wieder für Sie da.";

// ---------- Gesprächsverlauf laden (entschlüsselt) ----------

async function loadConversationHistory(conversationId: string) {
  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: "asc" },
    take: 20,
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

// ---------- Hintergrund: Lead-Scoring + CRM ----------

function runScoringPipeline(
  conversationId: string,
  tenantId: string,
  tenantName: string,
  fullHistory: Array<{ role: "user" | "assistant"; content: string }>,
  lastUserMessage: string
): void {
  const scoringText = formatConversationForScoring(fullHistory);

  withRetry(
    () => scoreLeadFromConversation(scoringText),
    "GPT Lead-Scoring"
  )
    .then(async (scoreResult) => {
      if (!scoreResult?.success || scoreResult.score === undefined) return;

      // OPT 1+3: Lead, Conversation und Tenant parallel laden
      const [existingLead, conv, tenantForHubSpot] = await Promise.all([
        db.lead.findUnique({
          where: { conversationId },
          select: { status: true, pipelineStatus: true, dealValue: true, notes: true },
        }),
        db.conversation.findUnique({
          where: { id: conversationId },
          select: { campaignSlug: true, leadSource: true },
        }),
        db.tenant.findUnique({
          where: { id: tenantId },
          select: { hubspotApiKey: true },
        }),
      ]);

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

      // Campaign-Zuordnung ueber Conversation-Slug aufloesen
      let campaignId: string | undefined;
      let abTestVariant: string | undefined;
      let leadSourceResolved: string | undefined;
      if (conv?.leadSource) leadSourceResolved = conv.leadSource;
      if (conv?.campaignSlug) {
        const campaign = await db.campaign.findUnique({
          where: { tenantId_slug: { tenantId, slug: conv.campaignSlug } },
          select: { id: true },
        });
        if (campaign) {
          campaignId = campaign.id;
          const activeTest = await db.abTest.findFirst({
            where: { campaignId: campaign.id, isActive: true },
          });
          if (activeTest) {
            abTestVariant = activeTest.sendsA <= activeTest.sendsB ? "A" : "B";
            await db.abTest.update({
              where: { id: activeTest.id },
              data:
                abTestVariant === "A"
                  ? { sendsA: { increment: 1 } }
                  : { sendsB: { increment: 1 } },
            });
          }
        }
      }

      // OPT 2: Upsert-Ergebnis direkt nutzen statt erneut zu laden
      const upsertedLead = await db.lead.upsert({
        where: { conversationId },
        create: {
          tenantId,
          conversationId,
          score: scoreResult.score,
          qualification: scoreResult.qualification || "UNQUALIFIED",
          status: "NEW",
          ...(campaignId ? { campaignId } : {}),
          ...(abTestVariant ? { abTestVariant } : {}),
          ...(leadSourceResolved ? { source: leadSourceResolved } : {}),
        },
        update: {
          score: scoreResult.score,
          qualification: scoreResult.qualification || "UNQUALIFIED",
          status: finalStatus,
        },
        select: { pipelineStatus: true, dealValue: true, notes: true },
      });

      auditLog("bot.lead_scored", {
        tenantId,
        details: { conversationId, score: scoreResult.score },
      });

      // E-Mail + HubSpot bei Hot-Leads (Score > 70)
      if (scoreResult.score > 70) {
        notifyHighScoreLead({
          tenantName,
          score: scoreResult.score,
          qualification: scoreResult.qualification || "UNQUALIFIED",
          lastMessage: lastUserMessage,
          conversationId,
        }).catch((err) => {
          console.error("[Handler] Lead-Benachrichtigung fehlgeschlagen", {
            error: err instanceof Error ? err.message : "Unbekannt",
          });
        });

        // HubSpot Auto-Push (wenn API-Key konfiguriert)
        if (tenantForHubSpot?.hubspotApiKey) {
          const hubspotKey = decryptText(tenantForHubSpot.hubspotApiKey);
          pushLeadToHubSpot(hubspotKey, {
            leadScore: scoreResult.score,
            qualification: scoreResult.qualification || "UNQUALIFIED",
            pipelineStatus: upsertedLead.pipelineStatus ?? "NEU",
            conversationId,
            tenantName,
            dealValue: upsertedLead.dealValue,
            notes: upsertedLead.notes,
          })
            .then((result) => {
              if (result.success) {
                auditLog("bot.hubspot_pushed", {
                  tenantId,
                  details: { conversationId, contactId: result.contactId },
                });
              }
            })
            .catch((err) => {
              console.error("[Handler] HubSpot-Push fehlgeschlagen", {
                error: err instanceof Error ? err.message : "Unbekannt",
              });
            });
        }
      }
    })
    .catch((error) => {
      console.error("[Handler] Scoring-Pipeline fehlgeschlagen", {
        conversationId,
        error: error instanceof Error ? error.message : "Unbekannt",
      });
    });
}

// ---------- Hauptverarbeitung ----------

/**
 * Verarbeitet eine eingehende WhatsApp-Nachricht:
 * 1. Tenant anhand Phone ID ermitteln
 * 2. Conversation finden oder erstellen
 * 3. DSGVO-Consent pruefen
 * 4. Nachricht verschluesselt speichern
 * 5. Claude-Antwort generieren (mit Retry + Timeout)
 * 6. Antwort verschluesselt speichern & senden
 * 7. Lead-Score mit GPT-4o aktualisieren (async, non-blocking)
 *
 * Wird vom Webhook fire-and-forget aufgerufen.
 * WhatsApp 200 OK ist bereits gesendet bevor diese Funktion laeuft.
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

    // 2. Conversation finden oder erstellen (atomar via upsert)
    const externalId = hashPhoneNumber(message.from);
    const conversationBefore = await db.conversation.findUnique({
      where: {
        tenantId_externalId: { tenantId: tenant.id, externalId },
      },
      select: { id: true, status: true, consentGiven: true },
    });

    // Campaign + Source aus erster Nachricht parsen
    let campaignSlug: string | null = null;
    let leadSource: string | null = null;

    if (!conversationBefore) {
      const qrMatch = message.text.match(/^qr:([a-z0-9-]+)$/i);
      const campaignMatch = message.text.match(/^campaign:([a-z0-9-]+)$/i);

      if (qrMatch) {
        campaignSlug = qrMatch[1].toLowerCase();
        leadSource = "qr";
      } else if (campaignMatch) {
        campaignSlug = campaignMatch[1].toLowerCase();
        leadSource = "link";
      }
    }

    const conversation = await db.conversation.upsert({
      where: {
        tenantId_externalId: { tenantId: tenant.id, externalId },
      },
      create: {
        tenantId: tenant.id,
        externalId,
        status: "ACTIVE",
        ...(campaignSlug ? { campaignSlug } : {}),
        ...(leadSource ? { leadSource } : {}),
      },
      update: {},
    });

    // Feature-Flag: kanal-agnostischer Pfad (Phase 1)
    if (process.env.ENABLE_PROCESS_MESSAGE_V2 === "true") {
      // CLOSED-Conversation Early-Return (Semantik-Paritaet mit altem Pfad, Zeile ~431)
      if (conversationBefore?.status === "CLOSED") {
        return { success: true, conversationId: conversation.id };
      }

      const pmResult = await processMessage({
        tenantId: tenant.id,
        channel: "WHATSAPP",
        conversationId: conversation.id,
        senderIdentifier: externalId,
        message: message.text,
        isNewConversation: !conversationBefore,
        consentGiven: conversationBefore?.consentGiven ?? false,
      });

      // Transport: Bot-Antworten nach Persistenz an WhatsApp senden
      for (const response of pmResult.responses) {
        const sendResult = await sendMessage(message.from, response, message.phoneNumberId);
        if (!sendResult.success) {
          console.error("[Handler] WhatsApp-Transport-Fehler", {
            conversationId: conversation.id,
            error: sendResult.error,
          });
        }
      }

      return {
        success: pmResult.success,
        conversationId: pmResult.conversationId,
        error: pmResult.error,
      };
    }

    // Alter Pfad (unveraendert — aktiv wenn ENABLE_PROCESS_MESSAGE_V2 != "true")
    // Neue Konversation: DSGVO-Consent anfordern
    if (!conversationBefore) {
      const sendResult = await sendMessage(message.from, CONSENT_MESSAGE, message.phoneNumberId);
      if (!sendResult.success) {
        console.error("[Handler] Consent-Nachricht konnte nicht gesendet werden", {
          conversationId: conversation.id,
          error: sendResult.error,
        });
      }

      auditLog("bot.conversation_created", {
        tenantId: tenant.id,
        details: { conversationId: conversation.id },
      });
      auditLog("bot.consent_requested", {
        tenantId: tenant.id,
        details: { conversationId: conversation.id },
      });

      return { success: true, conversationId: conversation.id };
    }

    // 3. STOP-Befehl pruefen (DSGVO: Verarbeitung beenden)
    if (message.text.trim().toUpperCase() === "STOP") {
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

      auditLog("bot.conversation_stopped", {
        tenantId: tenant.id,
        details: { conversationId: conversation.id },
      });

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

    // 5. Nutzer-Nachricht verschluesselt speichern
    await saveMessage(conversation.id, "USER", message.text);

    // 6. Gespraechsverlauf laden und Claude-Antwort generieren (mit Retry)
    const history = await loadConversationHistory(conversation.id);
    const resolvedPrompt = loadSystemPrompt({
      systemPrompt: tenant.systemPrompt,
      paddlePlan: tenant.paddlePlan,
      brandName: tenant.brandName,
      name: tenant.name,
    });

    const claudeResult = await withRetry(
      () =>
        generateReply(
          resolvedPrompt,
          tenant.brandName,
          history.slice(0, -1),
          message.text
        ),
      "Claude Antwortgenerierung"
    );

    // Alle Retries fehlgeschlagen oder Timeout → freundliche Fallback-Nachricht
    if (!claudeResult || !claudeResult.success || !claudeResult.reply) {
      console.error("[Handler] Claude-Antwort fehlgeschlagen nach allen Retries", {
        conversationId: conversation.id,
        error: claudeResult?.error ?? "Timeout oder null",
      });

      await sendMessage(message.from, RETRY_FALLBACK_MESSAGE, message.phoneNumberId);

      return {
        success: false,
        conversationId: conversation.id,
        error: claudeResult?.error ?? "Claude nicht erreichbar",
      };
    }

    // 7. Claude-Antwort verschluesselt speichern & parallel senden
    const [, sendResult] = await Promise.all([
      saveMessage(conversation.id, "ASSISTANT", claudeResult.reply),
      sendMessage(message.from, claudeResult.reply, message.phoneNumberId),
    ]);

    if (!sendResult.success) {
      console.error("[Handler] WhatsApp-Nachricht konnte nicht gesendet werden", {
        conversationId: conversation.id,
        error: sendResult.error,
      });
      auditLog("bot.reply_failed", {
        tenantId: tenant.id,
        details: { conversationId: conversation.id },
      });
    }

    auditLog("bot.reply_sent", {
      tenantId: tenant.id,
      details: { conversationId: conversation.id },
    });

    // 8. Lead-Scoring + CRM komplett asynchron (blockiert nichts)
    const fullHistory = [
      ...history,
      { role: "assistant" as const, content: claudeResult.reply },
    ];

    runScoringPipeline(
      conversation.id,
      tenant.id,
      tenant.name,
      fullHistory,
      message.text
    );

    return { success: true, conversationId: conversation.id };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";

    console.error("[Handler] Verarbeitungsfehler", { error: errorMessage });

    return { success: false, error: errorMessage };
  }
}
