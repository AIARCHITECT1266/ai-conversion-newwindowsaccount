// ============================================================
// POST /api/dashboard/campaigns/[slug]/generate
// Claude generiert Content-Paket aus Kampagnen-Briefing
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";

const CONTENT_PROMPT = `Du bist ein erfahrener Marketing-Texter und Vertriebsstratege für den DACH-Markt.
Erstelle ein komplettes Content-Paket für eine WhatsApp-Marketing-Kampagne.

Antworte AUSSCHLIESSLICH im folgenden JSON-Format (kein Markdown, kein Text drumherum):
{
  "whatsappOpeners": [
    "Nachricht 1 (max 160 Zeichen, persönlich, mit Hook)",
    "Nachricht 2 (Variante mit Frage)",
    "Nachricht 3 (Variante mit Angebot)"
  ],
  "adCopy": [
    {
      "platform": "Meta (Facebook/Instagram)",
      "headline": "Kurze Headline (max 40 Zeichen)",
      "primaryText": "Haupttext (max 125 Zeichen)",
      "description": "Beschreibung (max 30 Zeichen)",
      "cta": "Call-to-Action Text"
    },
    {
      "platform": "Google Ads",
      "headline": "Headline (max 30 Zeichen)",
      "primaryText": "Beschreibung Zeile 1 (max 90 Zeichen)",
      "description": "Beschreibung Zeile 2 (max 90 Zeichen)",
      "cta": "CTA"
    }
  ],
  "email": {
    "subject": "Betreffzeile (max 60 Zeichen, neugierig machend)",
    "body": "E-Mail-Text (3-4 Absätze, mit CTA am Ende, Sie-Form)"
  },
  "socialPosts": [
    "Post 1 (LinkedIn-Stil, max 200 Zeichen, mit Hashtags)",
    "Post 2 (Instagram-Stil, locker, mit Emojis)",
    "Post 3 (Twitter/X-Stil, knapp, mit Hook)"
  ],
  "followUpSequence": [
    "Tag 1: Freundliche Erinnerung (max 200 Zeichen)",
    "Tag 3: Wertangebot/Social Proof (max 200 Zeichen)",
    "Tag 7: Letzter Versuch mit Dringlichkeit (max 200 Zeichen)"
  ]
}

REGELN:
- Alle Texte auf Deutsch, professionelle Sie-Form
- DACH-Markt optimiert
- WhatsApp-Nachrichten: kurz, persönlich, Emojis sparsam
- Ad-Copy: conversion-optimiert, klare Value Proposition
- E-Mail: nicht zu lang, klarer CTA
- Social Posts: plattformgerecht
- Follow-Ups: eskalierende Dringlichkeit, nie aggressiv`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { slug } = await params;

  // Kampagne prüfen
  const campaign = await db.campaign.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug } },
    select: { id: true, name: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Kampagne nicht gefunden" }, { status: 404 });
  }

  const body = await request.json();
  const { audience, offer, tone } = body;

  if (!audience || !offer) {
    return NextResponse.json(
      { error: "Zielgruppe und Angebot sind erforderlich" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY nicht konfiguriert" }, { status: 503 });
  }

  const briefing = `KAMPAGNE: ${campaign.name}
MARKE: ${tenant.brandName}

BRIEFING:
- Zielgruppe: ${audience}
- Angebot: ${offer}
- Tonalität: ${tone || "Professionell, vertrauensvoll"}

Erstelle das komplette Content-Paket für diese Kampagne.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: CONTENT_PROMPT,
      messages: [{ role: "user", content: briefing }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Keine Antwort erhalten" }, { status: 502 });
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const content = JSON.parse(jsonText);

    return NextResponse.json({ content, campaignName: campaign.name });
  } catch (error) {
    console.error("[Campaign Generate] Fehler", {
      slug,
      error: error instanceof Error ? error.message : "Unbekannt",
    });

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "KI-Antwort konnte nicht verarbeitet werden" }, { status: 502 });
    }

    return NextResponse.json({ error: "Content-Generierung fehlgeschlagen" }, { status: 500 });
  }
}
