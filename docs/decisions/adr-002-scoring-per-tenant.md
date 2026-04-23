# ADR-002 — Scoring pro Tenant, Signals statt Reasoning, Mara-Temperature-Fix

**Datum:** 2026-04-23
**Status:** Entschieden, umgesetzt in Commit (noch ausstehend — Working-Tree)
**Kontext:** Vorbereitung MOD-Demo-Call 2026-04-29

## Kontext

Bis zum 23.04.2026 hatte AI Conversion genau einen hartcodierten Scoring-
Prompt in `src/modules/bot/gpt.ts` (`SCORING_SYSTEM_PROMPT`), geeicht auf
den DACH-B2B-Vertrieb (Budget, Dringlichkeit, Entscheider, Termin).

Das Architektur-Scan vom 23.04. (PROJECT_STATUS.md-Abschnitt
"Mara-Tuning Session 23.04.2026") hat drei strukturelle Risiken aufgezeigt:

- **R-1 (HOCH) Scoring-Prompt-Mismatch:** MOD-B2C (Bildungstraeger,
  Arbeitssuchende mit Bildungsgutschein) wird von DACH-B2B-Heuristik
  strukturell unterscored. Demo am 29.04. haengt an aussagekraeftigem
  Scoring.
- **R-4 Kein Signals-Array:** Dashboard zeigt nur Score + Qualification-
  Stufe, keine konkreten Beobachtungen. GPT liefert zwar ein
  `reasoning`-Feld, das aber nie persistiert wurde (nur geloggt).
- **R-6 Keine Temperature-Kontrolle bei Mara:** Anthropic-Default 1.0
  greift. Prompt-Tuning vor dem Demo-Call ist reproduzierbar nur mit
  niedrigerer Temperature.

Fuer die Skalierung in weitere Nischen (Steuerberater, Coaching,
Immobilien) muss das Scoring zudem **pro Tenant konfigurierbar** sein
— das Produkt kann nicht pro Nische einen neuen Code-Deploy vorsehen.

## Entscheidung

Drei Aenderungen, gemeinsam als ein Refactor:

### 1. Schema-Erweiterung (additiv, nullable)

- `Tenant.scoringPrompt: String? @db.Text` — tenant-spezifischer
  GPT-Scoring-Prompt. Null = Default nutzen.
- `Tenant.qualificationLabels: Json?` — UI-Labels fuer die
  `LeadQualification`-Enum-Keys. Null = Enum-Keys als Labels.
- `Lead.scoringSignals: Json?` — String-Array mit 2-4 konkreten
  Beobachtungen aus dem letzten GPT-Scoring-Call.

Enum `LeadQualification` bleibt **unveraendert** (5 Stufen: UNQUALIFIED,
MARKETING_QUALIFIED, SALES_QUALIFIED, OPPORTUNITY, CUSTOMER). Nur die
UI-Labels werden editierbar — die interne Semantik (Score-Schwellen,
Status-Mapping) bleibt stabil.

Migration: `20260423115051_scoring_per_tenant_and_signals`.
Rein additiv, kein Default-Backfill, keine Consumer-Breakage (Regel 2
CLAUDE.md greift nicht, weil keine Nullable-Umstellung, kein Typ-Wechsel,
kein Entfernen, kein Umbenennen).

### 2. Signals statt Reasoning

Der GPT-Scoring-Call liefert jetzt `{score, qualification, signals: [...]}`
statt des alten `{score, qualification, reasoning}`. Das Feld `reasoning`
wird **komplett entfernt** — kein DB-Feld, kein Log, kein Return-Wert.

