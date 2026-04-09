// ============================================================
// Kanal-agnostische Bot-Nachrichtenverarbeitung
// Extrahiert aus src/modules/bot/handler.ts (Phase 1).
// Kennt keine HTTP-Details, keine Transport-Schicht.
// Persistiert User- UND Bot-Nachrichten VOR Transport
// (siehe docs/decisions/phase-0-decisions.md, Entscheidung 3).
// ============================================================

import { db } from "@/shared/db";
import { encryptText, decryptText } from "@/modules/encryption/aes";
import { generateReply } from "@/modules/bot/claude";
import { scoreLeadFromConversation } from "@/modules/bot/gpt";
import { auditLog } from "@/modules/compliance/audit-log";
import { loadSystemPrompt } from "@/modules/bot/system-prompts";
import { notifyHighScoreLead } from "@/modules/crm/lead-notification";
import { pushLeadToHubSpot } from "@/modules/crm/hubspot";
import type { MessageRole, LeadStatus } from "@/generated/prisma/enums";

// ---------- Typen ----------

export type ProcessMessageInput = {
  tenantId: string;
  channel: "WHATSAPP" | "WEB";
  conversationId: string;
  senderIdentifier: string; // WhatsApp: phoneHash, Web: sessionId
  message: string;
  isNewConversation: boolean;
  consentGiven: boolean;
};

export type ProcessMessageResult = {
  success: boolean;
  conversationId: string;
  responses: string[];
  conversationStatus: "ACTIVE" | "CLOSED";
  needsConsent: boolean;
  error?: string;
};

// ---------- Konstanten ----------

const CONSENT_MESSAGE =
  "Willkommen! Bevor wir starten: Ihre Nachrichten werden verschlüsselt " +
  "gespeichert und nach unserer Aufbewahrungsfrist automatisch gelöscht. " +
  "Mit Ihrer nächsten Nachricht stimmen Sie der Verarbeitung gemäß unserer " +
  'Datenschutzerklärung zu. Antworten Sie "STOP" um die Verarbeitung zu beenden.';

const STOP_RESPONSE =
  "Ihre Daten werden nicht mehr verarbeitet. " +
  "Bestehende Daten werden nach Ablauf der Aufbewahrungsfrist gelöscht. " +
  "Vielen Dank für Ihr Vertrauen.";

const RETRY_FALLBACK_MESSAGE =
  "Entschuldigung, ich hatte gerade einen kurzen technischen Hänger. " +
  "Können Sie Ihre letzte Nachricht noch einmal schicken? " +
  "Ich bin sofort wieder für Sie da.";

// Lead-Status-Hierarchie: Hoeherer Index = weiter fortgeschritten
const LEAD_STATUS_ORDER = ["NEW", "CONTACTED", "APPOINTMENT_SET", "CONVERTED", "LOST"] as const;

// ---------- Retry-Konfiguration ----------

const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelay: 600,
  maxDelay: 2000,
  timeoutMs: 12000,
};

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
          `[processMessage] ${context} fehlgeschlagen nach ${attempt + 1} Versuchen`,
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

// ---------- DB-Hilfsfunktionen ----------

// Gespraechsverlauf laden (entschluesselt)
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

// Gespraechstext fuer Lead-Scoring formatieren
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

// Nachricht verschluesselt in DB speichern
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

      // Lead, Conversation und Tenant parallel laden
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
          console.error("[processMessage] Lead-Benachrichtigung fehlgeschlagen", {
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
              console.error("[processMessage] HubSpot-Push fehlgeschlagen", {
                error: err instanceof Error ? err.message : "Unbekannt",
              });
            });
        }
      }
    })
    .catch((error) => {
      console.error("[processMessage] Scoring-Pipeline fehlgeschlagen", {
        conversationId,
        error: error instanceof Error ? error.message : "Unbekannt",
      });
    });
}

// ---------- Hauptfunktion ----------

