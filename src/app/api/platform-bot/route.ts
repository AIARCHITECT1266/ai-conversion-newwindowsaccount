import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/shared/rate-limit";

// ---------- API-Client Singleton (Lazy-Init) ----------

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY nicht konfiguriert");
    _anthropic = new Anthropic({ apiKey });
  }
  return _anthropic;
}

// ---------- Zod-Schemas ----------

const historyItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(5000),
});

const requestSchema = z.object({
  message: z.string().min(1, "Nachricht fehlt").max(2000, "Nachricht darf maximal 2.000 Zeichen lang sein"),
  history: z.array(historyItemSchema).max(10).optional().default([]),
});

// Plattform-Wissensbasis fuer den Support-Bot
const PLATFORM_KNOWLEDGE = `
Du bist der AI Conversion Plattform-Assistent. Du hilfst Kunden (Tenants) bei Fragen zur Plattform.

## Über AI Conversion
AI Conversion ist eine SaaS-Plattform für KI-gestützte WhatsApp-Bots im Vertrieb.
Unternehmen können damit automatisiert Leads qualifizieren, Termine vereinbaren und Kunden betreuen.

## Funktionen
- **WhatsApp-Bot**: Automatische Antworten über die WhatsApp Business API
- **Lead-Qualifizierung**: Automatische Bewertung und Kategorisierung von Leads (Unqualified → Marketing Qualified → Sales Qualified → Opportunity → Customer)
- **Termin-Vereinbarung**: Der Bot kann direkt Termine mit potenziellen Kunden buchen
- **Multi-AI**: Parallel-Anfragen an verschiedene KI-Modelle (Claude, GPT-4o, Gemini, Mistral)
- **DSGVO-Konformität**: Alle Nachrichten werden mit AES-256-GCM verschlüsselt, Server in Frankfurt
- **Lead-Pipeline**: Visualisierung des gesamten Vertriebstrichters
- **Session-Zusammenfassungen**: Automatische Gesprächszusammenfassungen

## Einrichtung
1. WhatsApp Business Account verbinden (Phone-ID wird im System hinterlegt)
2. System-Prompt anpassen (definiert die Bot-Persönlichkeit und Antwortlogik)
3. Markenfarbe und -name konfigurieren
4. Bot aktivieren

## Datenaufbewahrung
- Standard: 90 Tage (konfigurierbar pro Tenant)
- Alle Daten DSGVO-konform in Frankfurt gespeichert
- Nachrichten werden verschlüsselt gespeichert

## Lead-Status
- NEW: Neuer Lead, noch nicht kontaktiert
- CONTACTED: Erster Kontakt hergestellt
- APPOINTMENT_SET: Termin vereinbart
- CONVERTED: Zum Kunden konvertiert
- LOST: Lead verloren

## Conversation-Status
- ACTIVE: Laufende Konversation
- PAUSED: Pausiert (z.B. außerhalb Geschäftszeiten)
- CLOSED: Abgeschlossen
- ARCHIVED: Archiviert

## Support
Bei technischen Problemen: support@ai-conversion.ai
Für Upgrades und Enterprise-Anfragen: sales@ai-conversion.ai

Antworte immer auf Deutsch, freundlich und hilfreich. Halte dich kurz und präzise.
`;

export async function POST(req: NextRequest) {
  // Rate-Limiting: 20 Anfragen pro Minute pro IP
  const ip = getClientIp(req);
  const limit = await checkRateLimit(`platform-bot:${ip}`, { max: 20, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 });
  }

  try {
    const rawBody: unknown = await req.json();
    const parseResult = requestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { message, history } = parseResult.data;
    const client = getAnthropic();

    // Chat-Verlauf aufbauen (bereits via Zod validiert)
    const messages: Anthropic.MessageParam[] = [
      ...history.map((msg) => ({ role: msg.role as "user" | "assistant", content: msg.content })),
      { role: "user" as const, content: message },
    ];

    // Timeout: 30 Sekunden
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await client.messages.create(
        {
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: PLATFORM_KNOWLEDGE,
          messages,
        },
        { signal: controller.signal }
      );

      // Null-sichere Content-Extraktion
      const text =
        response.content.length > 0 && response.content[0].type === "text"
          ? response.content[0].text
          : "";

      return NextResponse.json({ reply: text });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[Platform-Bot] Fehler", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json(
      { error: "Interner Fehler beim Plattform-Bot" },
      { status: 500 }
    );
  }
}