Signals sind 2-6 konkrete Beobachtungen aus dem Gespraech ("Arbeitssuchend
gemeldet seit Februar", "Konkreter Kurswunsch: Digital Marketing
Manager"). Sie werden in `Lead.scoringSignals` persistiert und im
Dashboard als Bullet-List gerendert.

Validierung via `ScoringResponseSchema` (Zod) in
`src/modules/bot/scoring/index.ts`. Bei invalidem JSON: ein
`withRetry`-Durchlauf, danach Lead bleibt unverscored (kein Wurf, damit
die Konversation nicht bricht).

### 3. Mara-Temperature fix auf 0.3

Hartcodiert in `src/modules/bot/claude.ts`. Kein Tenant-Override, kein
ENV-Flag — das ist bewusst minimal fuer den Demo-Call. Post-Demo-TD
(TD-Post-Demo-03) fuer spaeteren Tenant-Override.

## Abgelehnte Alternativen

- **Signal-Kategorien mit Icons** (positiv/negativ/neutral, Farben,
  Typen-Tags). Abgelehnt weil (a) ohne echte Datenbasis willkuerlich,
  (b) Premium-SaaS-Direktive bevorzugt reduzierte Typografie ueber
  Icon-Zoos, (c) Dashboard-Scope bleibt klein vor dem Demo-Call.
  Nachholbar als TD-Post-Demo-05.
- **Reasoning parallel zu Signals persistieren.** Abgelehnt weil es
  zwei Datenquellen fuer denselben semantischen Inhalt schafft.
  Signals sind die strukturierte Form — reasoning ist redundant.
- **Temperature pro Tenant konfigurierbar (DB-Feld).** Abgelehnt fuer
  den aktuellen Scope weil der Demo-Call keinen Multi-Tenant-Bedarf
  an unterschiedlichen Temperatures aufweist. TD-Post-Demo-03.
- **Separates Prisma-Model fuer Scoring-Signals** (1:N statt
  Json-Array). Abgelehnt weil Signals nur im Conversation-Kontext
  gelesen werden — kein eigenstaendiger Query-Use-Case. Json ist
  leichtgewichtiger.

## Konsequenzen

### Sofort wirksam

- Mara-Tuning ab sofort reproduzierbar (Temperature 0.3, fixe Prompt-
  Loader-Quelle).
- MOD-B2C- und MOD-B2B-Scoring-Prompts sind nischenspezifisch und
  ueber den Seed aktiviert.
- Dashboard zeigt nischenspezifische Labels + 2-4 konkrete Signals
  pro Konversation.

### Folge-Aenderungen / Post-Demo-TDs

- **TD-Post-Demo-01:** Scoring-Debouncing — aktuell laeuft der
  GPT-Call nach jeder Bot-Antwort. Bei 10-Nachrichten-Gespraech =
  10 Scoring-Calls. Nach Demo Post-Message-Throttling (z.B. "1 Call
  pro 60 Sekunden Konversations-Pause").
- **TD-Post-Demo-02:** Claude-Modell pro Tenant override-faehig
  (aktuell `claude-sonnet-4-20250514` hartcodiert).
- **TD-Post-Demo-03:** Temperature pro Tenant konfigurierbar (aktuell
  `0.3` hartcodiert fuer Mara). Kommentar in `claude.ts` markiert.
- **TD-Post-Demo-04:** Rate-Limit-Bypass fuer Admin-Testing (aktuell
  10 Widget-Sessions/IP/h, beim Durchtesten der Demo-Szenarien hart
  an der Grenze).
- **TD-Post-Demo-05:** Signal-Kategorisierung mit Icon-System nach
  erster Daten-Sammlung aus dem Pilot.

## Referenzen

- PROJECT_STATUS.md — "Mara-Tuning Session 23.04.2026 — Architektur-Scan"
- `src/modules/bot/scoring/` — neues Modul
- `src/modules/bot/gpt.ts` — refaktoriert
- `src/modules/bot/claude.ts` — Temperature-Fix
- `src/app/dashboard/settings/scoring/` — neue Settings-UI
- `src/app/api/dashboard/settings/scoring/route.ts` — neue API
- Migration: `prisma/migrations/20260423115051_scoring_per_tenant_and_signals/`
