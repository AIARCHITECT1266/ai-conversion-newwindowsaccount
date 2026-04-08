// ============================================================
// POST /api/dashboard/leads/[id]/predict – Predictive Score
// Claude berechnet Abschlusswahrscheinlichkeit basierend auf
// Lead-Score, Nachrichten-Anzahl, Antwortzeit, Gesprächslänge,
// Pipeline-Status, Follow-Up Count. Cache: 6h.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { decryptText } from "@/modules/encryption/aes";
import { db } from "@/shared/db";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 Stunden

const PREDICTION_PROMPT = `Du bist ein Vertriebsanalyst mit 20 Jahren Erfahrung in der Lead-Bewertung.

Berechne die Abschlusswahrscheinlichkeit für diesen Lead basierend auf den gegebenen Metriken und dem Gesprächsverlauf.

Antworte AUSSCHLIESSLICH im folgenden JSON-Format (kein Markdown, kein Text drumherum):
{
  "probability": <Zahl 0-100>,
  "reasoning": "<1 Satz Begründung>",
  "nextBestAction": "<Konkreter nächster Schritt>"
}

BEWERTUNGSKRITERIEN:
- Lead-Score > 70 = starkes Interesse (+15-25%)
- Viele Nutzer-Nachrichten = hohes Engagement (+10-20%)
- Kurze Antwortzeiten = hohe Dringlichkeit (+10-15%)
- Pipeline TERMIN/ANGEBOT = weit fortgeschritten (+20-30%)
- Follow-Ups nötig = sinkendes Interesse (-10-20% pro Follow-Up)
- Budget-Nennung im Gespräch = kaufbereit (+15-20%)
- Konkrete Fragen = ernsthaftes Interesse (+10%)
- Einwände ohne Lösung = Risiko (-10-15%)

Sei realistisch – die meisten Leads schließen NICHT ab. Basis-Wahrscheinlichkeit: 15%.`;

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

  // Lead mit allen relevanten Daten laden
  const lead = await db.lead.findFirst({
    where: { id, tenantId: tenant.id },
    select: {
      id: true,
      score: true,
      qualification: true,
      pipelineStatus: true,
      followUpCount: true,
      dealValue: true,
      notes: true,
      predictiveScore: true,
      predictiveScoreAt: true,
      conversationId: true,
      createdAt: true,
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 });
  }

  // Cache prüfen (6h)
  if (!force && lead.predictiveScore && lead.predictiveScoreAt) {
    const age = Date.now() - new Date(lead.predictiveScoreAt).getTime();
    if (age < CACHE_TTL_MS) {
      try {
        return NextResponse.json({
          prediction: JSON.parse(lead.predictiveScore),
          cachedAt: lead.predictiveScoreAt,
          fromCache: true,
        });
      } catch { /* ungültiger Cache → neu generieren */ }
    }
  }

  // Nachrichten laden für Metriken-Berechnung
  const messages = await db.message.findMany({
    where: { conversationId: lead.conversationId },
    orderBy: { timestamp: "asc" },
    select: { role: true, contentEncrypted: true, timestamp: true },
  });

  if (messages.length === 0) {
    return NextResponse.json({ error: "Keine Nachrichten vorhanden" }, { status: 400 });
  }

  // Metriken berechnen
  const userMessages = messages.filter((m) => m.role === "USER");
  const botMessages = messages.filter((m) => m.role === "ASSISTANT");
  const totalMessages = messages.length;

  // Durchschnittliche Antwortzeit des Leads (in Minuten)
  let avgResponseTimeMin = 0;
  if (userMessages.length > 1) {
    let totalResponseMs = 0;
    let responseCount = 0;
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === "USER" && messages[i - 1].role === "ASSISTANT") {
        totalResponseMs += new Date(messages[i].timestamp).getTime() - new Date(messages[i - 1].timestamp).getTime();
        responseCount++;
      }
    }
    if (responseCount > 0) {
      avgResponseTimeMin = Math.round(totalResponseMs / responseCount / 60000);
    }
  }

  // Gesprächsdauer in Stunden
  const firstMsg = new Date(messages[0].timestamp).getTime();
  const lastMsg = new Date(messages[messages.length - 1].timestamp).getTime();
  const conversationDurationHours = Math.round((lastMsg - firstMsg) / (1000 * 60 * 60) * 10) / 10;

  // Letzte 10 Nachrichten entschlüsseln für Kontext (DSGVO: keine IDs)
  const recentChat = messages.slice(-10).map((m) => {
    const role = m.role === "USER" ? "Kunde" : "Assistent";
    return `[${role}]: ${decryptText(m.contentEncrypted)}`;
  }).join("\n");

  // Metriken-Text für Claude
  const metricsText = `LEAD-METRIKEN:
- Lead-Score: ${lead.score}/100
- Qualifikation: ${lead.qualification}
- Pipeline-Status: ${lead.pipelineStatus}
- Deal-Wert: ${lead.dealValue ? `${lead.dealValue} EUR` : "nicht angegeben"}
- Follow-Up Count: ${lead.followUpCount}/3
- Nachrichten gesamt: ${totalMessages} (${userMessages.length} vom Kunden, ${botMessages.length} vom Bot)
- Ø Antwortzeit Kunde: ${avgResponseTimeMin > 0 ? `${avgResponseTimeMin} Minuten` : "nicht messbar"}
- Gesprächsdauer: ${conversationDurationHours} Stunden
- Lead-Alter: ${Math.round((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))} Tage

LETZTE NACHRICHTEN:
${recentChat}`;

  // Claude-Prediction anfordern
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY nicht konfiguriert" }, { status: 503 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: PREDICTION_PROMPT,
      messages: [{ role: "user", content: metricsText }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Keine Prediction erhalten" }, { status: 502 });
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const prediction = JSON.parse(jsonText);

    // Validierung
    if (typeof prediction.probability !== "number" || prediction.probability < 0 || prediction.probability > 100) {
      return NextResponse.json({ error: "Ungültige Prediction" }, { status: 502 });
    }

    // In DB cachen
    await db.lead.update({
      where: { id },
      data: {
        predictiveScore: JSON.stringify(prediction),
        predictiveScoreAt: new Date(),
      },
    });

    return NextResponse.json({
      prediction,
      cachedAt: new Date().toISOString(),
      fromCache: false,
    });
  } catch (error) {
    console.error("[Predict] Fehler", {
      leadId: id,
      error: error instanceof Error ? error.message : "Unbekannt",
    });

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "KI-Antwort konnte nicht verarbeitet werden" }, { status: 502 });
    }

    return NextResponse.json({ error: "Prediction fehlgeschlagen" }, { status: 500 });
  }
}
