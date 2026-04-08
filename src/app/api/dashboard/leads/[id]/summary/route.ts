// ============================================================
// POST /api/dashboard/leads/[id]/summary – KI-Lead-Zusammenfassung
// Lädt entschlüsselten Chat-Verlauf, sendet an Claude,
// speichert strukturierte Analyse in aiSummary.
// Cache: 24h, force=true überspringt Cache.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { decryptText } from "@/modules/encryption/aes";
import { db } from "@/shared/db";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Stunden

const ANALYSIS_PROMPT = `Du bist ein erfahrener Vertriebsanalyst. Analysiere den folgenden Chat-Verlauf zwischen einem KI-Bot und einem potenziellen Kunden.

Antworte AUSSCHLIESSLICH im folgenden JSON-Format (keine Markdown-Blöcke, kein Text drumherum):
{
  "interesse": "Ein Satz der das Hauptinteresse/Bedürfnis des Leads beschreibt",
  "budgetSignal": {
    "erkannt": true/false,
    "betrag": null oder Zahl in EUR wenn erkannt,
    "details": "Kurze Erklärung zum Budget-Signal oder 'Kein Budget-Signal im Gespräch erkannt'"
  },
  "naechsterSchritt": "Konkreter empfohlener nächster Schritt für den Vertrieb",
  "zusammenfassung": "2-3 Sätze Gesamtzusammenfassung des Gesprächsverlaufs",
  "kaufbereitschaft": "hoch" | "mittel" | "niedrig",
  "einwaende": ["Liste der geäußerten Einwände/Bedenken"] oder []
}

WICHTIG:
- Analysiere NUR den Gesprächsinhalt, erfinde nichts dazu
- Sei präzise und faktenbasiert
- Budget-Signale können direkte Nennungen oder indirekte Hinweise sein
- Antworte auf Deutsch`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const force = body.force === true;

  // Lead laden
  const lead = await db.lead.findFirst({
    where: { id, tenantId: tenant.id },
    select: {
      id: true,
      aiSummary: true,
      aiSummaryAt: true,
      conversationId: true,
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 });
  }

  // Cache prüfen: Wenn aiSummary vorhanden und < 24h alt, zurückgeben
  if (!force && lead.aiSummary && lead.aiSummaryAt) {
    const age = Date.now() - new Date(lead.aiSummaryAt).getTime();
    if (age < CACHE_TTL_MS) {
      try {
        const parsed = JSON.parse(lead.aiSummary);
        return NextResponse.json({
          summary: parsed,
          cachedAt: lead.aiSummaryAt,
          fromCache: true,
        });
      } catch {
        // Ungültiges JSON im Cache → neu generieren
      }
    }
  }

  // Chat-Verlauf laden und entschlüsseln
  const messages = await db.message.findMany({
    where: { conversationId: lead.conversationId },
    orderBy: { timestamp: "asc" },
    select: {
      role: true,
      contentEncrypted: true,
      timestamp: true,
    },
  });

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "Keine Nachrichten vorhanden für Analyse" },
      { status: 400 }
    );
  }

  // Chat-Verlauf formatieren (DSGVO: keine Telefonnummer, keine IDs)
  const chatText = messages
    .map((msg) => {
      const role = msg.role === "USER" ? "Kunde" : "Assistent";
      const content = decryptText(msg.contentEncrypted);
      return `[${role}]: ${content}`;
    })
    .join("\n");

  // Claude-Analyse anfordern
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY nicht konfiguriert" },
      { status: 503 }
    );
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: ANALYSIS_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analysiere diesen Chat-Verlauf:\n\n${chatText}`,
        },
      ],
    });

    // Antwort extrahieren
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Keine Analyse von Claude erhalten" },
        { status: 502 }
      );
    }

    // JSON parsen (Claude könnte Markdown-Blöcke nutzen)
    let jsonText = textBlock.text.trim();
    // Markdown-Code-Block entfernen falls vorhanden
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const summary = JSON.parse(jsonText);

    // In DB speichern
    await db.lead.update({
      where: { id },
      data: {
        aiSummary: JSON.stringify(summary),
        aiSummaryAt: new Date(),
      },
    });

    return NextResponse.json({
      summary,
      cachedAt: new Date().toISOString(),
      fromCache: false,
    });
  } catch (error) {
    console.error("[Lead Summary] Claude-Analyse fehlgeschlagen", {
      leadId: id,
      error: error instanceof Error ? error.message : "Unbekannt",
    });

    // Bei JSON-Parse-Fehler spezifische Meldung
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "KI-Antwort konnte nicht verarbeitet werden" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Analyse fehlgeschlagen" },
      { status: 500 }
    );
  }
}
