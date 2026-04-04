import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Plattform-Wissensbasis für den Support-Bot
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
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Nachricht fehlt" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API nicht konfiguriert" },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Chat-Verlauf aufbauen
    const messages: Anthropic.MessageParam[] = [];

    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: message });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: PLATFORM_KNOWLEDGE,
      messages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("Platform-Bot Fehler:", error);
    return NextResponse.json(
      { error: "Interner Fehler beim Plattform-Bot" },
      { status: 500 }
    );
  }
}
