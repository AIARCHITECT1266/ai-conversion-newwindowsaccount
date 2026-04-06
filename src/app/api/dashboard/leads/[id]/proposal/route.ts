// ============================================================
// POST /api/dashboard/leads/[id]/proposal – AI Angebotsgenerator
// Claude generiert professionelles Angebot + Begleit-E-Mail
// basierend auf Chat-Historie, Score, Deal-Wert, Notizen.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDashboardTenant } from "@/lib/dashboard-auth";
import { decryptText } from "@/lib/encryption";
import { db } from "@/lib/db";

const ALLOWED_STATUSES = ["TERMIN", "ANGEBOT", "GEWONNEN"];

const PROPOSAL_PROMPT = `Du bist ein erfahrener Vertriebsberater für den DACH-Markt und erstellst professionelle Angebote.

Erstelle basierend auf den Lead-Daten und dem Gesprächsverlauf ein maßgeschneidertes Angebot.

Antworte AUSSCHLIESSLICH im folgenden JSON-Format (kein Markdown drumherum):
{
  "proposal": {
    "title": "Angebots-Titel (z.B. 'Ihr individuelles Angebot für KI-gestützte Lead-Qualifizierung')",
    "einleitung": "1-2 Sätze personalisierte Einleitung die auf das Gespräch Bezug nimmt",
    "leistungen": [
      {
        "name": "Leistungsname",
        "beschreibung": "Kurze Beschreibung (1 Satz)",
        "preis": 0
      }
    ],
    "gesamtpreis": 0,
    "preismodell": "monatlich" oder "einmalig" oder "monatlich + Setup",
    "laufzeit": "Empfohlene Laufzeit (z.B. '12 Monate')",
    "zahlungsbedingungen": "Zahlungsbedingungen (z.B. 'Monatlich per Lastschrift, 14 Tage Zahlungsziel')",
    "naechsteSchritte": [
      "Schritt 1: ...",
      "Schritt 2: ...",
      "Schritt 3: ..."
    ],
    "gueltigBis": "Gültigkeitsdatum (14 Tage ab heute)",
    "besondereKonditionen": "Optionale besondere Konditionen basierend auf dem Gespräch oder null"
  },
  "email": {
    "betreff": "E-Mail Betreffzeile (max 60 Zeichen)",
    "text": "Begleit-E-Mail Text (3-4 Absätze, Sie-Form, persönlich, mit Bezug auf Gespräch)"
  }
}

REGELN:
- Preise realistisch am erkannten Budget-Signal orientieren
- Wenn kein Budget erkannt: Standard-Preisspanne verwenden
- Leistungen aus dem Gespräch ableiten (was wurde besprochen?)
- Professionell, vertrauensvoll, nicht aufdringlich
- Sie-Form, Deutsch, DACH-Markt
- Gültigkeitsdatum: 14 Tage ab heute
- Mindestens 2, maximal 5 Leistungspositionen`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { id } = await params;

  // Lead mit allen Daten laden
  const lead = await db.lead.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      conversation: {
        select: {
          id: true,
          messages: {
            orderBy: { timestamp: "asc" },
            select: { role: true, contentEncrypted: true, timestamp: true },
          },
        },
      },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 });
  }

  // Pipeline-Status prüfen
  if (!ALLOWED_STATUSES.includes(lead.pipelineStatus)) {
    return NextResponse.json(
      { error: "Angebot nur ab Pipeline-Status TERMIN möglich" },
      { status: 400 }
    );
  }

  if (lead.conversation.messages.length === 0) {
    return NextResponse.json({ error: "Keine Nachrichten vorhanden" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY nicht konfiguriert" }, { status: 503 });
  }

  // Chat-Verlauf entschlüsseln (letzte 20 Nachrichten)
  const recentMessages = lead.conversation.messages.slice(-20);
  const chatText = recentMessages.map((m) => {
    const role = m.role === "USER" ? "Kunde" : "Assistent";
    return `[${role}]: ${decryptText(m.contentEncrypted)}`;
  }).join("\n");

  // Gültigkeitsdatum berechnen (14 Tage)
  const gueltigBis = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  const contextText = `FIRMA: ${tenant.brandName} (${tenant.name})
LEAD-DATEN:
- Lead-Score: ${lead.score}/100
- Pipeline-Status: ${lead.pipelineStatus}
- Qualifikation: ${lead.qualification}
- Deal-Wert (falls gesetzt): ${lead.dealValue ? `${lead.dealValue} EUR` : "nicht angegeben"}
- Notizen: ${lead.notes || "keine"}
- Heutiges Datum: ${new Date().toLocaleDateString("de-DE")}
- Gültig bis: ${gueltigBis}

GESPRÄCHSVERLAUF:
${chatText}

Erstelle ein maßgeschneidertes Angebot basierend auf diesen Informationen.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: PROPOSAL_PROMPT,
      messages: [{ role: "user", content: contextText }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Keine Antwort erhalten" }, { status: 502 });
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonText);

    return NextResponse.json({
      ...result,
      brandName: tenant.brandName,
      tenantName: tenant.name,
    });
  } catch (error) {
    console.error("[Proposal] Fehler", {
      leadId: id,
      error: error instanceof Error ? error.message : "Unbekannt",
    });

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "KI-Antwort konnte nicht verarbeitet werden" }, { status: 502 });
    }

    return NextResponse.json({ error: "Angebotsgenerierung fehlgeschlagen" }, { status: 500 });
  }
}
