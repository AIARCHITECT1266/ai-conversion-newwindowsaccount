// ============================================================
// GPT-4o Lead-Scoring – Automatische Bewertung von Leads
// Analysiert den Gesprächsverlauf und gibt einen Score (0–100)
// sowie eine Qualifikationsstufe zurück.
// ============================================================

import OpenAI from "openai";
import type { LeadQualification } from "@/generated/prisma/enums";

// ---------- Lazy-Init Client ----------

let _openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("[GPT-4o] OPENAI_API_KEY nicht konfiguriert");
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

// ---------- Typen ----------

export interface LeadScoreResult {
  success: boolean;
  score?: number; // 0–100
  qualification?: LeadQualification;
  reasoning?: string; // Interne Begründung (wird nicht an Nutzer gezeigt)
  error?: string;
}

// ---------- Scoring-Prompt ----------

const SCORING_SYSTEM_PROMPT = `Du bist ein Lead-Scoring-Experte für den DACH-B2B-Markt.
Analysiere den folgenden Gesprächsverlauf und bewerte den Lead.

BEWERTUNGSKRITERIEN:
- Kaufinteresse (0-25 Punkte): Aktives Interesse, konkrete Fragen zu Produkt/Preis
- Budget-Signale (0-25 Punkte): Hinweise auf Budget, Unternehmensgröße, Entscheidungsbefugnis
- Dringlichkeit (0-25 Punkte): Zeitdruck, akute Probleme, laufende Evaluierung
- Gesprächsqualität (0-25 Punkte): Engagement, Antwortlänge, Bereitschaft zum Termin

QUALIFIKATIONSSTUFEN:
- UNQUALIFIED: Score 0-20 (kein erkennbares Interesse)
- MARKETING_QUALIFIED: Score 21-50 (grundsätzliches Interesse, noch kein konkreter Bedarf)
- SALES_QUALIFIED: Score 51-75 (konkreter Bedarf, aktive Evaluierung)
- OPPORTUNITY: Score 76-90 (Terminbereitschaft, Entscheidungsnähe)
- CUSTOMER: Score 91-100 (Kaufzusage oder bestehender Kunde)

Antworte AUSSCHLIESSLICH im folgenden JSON-Format:
{"score": <number>, "qualification": "<string>", "reasoning": "<string>"}`;

// Maximale Konversationslaenge fuer Scoring (Token-Schutz)
const MAX_CONVERSATION_LENGTH = 10_000;

// ---------- Lead bewerten ----------

/**
 * Bewertet einen Lead anhand des Gesprächsverlaufs mit GPT-4o.
 * Wird nach jeder Nutzer-Nachricht aufgerufen um den Score zu aktualisieren.
 *
 * @param conversationText - Gesprächsverlauf als formatierter Text
 */
export async function scoreLeadFromConversation(
  conversationText: string
): Promise<LeadScoreResult> {
  // Konversationstext begrenzen um Token-Kosten zu kontrollieren
  const truncatedText = conversationText.length > MAX_CONVERSATION_LENGTH
    ? conversationText.slice(-MAX_CONVERSATION_LENGTH)
    : conversationText;

  // Timeout: 30 Sekunden
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const client = getClient();
    const response = await client.chat.completions.create(
      {
        model: "gpt-4o",
        temperature: 0.1, // Niedrige Temperatur für konsistente Bewertung
        max_tokens: 256,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SCORING_SYSTEM_PROMPT },
          { role: "user", content: truncatedText },
        ],
      },
      { signal: controller.signal }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: "Keine Antwort von GPT-4o erhalten" };
    }

    let parsed: { score: unknown; qualification: unknown; reasoning: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("[GPT-4o] JSON-Parse fehlgeschlagen", {
        content: content.slice(0, 100),
      });
      return { success: false, error: "GPT-Antwort ist kein gueltiges JSON" };
    }

    // Score validieren
    const rawScore = Number(parsed.score);
    if (!Number.isFinite(rawScore)) {
      return { success: false, error: "GPT-Score ist keine gueltige Zahl" };
    }
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Qualifikation validieren
    const validQualifications: LeadQualification[] = [
      "UNQUALIFIED",
      "MARKETING_QUALIFIED",
      "SALES_QUALIFIED",
      "OPPORTUNITY",
      "CUSTOMER",
    ];

    const qualStr = typeof parsed.qualification === "string" ? parsed.qualification : "";
    const qualification = validQualifications.includes(qualStr as LeadQualification)
      ? (qualStr as LeadQualification)
      : "UNQUALIFIED";

    console.log("[GPT-4o] Lead bewertet", {
      score,
      qualification,
      tokensUsed: response.usage?.total_tokens,
      // DSGVO: Keine Gesprächsinhalte loggen
    });

    return {
      success: true,
      score,
      qualification,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";

    console.error("[GPT-4o] Scoring-Fehler", { error: errorMessage });

    return { success: false, error: errorMessage };
  } finally {
    clearTimeout(timeout);
  }
}
