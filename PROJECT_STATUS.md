# Projekt-Status — AI Conversion Web-Widget

**Letzte Aktualisierung:** 2026-04-12
**Aktuelle Phase:** Phase 5 Pre — Doku-Härtung
**Letzter Commit:** 70b18ed (CLAUDE.md gehärtet — vier Pflicht-Regeln verankert)

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

### Phase 3a.5 — Schema-Migration Widget-Session-Felder (Commit c8fc9f1)
- Conversation.externalId von NOT NULL auf NULL geändert
- NEU: Conversation.widgetSessionToken (String?, unique)
- NEU: Conversation.widgetVisitorMeta (Json?)
- Status-Enum unverändert (Web nutzt ACTIVE statt OPEN)
- Migration via prisma migrate diff + migrate deploy
- Rollback-Skript prisma/rollback/003_*.sql vorbereitet
- Verifikation: alle 5 Checks grün, 1 Tenant unverändert
- Build fehlerfrei

### Phase 3b.5 — processMessage Consent-Persistenz-Fix (Commit b75418b)
- isNewConversation-Branch persistiert jetzt USER und ASSISTANT
  Consent-Message via saveMessage-Helper
- Macht Web-Widget-Polling-Flow funktional (kein sync Transport)
- Verbessert DSGVO-Audit-Trail (Pre-Consent-Input wird geloggt)
- WhatsApp-Pfad unverändert (responses[] weiterhin returned)
- Test-Skript bestätigt: alle 6 Checks grün

### Phase 3b — Widget-API POST-Endpoints (Commit 83e99d9)
- src/lib/widget/sessionToken.ts: generateSessionToken +
  verifySessionToken + hashTokenForRateLimit
- POST /api/widget/session (Rate-Limit 30/h IP, Zod, CORS,
  Audit-Log)
- POST /api/widget/message (Rate-Limit 60/h Token-Hash, ruft
  processMessage mit channel=WEB, 202 Accepted)
- GET /api/widget/poll (Rate-Limit 3600/h Token-Hash, kein Audit,
  liefert messages array)
- AuditAction-Union um widget.session_started und
  widget.message_received erweitert
- End-to-End Smoke-Test 4/4 grün
- Token-Hashing schützt vor Klartext-Tokens in Upstash-Cache-Keys

### Phase 4-pre — Consent-Erweiterung + Quality-Roadmap (3 Commits)
- /api/widget/session akzeptiert optionalen consentGiven=true
  (Commit 9626592)
- /api/widget/message Logik: isNewConversation nur wenn
  !conversation.consentGiven (überspringt Consent-Dance bei
  pre-consented Sessions)
- welcomeMessage-Default bestätigt (parseConfig in publicKey.ts
  war bereits korrekt, keine Änderung nötig)
- docs/quality-roadmap.md angelegt (7/10 → 9/10 Plan)
  (Commit 2d98e80)
- CLAUDE.md Reading-Order um quality-roadmap.md erweitert
  (Commit 39c6783)
- Smoke-Test bestätigt: alter Pfad (ohne consentGiven) legt
  consentGiven=false/consentAt=null an, neuer Pfad
  (consentGiven=true) überspringt Consent-Dance, Bot liefert
  echte Claude-Antwort beim ersten Turn

### Block 1 / Phase 4-pre+1 — CSP-Nonce-Fix (Commit 2087f4f)
- src/middleware.ts: Per-Request-Nonce, dynamische CSP, x-nonce-Header
  für Next.js SSR-Hydration, frame-ancestors */none je nach Route
- vercel.json: X-Frame-Options auf Widget-Routen entfernt (Vercel
  greift VOR Middleware, daher hier separat erforderlich)
- docs/tech-debt.md: 3 neue Einträge (Inline-Styles, Google Fonts,
  X-Frame-Options-Verifikation in Production)
- Smoke-Test 5/5 grün (Nonce-Rotation, frame-ancestors Toggling,
  Build, alle Bestandsseiten 200, Admin-Login-Inline-Script bekommt
  Nonce)
- Vorbereitung für Phase 4 (iframe-UI) und Phase 5 (Embed-Script)
  abgeschlossen

