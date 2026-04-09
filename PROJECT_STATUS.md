# Projekt-Status — AI Conversion Web-Widget

**Letzte Aktualisierung:** 2026-04-09
**Aktuelle Phase:** Phase 3a — Widget-API GET-Endpoints
**Letzter Commit:** 1eceaf8 (Phase 2e.1 — Diff-Inspektion)

---

## Was ist das Ziel?

Erweiterung der bestehenden WhatsApp-Plattform um einen zweiten Kanal:
ein einbettbares Web-Widget, das auf Kundenseiten Besucher qualifiziert
und dieselben Leads in dasselbe CRM schreibt wie der WhatsApp-Bot.

Vollständige Spec: WEB_WIDGET_INTEGRATION.md

---

## Abgeschlossene Phasen

### Phase 0 — Pre-Analyse (abgeschlossen)
- Vollständige Codebase-Analyse → ARCHITECTURE_REPORT.md
- Sechs getroffene Entscheidungen → docs/decisions/phase-0-decisions.md
- ADR-Prozess etabliert → docs/adr/README.md
- System-Prompt-Drift geprüft: 1 Tenant betroffen (nur eigener
  Test-Tenant, kein Migrations-Script nötig)

### Phase 1 — processMessage-Extraktion (Commit ac11a02)
- Kanal-agnostische Bot-Logik in src/lib/bot/processMessage.ts
- Feature-Flag ENABLE_PROCESS_MESSAGE_V2 für sicheren Rollout
- Alter WhatsApp-Pfad zeilengenau unverändert (verifiziert)
- CLOSED-Conversation Early-Return in beiden Pfaden semantisch identisch

### Phase 2 — Schema-Migration (Commit 793d213)
- Tenant: webWidgetEnabled, webWidgetPublicKey, webWidgetConfig
- Conversation: channel Enum (WHATSAPP|WEB) + Composite Index
- Rein additive Migration, kein Drop, kein Rename
- Rollback-Script: prisma/rollback/002_rollback_web_widget.sql
- Migration-Workflow dokumentiert (docs/migration-workflow.md)

### Phase 2d — Doku-Infrastruktur (Commit 6c58a1d)
- PROJECT_STATUS.md als zentrale Anlaufstelle etabliert
- Vorher untrackte Analyse-Dokumente in Git aufgenommen
  (ARCHITECTURE_REPORT, WEB_WIDGET_INTEGRATION, decisions, adr)
- docs/README.md als Inhaltsverzeichnis
- CLAUDE.md um Pflicht-Lese-Reihenfolge erweitert

### Phase 2e — Housekeeping (Commit 8493a50)
- .gitignore um Credential-Pattern erweitert
- Temporäre .tmp_UPSTASH_*-Dateien lokal entfernt
- 8 ungestagte Modified-Dateien aus früheren Sessions inspiziert
  (Triage-Entscheidung folgt vor Phase 3a)

### Phase 2e.1 — Diff-Inspektion (Commit 1eceaf8)
- .claude/settings.local.json aus Git-Tracking entfernt und gitignored
- Vollständige Diffs der 7 Modified-Dateien zur Review bereitgestellt
- ts=-Parsing-Status im Paddle-Webhook dokumentiert
- Triage-Entscheidungen folgen in Phase 2e.2

---

## Offene Arbeit / Blocker

### Blocker: WhatsApp-Regression-Test
- Status: Blockiert durch fehlende Meta Business Verification
- Grund: Georgische Telefonnummer, kein Meta-Test-Empfänger möglich
- Zwischenlösung: US-LLC-Gründung läuft, US-Nummer nach Gründung,
  Meta-Verifizierung danach
- Erwartung: 2-4 Wochen bis Unblock
- Workaround: Phase 3 dient als impliziter Test für Phase 1
  (beide Kanäle rufen dieselbe processMessage-Funktion auf)

### Offene Tech-Debt
Siehe docs/tech-debt.md für vollständige Liste. Highlights:
- Doppelter Tenant-Load in processMessage (Phase 3 fixen)
- templates/route.ts Zod-Validierung
- Cleanup-Cron Stufe 4 (findMany statt deleteMany)
- checkLimit ohne Redis-Cache
- CSP unsafe-inline (VOR Phase 4 fixen)
- HubSpot fire-and-forget

### Offene Test-Debt
Siehe docs/test-debt.md. Highlights:
- WhatsApp-Regression nicht durchgeführt (siehe Blocker oben)
- Rollback-Script nicht praktisch getestet
- Connection-Pool-Verhalten bei Migrations nicht geprüft

---

## Nächster Schritt

**Phase 3a — Widget-API GET-Endpoints**
- resolvePublicKey-Helper mit Cache
- GET /api/widget/config
- GET /api/widget/poll
- generate-widget-keys.ts (Daten-Migration für Test-Tenant)

Der Phase-3a-Prompt wird von ConvArch vor der Session geliefert.

---

## Notfall-Infos

**Feature-Flags in Produktion:**
- ENABLE_PROCESS_MESSAGE_V2: false (Default, alter WhatsApp-Pfad aktiv)

**Rollback-Befehle bei Problemen:**
- Phase 2 Schema: siehe prisma/rollback/002_rollback_web_widget.sql
- Phase 1 Code: git revert ac11a02 (reverts processMessage-Extraktion)

**Daten:**
- Ein einziger Test-Tenant in der DB ("AI Conversion")
- Produktions-DB: Prisma Postgres Frankfurt
- Keine echten Kunden, keine echten Leads

**Umgebung:**
- Prisma-Migrationen: siehe docs/migration-workflow.md
  (NICHT migrate dev in Claude-Code-Sessions!)

---

## Update-Regel

Diese Datei wird am Ende JEDER Phase aktualisiert, mit dem Commit
derselben Phase. Updates sind Pflichtbestandteil jedes Phase-Prompts.
