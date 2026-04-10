# Projekt-Status — AI Conversion Web-Widget

**Letzte Aktualisierung:** 2026-04-10
**Aktuelle Phase:** Phase 3a — Widget-API GET-Endpoints
**Letzter Commit:** 158c6ab (Tech-Debt FK-Cascades dokumentiert)

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

### Phase 2e.1 — Diff-Inspektion (Commit b9116f2)
- .claude/settings.local.json aus Git-Tracking entfernt und gitignored
- Vollständige Diffs der 7 Modified-Dateien zur Review bereitgestellt
- ts=-Parsing-Status im Paddle-Webhook dokumentiert
- Triage-Entscheidungen folgen in Phase 2e.2

### Phase 2e.2 — Triage-Entscheidungen (Commits 44ad3eb und d786869)
- Commit A: Admin-Funktionalität (DELETE-Handler mit auditLog,
  paddlePlan in PUBLIC_SELECT, Dashboard-Navigation)
- Commit B: Paddle Replay-Attack-Protection
- System-Prompt-Änderungen verworfen (Bug in Fallback-Kommentaren,
  Qualitätsverlust, halbfertiges Refactoring)
- Platzhalter-Idee im Tech-Debt-Backlog für spätere saubere Phase
- Paddle doppeltes ts=-Parsing als bewusste Debt dokumentiert

### Phase 2f — Untracked-Inventur + 2g — Triage (Commits 6c9cdc2, 8e762ed, 1348ccc)
- 7 untrackte Dateien katalogisiert und sauber in Git aufgenommen
- Commit 1: Build-Fix branch-templates.json (war kritischer Build-Breaker)
- Commit 2: Dashboard-Feature-Set Bot-Testing und Prompt-Management
  (Legacy, wird mit Widget-Launch entfernt)
- Commit 3: Script-Umbenennung send-session → new-session
- Tenant-Isolation vor Feature-Commit geprüft und gewahrt

### Phase 3a-pre — CLAUDE.md PROJECT_STATUS-Regel (Commit 36ca157)
- Pflicht zum PROJECT_STATUS-Update am Ende jeder Phase
  als harte Regel in CLAUDE.md verankert
- Vermeidet zukünftiges Vergessen unabhängig vom Prompt

### Phase 3a — Widget-API Fundament (Commit 3e1ac2d)
- src/lib/widget/publicKey.ts mit 60s In-Memory-Cache
- src/scripts/generate-widget-keys.ts (crypto.randomBytes, idempotent)
- GET /api/widget/config mit Zod, Rate-Limit 100/h, CORS, Audit-Log
- AuditAction widget.config_fetched ergänzt
- 4 Tenants haben jetzt Public Keys (Cleanup folgt in 3a-cleanup)
- Curl-Smoke-Tests alle 3 grün
- Tech-Debt: null-Caching im publicKey-Helper bewusst akzeptiert
  (siehe docs/tech-debt.md)

### Phase 3a-cleanup — Test-Tenants entfernt (Commit 158c6ab)
- 3 leere Test-Tenants gelöscht: handwerker2, wewee, sadas
- internal-admin als Master-Tenant behalten
- Inventur vor Löschung: alle drei waren komplett leer
- Löschung via DELETE /api/admin/tenants/[id] (Cookie-Auth via
  /api/admin/login), auditLog("admin.tenant_deleted") je Delete
- Tech-Debt: 2 fehlende FK-Cascades dokumentiert
  (CampaignTemplate, Broadcast — siehe docs/tech-debt.md)
- DB-Stand: 1 Tenant (internal-admin)

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