### Phase 4a — Widget iframe-Skelett (Commit ee9209c)
- /embed/widget Route mit React Server Component
- 10-Felder-Tenant-Config: backgroundColor, primaryColor,
  accentColor, textColor, mutedTextColor, logoUrl, botName,
  botSubtitle, welcomeMessage, avatarInitials
- Defensive parseConfig in publicKey.ts (HEX-Validation,
  String-Length-Bounds, URL-Format-Check)
- DEFAULT_CONFIG für unkonfigurierte Tenants (neutral edel,
  Anthrazit + Indigo)
- Widget-Page voll dynamisch, null hardcoded Farbwerte außer
  in DEFAULT_CONFIG
- Tailwind-4-Bug: @source-Direktive in globals.css ergänzt,
  weil Auto-Detection /embed/ nicht erfasst hatte
- Visuelle Verifikation in Desktop und Mobile-Viewport bestanden
- Phase 4b (Chat-Logik + Polling) als nächstes

### Phase 4b — Live Chat mit Consent-Modal + Polling (Commits 9e134e4 + 49c2415)
- ChatClient Client Component mit allen interaktiven Zuständen
- Consent-Modal vor Chat-Start (Akzeptieren/Ablehnen-Flow)
- Optimistic UI für User-Messages mit Polling-Bestätigung
- 2-Sekunden-Polling-Loop mit useEffect-Cleanup
- Typing-Indicator und Auto-Scroll
- Avatar + withAlpha Helper in eigene Dateien extrahiert
- CSP-Dev-Mode-Fix für Next.js HMR (Production unverändert strikt)
- End-to-End verifiziert: echte Multi-Turn-Konversation mit Claude
  funktioniert, Kontext bleibt erhalten, UX flüssig

### Phase 4c — Polishing + Animationen + Accessibility (Commit ed406d4)
- Modal Fade-in/Slide-up Animation 300ms
- SendButton mit React-State-basiertem Hover/Press/Disabled
  (Tailwind 4 enabled: Variant erwies sich als unzuverlässig)
- Send-Button Icon von 16px auf 20px vergrößert (bessere Proportion)
- Bot/User-Bubble subtile Doppel-Schatten für Tiefe
- Typing-Indicator mit gestaffelter Pulse-Animation
- Initial-Focus-Management für Modal und Input
- ARIA-Basics für Dialog, Modal, Live-Regions
- Network-Error-Handling im Polling mit Offline-Banner (5-Fail-Threshold)
- Long-Message-Wrap mit break-words
- Mobile-Touch-Targets 44x44, 16px Input-Font
- Phase 4 ist damit komplett

### Phase 5-Pre Hotfix — externalId-Null-Bug (Commits 90a18a0 + 9c25102)
- Production-Hotfix für Dashboard-TypeError "Cannot read
  properties of null reading length"
- Root cause: Phase 3a.5 hat externalId nullable gemacht,
  3 Dashboard-Dateien hatten lokale maskId() ohne Null-Check
- TypeScript-Interfaces korrigiert (string | null)
- maskId() in 3 Dateien null-safe gemacht
- API-Handler mit explizitem ?? null
- Defense-in-Depth ?? []-Guards in dashboard/page.tsx
- Tech-Debt-Eintrag mit Lessons Learned und Migration-Workflow-Ergänzung
- Code-Hygiene-Hinweis: maskId() sollte in Phase 7 zentralisiert werden

### Phase 5 Pre — CLAUDE.md gehärtet (Commit 70b18ed)
- Vier nicht-verhandelbare Pflicht-Regeln verankert:
  Auto-Doku, Schema-Konsumenten-Audit, Diagnose-vor-Fix,
  Premium-SaaS-Look
- Mandatory reading list erweitert um architecture.md,
  data-model.md, changelog.md (sobald angelegt)
- Kollisions-Klausel für Eskalationspfad hinzugefügt
- Security/DSGVO bleibt hart über Premium-Look
- Bestehende Sektionen unberührt
- Vorher: 206 Zeilen → Nachher: ca. 400 Zeilen

---

## Offene Arbeit / Blocker

### Nächste Phasen
- Phase 5: Embed-Script (Floating Button auf Pilot-Webseiten)
- Architecture.md anlegen (User-Wunsch, Session morgen)

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
