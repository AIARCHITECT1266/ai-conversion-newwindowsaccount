// ============================================================
// GPT-4o Lead-Scoring – Automatische Bewertung von Leads
//
// Analysiert den Gespraechsverlauf mit einem scoring-spezifischen
// System-Prompt (pro Tenant konfigurierbar, siehe scoring/index.ts)
// und gibt einen validierten Score + Qualifikations-Stufe +
// 2-4 konkrete Signals zurueck.
//
// Der Scoring-System-Prompt liegt jetzt in
// src/modules/bot/scoring/defaults.ts als DEFAULT_SCORING_PROMPT
// und wird bei Aufruf vom Caller (processMessage) mitgegeben.
//
// ADR: docs/decisions/adr-002-scoring-per-tenant.md
// ============================================================

import OpenAI from "openai";
import type { LeadQualification } from "@/generated/prisma/enums";
import {
  ScoringResponseSchema,
  type ScoringResponse,
} from "./scoring";

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
  signals?: string[]; // 2-4 konkrete Beobachtungen aus dem Gespraech
  error?: string;
}

// Maximale Konversationslaenge fuer Scoring (Token-Schutz)
const MAX_CONVERSATION_LENGTH = 10_000;

// ---------- Lead bewerten ----------

/**
 * Bewertet einen Lead anhand des Gespraechsverlaufs mit GPT-4o.
 * Wird nach jeder Nutzer-Nachricht aufgerufen um den Score zu aktualisieren.
 *
 * @param conversationText - Gespraechsverlauf als formatierter Text
 * @param scoringPrompt - Tenant-spezifischer System-Prompt (via
 *   loadScoringPrompt geladen). Bei leerem Tenant-Feld liefert der
 *   Loader DEFAULT_SCORING_PROMPT — dieser Parameter ist daher nie leer.
 */
export async function scoreLeadFromConversation(
  conversationText: string,
  scoringPrompt: string
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
        temperature: 0.1, // Niedrige Temperatur fuer konsistente Bewertung
        max_tokens: 512, // Hochgesetzt gegenueber 256: signals brauchen mehr Platz
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: scoringPrompt },
          { role: "user", content: truncatedText },
        ],
      },
      { signal: controller.signal }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: "Keine Antwort von GPT-4o erhalten" };
    }

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(content);
    } catch {
      console.error("[GPT-4o] JSON-Parse fehlgeschlagen", {
        contentLength: content.length,
        // DSGVO: Inhalt nicht loggen
      });
      return { success: false, error: "GPT-Antwort ist kein gueltiges JSON" };
    }

    // Zod-Validierung gegen ScoringResponseSchema
    const parseResult = ScoringResponseSchema.safeParse(rawJson);
    if (!parseResult.success) {
      console.error("[GPT-4o] Schema-Validierung fehlgeschlagen", {
        issues: parseResult.error.issues.map((i) => ({
          path: i.path.join("."),
          code: i.code,
        })),
      });
      return {
        success: false,
        error: "GPT-Antwort entspricht nicht dem erwarteten Schema",
      };
    }

    const parsed: ScoringResponse = parseResult.data;

    console.log("[GPT-4o] Lead bewertet", {
      score: parsed.score,
      qualification: parsed.qualification,
      signalsCount: parsed.signals.length,
      tokensUsed: response.usage?.total_tokens,
      // DSGVO: Keine Gespraechsinhalte loggen, keine Signal-Texte loggen
    });

    return {
      success: true,
      score: parsed.score,
      qualification: parsed.qualification as LeadQualification,
      signals: parsed.signals,
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
