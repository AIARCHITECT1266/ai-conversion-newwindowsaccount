// ============================================================
// Zentrale Lade-Funktionen fuer Scoring-Prompt und
// Qualification-Labels pro Tenant.
//
// Konvention analog zu src/modules/bot/system-prompts/index.ts:
// - Frische DB-Reads pro Call, kein Cache
// - Tenant-eigenes Feld → verwenden, sonst Default
// - Keine Parameter-Variablen (Scoring-Prompt erhaelt den
//   Gespraechstext als user-Message, nicht als Platzhalter)
//
// Exports:
//   loadScoringPrompt(tenant)           → string
//   loadQualificationLabels(tenant)     → Record<LeadQualification, string>
//   ScoringResponseSchema (Zod)         → { score, qualification, signals }
//
// ADR: docs/decisions/adr-002-scoring-per-tenant.md
// ============================================================

import { z } from "zod";
import type { LeadQualification } from "@/generated/prisma/enums";
import {
  DEFAULT_SCORING_PROMPT,
  DEFAULT_QUALIFICATION_LABELS,
} from "./defaults";

// Re-Exports, damit Consumer nicht tiefer greifen muessen
export { DEFAULT_SCORING_PROMPT, DEFAULT_QUALIFICATION_LABELS } from "./defaults";
export { MOD_B2C_SCORING_PROMPT } from "./mod-b2c";
export { MOD_B2B_SCORING_PROMPT } from "./mod-b2b";

// ---------- Zod-Schema: GPT-Response ----------
//
// Jeder Scoring-Prompt MUSS dieses Schema als Output-JSON emittieren.
// Bei Abweichung schlaegt der Parse fehl und der Aufrufer kann einen
// Retry ausloesen oder den Lead unverscored lassen.
//
// Signals: 1-6 Eintraege (Untergrenze 1 damit nie leere Arrays
// persistiert werden; Obergrenze 6 als Schutz gegen Token-Explosion).
export const ScoringResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  qualification: z.enum([
    "UNQUALIFIED",
    "MARKETING_QUALIFIED",
    "SALES_QUALIFIED",
    "OPPORTUNITY",
    "CUSTOMER",
  ]),
  signals: z.array(z.string().min(1).max(200)).min(1).max(6),
});

export type ScoringResponse = z.infer<typeof ScoringResponseSchema>;

// ---------- Loader ----------

/**
 * Laedt den Scoring-Prompt fuer einen Tenant.
 * Fallback auf DEFAULT_SCORING_PROMPT wenn das Feld leer/null ist.
 */
export function loadScoringPrompt(tenant: {
  scoringPrompt: string | null | undefined;
}): string {
  const prompt = tenant.scoringPrompt;
  if (prompt && prompt.trim().length > 0) {
    return prompt;
  }
  return DEFAULT_SCORING_PROMPT;
}

/**
 * Laedt die Qualification-Labels fuer einen Tenant.
 * Erwartet Struktur {UNQUALIFIED: string, MARKETING_QUALIFIED: string, ...}.
 * Fallback-Logik feldweise: fehlende Keys werden mit Default-Label gefuellt,
 * damit die UI nie "undefined" rendert.
 */
export function loadQualificationLabels(tenant: {
  qualificationLabels: unknown;
}): Record<LeadQualification, string> {
  const raw = tenant.qualificationLabels;

  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_QUALIFICATION_LABELS };
  }

  const rawObj = raw as Record<string, unknown>;
  const result: Record<LeadQualification, string> = { ...DEFAULT_QUALIFICATION_LABELS };

  (Object.keys(DEFAULT_QUALIFICATION_LABELS) as LeadQualification[]).forEach((key) => {
    const candidate = rawObj[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      result[key] = candidate.trim();
    }
  });

  return result;
}

// ---------- Validierungs-Schema fuer Labels-Save (Dashboard-API) ----------
//
// Wird von /api/dashboard/settings/scoring wiederverwendet. Liegt hier,
// damit Labels-Struktur zentral gepflegt wird.
export const QualificationLabelsSchema = z.object({
  UNQUALIFIED: z.string().min(1).max(50),
  MARKETING_QUALIFIED: z.string().min(1).max(50),
  SALES_QUALIFIED: z.string().min(1).max(50),
  OPPORTUNITY: z.string().min(1).max(50),
  CUSTOMER: z.string().min(1).max(50),
});
