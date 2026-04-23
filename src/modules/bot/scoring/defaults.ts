// ============================================================
// Default-Scoring-Prompt und Default-Qualification-Labels
//
// Wird von scoring/index.ts als Fallback genutzt, wenn ein Tenant
// keine eigenen Scoring-Felder gesetzt hat.
//
// Der DEFAULT_SCORING_PROMPT ist die universelle DACH-B2B-Heuristik
// (Budget, Dringlichkeit, Entscheider, Termin). Fuer Nischen-Tenants
// (z.B. MOD-B2C Bildungstraeger) wird stattdessen ein tenant-eigener
// Prompt via Tenant.scoringPrompt geladen.
//
// ADR: docs/decisions/adr-002-scoring-per-tenant.md
// ============================================================

import type { LeadQualification } from "@/generated/prisma/enums";

// ---------- Default-Prompt (DACH-B2B-Heuristik) ----------
//
// WICHTIG: Output-Schema am Ende unbedingt beibehalten. Jeder
// tenant-eigene Scoring-Prompt MUSS dasselbe JSON-Schema emittieren,
// sonst schlaegt der Zod-Parse in scoring/index.ts fehl und der Lead
// bleibt unverscored.
export const DEFAULT_SCORING_PROMPT = `Du bist ein Lead-Scoring-Experte für den DACH-B2B-Markt.
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

SIGNALS:
Formuliere 2-4 konkrete Beobachtungen aus dem Gesprächsverlauf, die deinen Score belegen.
Keine abstrakten Kategorien, sondern konkrete Fakten aus dem Chat.
Beispiel: "Nennt Budget-Range 10-20k EUR pro Quartal" statt "Budget-Signale vorhanden".

Antworte AUSSCHLIESSLICH im folgenden JSON-Format:
{"score": <number>, "qualification": "<string>", "signals": [<string>, <string>, ...]}`;

// ---------- Default-Labels ----------
//
// Struktur: Enum-Key → UI-Label. Der Tenant kann diese Labels pro
// Nische umbenennen (z.B. MOD-B2C: "SALES_QUALIFIED" → "Gutschein-Aussicht").
// Enum-Keys bleiben stabil (siehe ADR scoring-per-tenant: Enum unveraendert).
export const DEFAULT_QUALIFICATION_LABELS: Record<LeadQualification, string> = {
  UNQUALIFIED: "Unqualified",
  MARKETING_QUALIFIED: "MQL",
  SALES_QUALIFIED: "SQL",
  OPPORTUNITY: "Opportunity",
  CUSTOMER: "Customer",
};