/**
 * Verarbeitet eine eingehende Nachricht kanal-agnostisch.
 *
 * Verantwortlichkeiten:
 * - DSGVO-Consent-Logik (Anfordern, Markieren, STOP)
 * - Nachrichten verschluesselt persistieren (User + Bot)
 * - Claude-Antwort generieren
 * - Lead-Scoring asynchron starten
 *
 * NICHT verantwortlich fuer:
 * - Transport (WhatsApp sendMessage, Web-Polling) → Caller
 * - Tenant-Aufloesung → Caller
 * - Conversation-Erstellung → Caller
 */
export async function processMessage(
  input: ProcessMessageInput
): Promise<ProcessMessageResult> {
  const {
    tenantId,
    channel,
    conversationId,
    message,
    isNewConversation,
    consentGiven,
  } = input;

  try {
    // Neue Konversation: DSGVO-Consent anfordern, Nachricht NICHT speichern
    if (isNewConversation) {
      auditLog("bot.conversation_created", {
        tenantId,
        details: { conversationId, channel },
      });
      auditLog("bot.consent_requested", {
        tenantId,
        details: { conversationId, channel },
      });

      return {
        success: true,
        conversationId,
        responses: [CONSENT_MESSAGE],
        conversationStatus: "ACTIVE",
        needsConsent: true,
      };
    }

    // STOP-Befehl pruefen (DSGVO: Verarbeitung beenden)
    if (message.trim().toUpperCase() === "STOP") {
      await db.conversation.update({
        where: { id: conversationId },
        data: { status: "CLOSED" },
      });

      auditLog("bot.conversation_stopped", {
        tenantId,
        details: { conversationId, channel },
      });

      return {
        success: true,
        conversationId,
        responses: [STOP_RESPONSE],
        conversationStatus: "CLOSED",
        needsConsent: false,
      };
    }

    // Consent als erteilt markieren (zweite Nachricht = Zustimmung)
    if (!consentGiven) {
      await db.conversation.update({
        where: { id: conversationId },
        data: {
          consentGiven: true,
          consentAt: new Date(),
        },
      });
    }

    // Nutzer-Nachricht verschluesselt speichern
    await saveMessage(conversationId, "USER", message);

    // Tenant-Daten fuer System-Prompt laden
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        systemPrompt: true,
        paddlePlan: true,
        brandName: true,
        name: true,
      },
    });

    if (!tenant) {
      return {
        success: false,
        conversationId,
        responses: [],
        conversationStatus: "ACTIVE",
        needsConsent: false,
        error: "Tenant nicht gefunden",
      };
    }

    // Gespraechsverlauf laden und Claude-Antwort generieren
    const history = await loadConversationHistory(conversationId);
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
          message
        ),
      "Claude Antwortgenerierung"
    );

    // Claude fehlgeschlagen → Fallback-Nachricht (NICHT persistiert)
    if (!claudeResult || !claudeResult.success || !claudeResult.reply) {
      console.error("[processMessage] Claude fehlgeschlagen nach allen Retries", {
        conversationId,
        error: claudeResult?.error ?? "Timeout oder null",
      });

      return {
        success: false,
        conversationId,
        responses: [RETRY_FALLBACK_MESSAGE],
        conversationStatus: "ACTIVE",
        needsConsent: false,
        error: claudeResult?.error ?? "Claude nicht erreichbar",
      };
    }

    // Bot-Antwort persistieren VOR Transport (Entscheidung 3)
    await saveMessage(conversationId, "ASSISTANT", claudeResult.reply);

    auditLog("bot.reply_sent", {
      tenantId,
      details: { conversationId, channel },
    });

    // Lead-Scoring + CRM asynchron starten (blockiert nicht)
    const fullHistory = [
      ...history,
      { role: "assistant" as const, content: claudeResult.reply },
    ];

    runScoringPipeline(
      conversationId,
      tenantId,
      tenant.name,
      fullHistory,
      message
    );

    return {
      success: true,
      conversationId,
      responses: [claudeResult.reply],
      conversationStatus: "ACTIVE",
      needsConsent: false,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";

    console.error("[processMessage] Verarbeitungsfehler", {
      conversationId,
      error: errorMessage,
    });

    return {
      success: false,
      conversationId,
      responses: [],
      conversationStatus: "ACTIVE",
      needsConsent: false,
      error: errorMessage,
    };
  }
}
