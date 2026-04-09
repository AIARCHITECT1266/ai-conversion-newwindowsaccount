// ============================================================
// POST /api/dashboard/clients/[id]/docs – KI-Onboarding-Dokumente
// Claude generiert Begrüßungsmail, Projektplan, FAQ aus Chat-Historie
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { decryptText } from "@/modules/encryption/aes";
import { db } from "@/shared/db";

const DOCS_PROMPT = `Du bist ein Onboarding-Spezialist für den DACH-Markt. Erstelle basierend auf dem Gesprächsverlauf zwischen KI-Bot und dem neuen Kunden drei Onboarding-Dokumente.

Antworte AUSSCHLIESSLICH im folgenden JSON-Format:
{
  "welcomeEmail": {
    "subject": "Betreffzeile",
    "body": "E-Mail Text (3-4 Absätze, Sie-Form, Bezug auf Gespräch, nächste Schritte)"
  },
  "projectPlan": {
    "title": "Projekttitel",
    "phases": [
      { "name": "Phase-Name", "duration": "Dauer", "tasks": ["Aufgabe 1", "Aufgabe 2"] }
    ]
  },
  "faq": [
    { "question": "Häufige Frage basierend auf dem Gespräch", "answer": "Antwort" }
  ]
}

REGELN:
- Begrüßungsmail: persönlich, Bezug auf besprochene Themen, konkrete nächste Schritte
- Projektplan: 3-5 Phasen, realistisch, typischer KI-Bot Rollout
- FAQ: 4-6 Fragen die aus dem Gespräch abgeleitet werden (Einwände, Bedenken, Fragen)
- Alles auf Deutsch, Sie-Form, professionell`;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await params;
  const client = await db.client.findFirst({
    where: { id, tenantId: tenant.id },
    select: { id: true, companyName: true, leadId: true, docsGenerated: true },
  });
  if (!client) return NextResponse.json({ error: "Client nicht gefunden" }, { status: 404 });

  // Chat-Verlauf laden
  const lead = await db.lead.findFirst({
    where: { id: client.leadId, tenantId: tenant.id },
    select: { conversationId: true, score: true, dealValue: true },
  });
  if (!lead) return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 });

  const messages = await db.message.findMany({
    where: { conversationId: lead.conversationId },
    orderBy: { timestamp: "asc" },
    select: { role: true, contentEncrypted: true },
  });

  if (messages.length === 0) return NextResponse.json({ error: "Keine Nachrichten" }, { status: 400 });

  const chatText = messages.slice(-20).map(m => {
    const role = m.role === "USER" ? "Kunde" : "Assistent";
    return `[${role}]: ${decryptText(m.contentEncrypted)}`;
  }).join("\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY nicht konfiguriert" }, { status: 503 });

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: DOCS_PROMPT,
      messages: [{
        role: "user",
        content: `FIRMA: ${tenant.brandName}\nKUNDE: ${client.companyName}\n\nGESPRÄCHSVERLAUF:\n${chatText}`,
      }],
    });

    const textBlock = response.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return NextResponse.json({ error: "Keine Antwort" }, { status: 502 });

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

    const docs = JSON.parse(jsonText);

    await db.client.update({
      where: { id },
      data: { docsGenerated: JSON.stringify(docs) },
    });

    return NextResponse.json({ docs });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "KI-Antwort nicht verarbeitbar" }, { status: 502 });
    return NextResponse.json({ error: "Generierung fehlgeschlagen" }, { status: 500 });
  }
}
