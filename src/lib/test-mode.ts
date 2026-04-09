// ============================================================
// Web-Test-Modus: In-Memory Chat ohne DB-Persistierung
// Erlaubt Live-Demos des KI-Bots ohne WhatsApp-Verbindung.
// Sessions werden nach 15 Minuten automatisch geloescht.
// KEIN Schreiben in DB (Conversation, Message, Lead).
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/shared/db";
import { loadSystemPrompt } from "@/modules/bot/system-prompts";

// ---------- Session-Management ----------

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TestSession {
  messages: ChatMessage[];
  expiresAt: number;
}

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 Minuten
const MAX_MESSAGES = 20;

const sessions = new Map<string, TestSession>();

// Abgelaufene Sessions entfernen
function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (session.expiresAt < now) {
      sessions.delete(key);
    }
  }
}

// ---------- Oeffentliche API ----------

/**
 * Sendet eine Nachricht im Test-Modus und gibt die Bot-Antwort zurueck.
 * Keine Daten werden in der Datenbank gespeichert.
 */
export async function sendTestMessage(
  tenantId: string,
  userMessage: string
): Promise<string> {
  // Cleanup bei jedem Aufruf
  cleanupExpiredSessions();

  // Session laden oder erstellen
  let session = sessions.get(tenantId);
  if (!session || session.expiresAt < Date.now()) {
    session = { messages: [], expiresAt: Date.now() + SESSION_TTL_MS };
    sessions.set(tenantId, session);
  }

  // Demo-Limit pruefen
  if (session.messages.length >= MAX_MESSAGES) {
    return "Demo-Limit erreicht. Bitte kontaktiere uns direkt.";
  }

  // User-Nachricht hinzufuegen
  session.messages.push({ role: "user", content: userMessage });

  // Tenant-Daten laden (nur noetige Felder)
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      systemPrompt: true,
      brandName: true,
      name: true,
      paddlePlan: true,
    },
  });

  if (!tenant) {
    return "Konfigurationsfehler. Bitte versuche es spaeter erneut.";
  }

  // System-Prompt ueber bestehende Loader-Funktion erstellen
  const systemPrompt = loadSystemPrompt(tenant);

  // Anthropic-Call
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return "Der Bot ist aktuell nicht verfuegbar. Bitte versuche es spaeter.";
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: session.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const assistantMessage = textBlock && textBlock.type === "text"
      ? textBlock.text
      : "Entschuldigung, ich konnte keine Antwort generieren.";

    // Antwort zur Session hinzufuegen
    session.messages.push({ role: "assistant", content: assistantMessage });

    // TTL erneuern
    session.expiresAt = Date.now() + SESSION_TTL_MS;

    return assistantMessage;
  } catch (error) {
    console.error("[Test-Mode] Anthropic-Fehler", {
      tenantId,
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return "Der Bot ist aktuell nicht verfuegbar. Bitte versuche es spaeter.";
  }
}
