# Projekt-Status — AI Conversion Web-Widget

**Letzte Aktualisierung:** 2026-04-13
**Aktuelle Phase:** Phase 7 abgeschlossen — Pilot-Ready, Production deployed + CSP-Hotfix
**Letzter Commit:** feat(monitoring): sentry production-verified, debug endpoints removed

---

## Tages-Zusammenfassung 13.04.2026

### Erledigt
1. Integration-Guide-Platzhalter ersetzt (Pilot-Blocker #1)
2. DB-Split komplett (Pilot-Blocker #3): zwei Prisma-Postgres-Instanzen,
   Dev via .env.local, Prod nur in Vercel Production Env-Vars
3. Production-Incident entdeckt und behoben (siehe unten)
4. Vercel-Storage konsolidiert: nur DATABASE_URL fuer Production,
   Preview/Development bewusst leer (ADR: vercel-storage-minimal-config)
5. Magic-Link fuer internal-admin gegen Prod-DB rotiert, Login verifiziert
6. dashboard-links.txt bereinigt (11 alte Tokens entfernt)
7. architecture.md nachgepflegt (Model-Count, Routen, Version)
8. SESSION_HANDOFF.md erstellt fuer ConvArch-Uebergabe
9. CLAUDE.md: Hand-Off Output-Format und Prozess-Output-Regeln ergaenzt
10. Sentry SDK fuer Next.js installiert und in Production verifiziert:
    - SDK installiert, Build gruen
    - instrumentation.ts lag im Root statt /src/ (Next.js 15 + /src/app
      erwartet instrumentation.ts in /src/) → verschoben, Imports angepasst
    - SDK initialisiert sich korrekt, Test-Event erfolgreich empfangen
    - Source-Maps-Upload deaktiviert (TD-Monitoring-02)
    - AVV + Datenschutz-Update als Tech-Debt erfasst (TD-Compliance-01/02)
    - Diagnostische Test-Endpoints entfernt nach Verifikation
    - TD-Monitoring-03 fuer Wissens-Konservierung angelegt
11. Admin-UI: paddlePlan-Selector in Anlage- + Bearbeiten-Modal ergaenzt.
    Vorher: neue Tenants nur via DB-PATCH plan-faehig. Jetzt: 1-Klick
    Plan-Auswahl (Starter/Growth/Professional) direkt im Admin-UI.
12. TenantDetailModal: Plan-Anzeige + "Alle Einstellungen bearbeiten"-Button
    ergaenzt. Vorher: EditTenantModal war unerreichbar (onEdit-Prop nicht
    aufgerufen). Jetzt: Detail-Modal zeigt Plan + fuehrt zum Edit-Modal.
13. CSP: connect-src um Sentry-Ingest erweitert (TD-Monitoring-04).
    Browser-Side Sentry war seit Setup blockiert, Server-Side ueberdeckte es.
14. Sentry Browser-SDK-Init sauber auf src/instrumentation-client.ts
    umgestellt (TD-Monitoring-05). Ignorierte Build-Warnung vom initialen
    Setup endgueltig adressiert. Alle Sentry-Configs liegen jetzt
    einheitlich in src/. Build ohne Sentry-DEPRECATION-Warnungen.

### Production-Incident: DATABASE_URL korrumpiert (08.04.–13.04.2026)

**Dauer:** ~5 Tage unentdeckt (08.04. bis 13.04. ~15:30 Uhr)
**Auswirkung:** Alle DB-abhaengigen Endpoints lieferten 500 (Prisma P1001:
"Can't reach database server at base"). Betroffen: /dashboard/login,
/api/dashboard/*, /api/widget/session, /api/widget/message, /api/widget/poll,
/api/webhook/whatsapp, /api/cron/*.
**Nicht betroffen:** / (statisch), /widget.js (statisch), /api/widget/config
(In-Memory-Cache, kein DB-Zugriff bei Cache-Hit).
**Root-Cause:** Vercel Production DATABASE_URL hatte korrumpierten Wert —
Hostname `base` statt `db.prisma.io`. Vermutlich Quoting-Bug beim initialen
Setup am 08.04. (`""postgres://..."` statt `"postgres://..."`).
**Behebung:** Manueller URL-Replace in Vercel Dashboard + Redeploy.
**Warum 5 Tage unentdeckt:** Better Stack monitored nur 3 Endpoints
(/, /widget.js, /api/widget/config) — keiner davon ist DB-abhaengig.
Sentry (Pilot-Blocker #2) haette den P1001 sofort gemeldet.
**Praevention:** TD-Monitoring-01 (DB-Endpoint in Better Stack) +
Pilot-Blocker #2 (Sentry).

### Pilot-Blocker-Status
- ~~#1 Integration-Guide-Platzhalter~~ — erledigt 13.04.
- ~~#2 Sentry / Error-Tracking~~ — erledigt 13.04. (SDK installiert +
  in Production verifiziert, DSN-Scope auf Production beschraenkt)
- ~~#3 DB-Dev/Prod-Split~~ — erledigt 13.04.
- #4 Datenschutzerklaerung Web-Widget — offen
- #5 Wix-Menuepfade verifizieren — offen
- #6 AVV-Template nach Art. 28 DSGVO — offen

**3 von 6 Pilot-Blockern verbleiben.**

---

## Production-Deploy: 12.04.2026 (erfolgreich)

**Deployed Commit:** ef25efe (inkl. Phase 2-7 + Deploy-Prep + Trigger-Commit)
**Vorheriger Production-Commit:** debe389 (9. April, verwaist)
**Ursache des 3-Tages-Drifts:** Vercel war mit falschem Repo verbunden
(`ai-conversion` statt `ai-conversion-newwindowsaccount`). Reconnect am
12.04.2026 18:25 Uhr. Push + Auto-Deploy erfolgreich.

### Verified in Production (12.04.2026 18:35 Uhr)
- [x] `/` — 200 OK
- [x] `/widget.js` — 200 OK (war vor Deploy 404)
- [x] `/api/widget/config?key=pub_OQ5vM7rpiwTgwik0` — 200 JSON
- [x] CSP Nonce-basiert (`strict-dynamic`), kein `unsafe-inline`
- [x] Tenant-Isolation (internal-admin vs test-b) auf Prod verifiziert
- [x] Function-Region fra1 (Frankfurt, DSGVO-konform)
- [x] Better Stack Monitoring aktiv (3 Monitore, Status-Page live)
- [ ] /dashboard/login liefert 400 auf unauthentifizierten curl —
  kein Blocker, Login-Flow funktioniert im Browser

### Status
**Production entspricht jetzt lokalem Pilot-Ready-Stand.**
Infrastruktur-Luecke zwischen lokal und Production ist geschlossen.

### Naechste Schritte fuer Pilot-Akquise
Siehe ConvArch-Roadmap (Woche-Plan):
1. AVV-Template nach Art. 28 DSGVO
2. Sentry einrichten
3. Datenschutzerklaerung fuer Web-Widget ergaenzen
4. Single-Instance-DB-Split bevor erster Pilot-Kunde
   (siehe docs/tech-debt.md)

---

## Production-Hotfix: 12.04.2026 abends (CSP-Nonce-Regression behoben)

### Problem
Der Production-Deploy vom Nachmittag (Commit ef25efe) hat die CSP-Nonce-
Migration aus Phase 6 aktiviert. Folge: Browser blockierte alle
JavaScript-Bundles, weil Next.js den Nonce nicht auf Framework-Scripts
propagierte.

### Root Cause
1. Middleware setzte CSP nur auf Response-Headers, nicht auf Request-Headers.
   Next.js 15 SSR-Renderer extrahiert den Nonce aus dem
   Content-Security-Policy-Header der Request-Headers.
2. Viele Seiten wurden statisch zur Build-Zeit gerendert — zu dem Zeitpunkt
   laeuft keine Middleware, kein Nonce verfuegbar.

### Fix (Feature-Branch fix/csp-nonce-request-header, 3 Commits)
1. `4590cc1` — Middleware propagiert CSP jetzt auf BEIDE Header-Ebenen
   (Request + Response)
2. `16348a0` — Root-Layout ruft `await headers()` auf → zwingt dynamisches
   Rendering aller Seiten
3. `e04e7d0` — Regression-Dokumentation

### Verification
- Lokaler Production-Build-Test (A.3b): alle Test-Routen gruen,
  Nonce-Match CSP == HTML
- Preview-Deploy auf Vercel: Landing und Dashboard rendern vollstaendig
- Production-Deploy (Commit e04e7d0): Landing und Dashboard live,
  keine CSP-Script-Violations

### Prozess-Lektion
Phase 6 hat den Nonce-Austausch gebaut und committet, aber nie in einer
echten Production-Umgebung (oder lokal via `next start`) verifiziert.
Dev-Mode ist CSP-lax und verdeckt solche Regressionen. Ab jetzt: vor
jedem sicherheitsrelevanten Deploy zwingend `next build && next start`
lokal testen, und Preview-Deploys nutzen.

### Status
**Production laeuft stabil auf Commit e04e7d0.**
Nonce-CSP aktiv, alle Seiten funktional, keine Regression auf Vorhandenem.

### Offene Punkte (nicht blockierend)
- Logo-Cleanup: `_next/image` 404 auf entferntes `/logo.png` — beim
  Rebranding ohnehin neu
- Vercel.live iframe CSP-Warnung: nur in Preview-Umgebung sichtbar,
  nicht in Production. Kein Handlungsbedarf.

---

## Audit-Hotfix High #2: Session-Token-Hash (12.04.2026 spaet abends)

### Problem (aus Audit docs/audit-web-widget-2026-04-12.md)
Raw Session-Token (`ws_xxx`) wurde als `senderIdentifier` an
`processMessage()` uebergeben. Aktuell toter Parameter, aber
Defense-in-Depth-Risiko fuer zukuenftige Refactors.

### Fix
Commit `76ef8fa` — Ein-Zeilen-Fix: `sessionToken` →
`hashTokenForRateLimit(sessionToken)` in
`src/app/api/widget/message/route.ts:137`

### Verification
- Lokaler Production-Test (H.3): Message 202, Multi-Turn stabil,
  kein Leak
- Production-Smoke-Test (H.5): alle 7 Checks gruen
- Kein Migrations-Bedarf (Forward-Only, nie in DB persistiert)

### Status
**Production laeuft stabil auf Commit 76ef8fa.** Widget-Kern-
Funktionalitaet unveraendert, Token-Leak-Vektor geschlossen.

---

## Audit-Hotfix High #1: Fallback-Persistierung (12.04.2026 spaet abends)

### Problem
Bei Claude-API-Fehler wurde RETRY_FALLBACK_MESSAGE in `responses[]`
zurueckgegeben, aber nicht via `saveMessage()` persistiert. Web-Widget-
User sah nie eine Antwort, weil Poll nur aus DB liest. Aeusserer
Catch-Block gab sogar `responses: []` zurueck.

### Fix
Commit `4e05e8c` — `saveMessage()` + `auditLog()` in beiden Catch-
Bloecken. Kanal-agnostisch: beide Widget- und WhatsApp-Flows
profitieren.

### Verification
- H.3: Lokaler Test mit invalidem ANTHROPIC_API_KEY — Fallback
  erscheint im Poll
- H.5: Production-Smoke-Test — Happy-Path unveraendert

### Status
**Production laeuft stabil auf Commit 4e05e8c.** Beide High-Befunde
aus Audit vom 12.04. sind gefixt. Widget ist vollumfaenglich
Pilot-Ready.

---

## Tages-Zusammenfassung 12.04.2026

### Deployments heute: 10
Alle mit sauberem Prozess (Feature-Branch → Pre-Analyse → Lokaler
Test → Merge → Production-Verifikation → Docs).

### Erledigt
1. Better Stack Monitoring live (3 Monitore + Status-Page)
2. Vercel Repo-Mismatch gefixt (war auf falschem Repo verbunden)
3. CSP-Nonce-Regression (Commits 4590cc1 + 16348a0)
4. Web-Widget Audit (docs/audit-web-widget-2026-04-12.md)
5. High #1 — Fallback-Message-Persistierung (4e05e8c)
6. High #2 — Session-Token-Hash (76ef8fa)
7. Medium M1 + Low L11 — Tenant-Isolation (763fa69)
8. Medium M2 — HTTPS-Only Logo-URLs (4a2ff80)
9. Medium M3 — Top-Level Error-Handler (b049bce)
10. Medium M4 — Poll select-Clause (ce5ccbe)
11. Medium M6+M7+M8 — A11y-Bundle (71869f8)
12. Medium M5 — Toggle Race-Condition (67240f9)

### Audit-Status
- Critical: 0
- High: 0 offen (2 erledigt)
- Medium: 0 offen (8 erledigt)
- Low: 11 offen (L1-L10, L12) — alle XS-S, keiner pilot-blockierend
- Info: 30+ (kein Handlungsbedarf)

### Codebase-Status
**Widget-Codebase ist vollumfaenglich Pilot-Ready.** Alle kritischen
und mittelprioritaeren Security-, Tenant-Isolation- und
Accessibility-Themen adressiert.

### Bekannte offene strategische Themen
- ~~DB-Dev/Prod-Split~~ — erledigt 13.04.2026 (zwei Prisma-Postgres-Instanzen, Dev via .env.local, Prod nur in Vercel)
- Sentry / Error-Tracking einrichten
- AVV-Template nach Art. 28 DSGVO
- Datenschutzerklaerung Web-Widget
- Admin-Dashboard: Tenant-Widget-Uebersicht (Scope-Spec ausstehend)
- Automatisiertes Testing (Unit + Integration)
- ~~Integration-Guide Platzhalter~~ — erledigt 13.04.2026 (`support@ai-conversion.ai`, `https://status.ai-conversion.ai`)
- Wix-Menuepfade in Integration-Guide verifizieren vor erstem Wix-Kunden

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

### Phase 5 Pre 2 — docs/architecture.md (Commit ef3dc36)
- Lebendes Architektur-Dokument angelegt
- 11 Sektionen, ~400 Zeilen, ~12 Minuten Lesezeit
- Basis für alle zukünftigen System-Änderungen
- Bei jeder System-Änderung automatisch zu aktualisieren
  (CLAUDE.md Regel 1)
- Ab sofort Pflicht-Lektüre bei jedem Phase-Prompt

### Phase 5 — Embed-Script (Commit 705007b)
- public/widget.js: Vanilla-JS-Loader mit closed Shadow DOM,
  Floating-Bubble unten rechts, Lazy-Config-Fetch, Morph-
  Animation Bubble ↔ X, 12.5 KB
- public/widget-bubble-icon.svg: Premium-Standard-Icon
  (asymmetrische Sprechblase + 3 solide Dots)
- public/widget-demo.html: Premium-gestaltete Demo-Seite
  "Atelier Hoffmann" mit Cormorant+Inter-Typography,
  Demo-Key als Placeholder (pub_DEMO_REPLACE_ME)
- ResolvedTenantConfig um bubbleIconUrl (string | null) erweitert
- API /api/widget/config liefert bubbleIconUrl im Response
- Konsumenten-Audit durchgeführt (Regel 2): 3 Stellen angepasst
- docs/decisions/phase-5-embed-script.md: ADR mit 3
  Architektur-Entscheidungen + Trade-offs + Reversibilität +
  Akzeptierte Browser-Warnung (Sandbox-Eskalations-Hinweis)

### Phase 5 Hotfix — CSP Route-Override für Demo-Seite (Commit 865843b)
- Datum: 2026-04-12
- Root-Cause: widget-demo.html ist statisch, bekommt
  strict-dynamic-CSP, blockiert widget.js (kein Nonce-Inject
  möglich ohne SSR)
- Drei vom User ursprünglich vorgeschlagene Optionen (A/B/C)
  nach Regel-3-Diagnose verworfen (falsches Ziel bzw.
  inkompatibel mit strict-dynamic)
- Option D umgesetzt: neue isDemoRoute()-Funktion in
  middleware.ts, script-src ohne strict-dynamic für
  /widget-demo*, alle anderen Routen unverändert
- Verifikation: Build grün, Curl-Tests für /widget-demo.html
  (ohne strict-dynamic), /dashboard (mit strict-dynamic
  Regression), /api/widget/config (mit strict-dynamic +
  frame-ancestors *) alle wie erwartet
- Browser-Test verifiziert: Demo-Seite lädt, Bubble sichtbar
  mit soliden Dots, Console sauber abgesehen von der
  akzeptierten Sandbox-Warnung (dokumentiert im ADR)
- Pilot-Kunden-CSP-Thema als separates Tech-Debt-Ticket
  angelegt (Doku-only, kein Middleware-Fix möglich)
- docs/decisions/phase-5-embed-script.md um "CSP-Hotfix
  (Option D)"-Sektion erweitert
- docs/tech-debt.md um zwei Einträge ergänzt:
  "Pilot-Kunden-Integration-Guide" und
  "Demo-Route-CSP-Lockerung"

### Phase 3b Spec-Drift-Korrektur — Session-Rate-Limit (Commit a26977d)
- Datum: 2026-04-12
- Befund: /api/widget/session hatte max: 30 Sessions/IP/h
  konfiguriert, Spec WEB_WIDGET_INTEGRATION.md § 3.3 verlangt
  wörtlich "Rate-Limit STRENG: 10 Sessions/IP/h"
- Entdeckt im Phase-5-Done-Kriterien-Audit (Spec-vs-Code-
  Tabelle), nicht im Code-Review von Phase 3b
- Root-Cause: irreführender Code-Kommentar ("30 Sessions pro
  Stunde pro IP (strenger als Config)") ohne Spec-Bezug, plus
  fehlendes Phase-3b-ADR, plus nicht durchgesetzter Pre-
  Analyse-Wert aus ARCHITECTURE_REPORT.md § 3c
- Korrektur: max: 30 → max: 10, Kommentar ersetzt durch
  spec-referenzierten Block (Datei + § + wörtliches
  Security-Argument)
- Alle 3 anderen Widget-Rate-Limits (config, message, poll)
  sind spec-konform und wurden nicht angefasst
- docs/decisions/phase-3b-rate-limit-correction.md: neuer
  ADR mit Befund, Root-Cause, Korrektur und Lessons Learned
  zum Thema "unsichtbare Spec-Drift durch plausibel klingende
  Code-Kommentare ohne Spec-Bezug"
- Kein Tech-Debt-Eintrag, weil der Drift unmittelbar gefixt ist

### Phase 3b Doku-Reconciliation — Spec-Drifts dokumentiert + Regel 5 (Commit 7c632f2)
- Datum: 2026-04-12
- Auslöser: Phase-3b-Vollaudit nach Session-Rate-Limit-Fix
  hat zwei weitere Soft-Drifts identifiziert (funktional
  korrekt, aber nicht spec-referenziert dokumentiert)
- Drift 1 dokumentiert: Config-Response-Felder 3 (Spec) → 11
  (Code). Erweiterung erfolgte in Phase 4a (10 Felder) und
  Phase 5 (bubbleIconUrl). Alle 11 Felder verifiziert
  nicht-sensitiv. Begründung: Premium-Branding-Direktive,
  Dark-Mode-Fähigkeit, Bot-Identitäts-Customization,
  WCAG-AA-Accessibility
- Drift 2 dokumentiert: Poll-Endpoint ohne auditLog().
  Begründung: Read-only-Heartbeat alle 2s würde Log-Volumen
  um ~4M Zeilen/Tag bei 100 Pilot-Sessions aufblähen, ohne
  kompensatorischen Compliance-Wert — alle zustandsändernden
  Events sind in den anderen 3 Endpoints bereits auditiert
- docs/decisions/phase-3b-spec-reconciliation.md: neuer
  konsolidierter ADR mit Sensitivitäts-Verifikation jedes
  Config-Felds, Log-Volume-Rechnung für Poll-Ausnahme,
  Konsistenz-Tabelle aller 4 Widget-Endpoints mit
  Audit-Log-Status, geprüften Alternativen und
  Reversibilitäts-Check
- CLAUDE.md um Regel 5 erweitert: "Spec-Bezug in
  Code-Kommentaren bei Abweichungen". Verbietet plausibel
  klingende Kommentare ohne Spec-Referenz. Fordert drei
  Elemente: (a) Spec-Pfad + §, (b) Begründung des Wertes,
  (c) ADR-Verweis bei >2 Zeilen. Mit korrektem und
  verbotenem Beispiel
- Phase 3b damit final spec-konform UND vollständig
  dokumentiert. Drei Drifts in einem Tag geschlossen
  (Session-Rate-Limit code-fix + Config-Felder ADR +
  Poll-Audit-Log ADR)
- Phase 6 ist aus Doku-Sicht freigegeben

### Phase 6.2 — Widget-Settings-Page (Commit 029f2a1)
- Datum: 2026-04-12
- Sub-Phase 6.1 (Pre-Analyse): 5 Verifikations-Punkte
  geprüft, zwei offene Entscheidungen (E1, E2) vom User
  beantwortet
- E1: hasPlanFeature() als neuer Helper statt
  checkLimit(..., 'web_widget'), saubere Quota-vs-Feature-
  Flag-Trennung
- E2: neue dedizierte /dashboard/conversations/page.tsx
  List-View in 6.3 statt bestehende Views zu erweitern
- Neuer Helper: src/lib/plan-limits.ts hasPlanFeature(paddlePlan,
  feature) mit spec-referenziertem Kommentar nach CLAUDE.md
  Regel 5
- 3 neue API-Endpoints unter /api/dashboard/widget-config:
  * GET: lädt Config mit aufgefüllten Defaults, Plan-Check via
    hasPlanFeature → 403 für Starter
  * PATCH: partielles Update der 10 editierbaren Felder,
    Zod-Validierung (Hex-Colors + String-Bounds), Merge-Semantik,
    auditLog "widget.config_updated"
  * generate-key POST: idempotenter Key-Gen mit 3×-Retry bei
    Unique-Kollision, auditLog "widget.public_key_generated"
  * toggle POST: enable/disable, bei Auto-Aktivierung ohne
    bestehenden Key wird Key automatisch erzeugt, auditLog
    "widget.toggled"
- Settings-Page /dashboard/settings/widget/page.tsx:
  * "use client" Client Component, 538 Zeilen, Pattern-Referenz
    settings/prompt/page.tsx
  * Toggle-Card, Public-Key-Display mit Copy-Button, Embed-Code-
    Generator mit kollapsierbaren Plattform-Tabs (HTML/WordPress/
    Shopify/GTM — pure Anleitungs-Texte, kein duplizierter Code)
  * Config-Editor: 5 Color-Pickers + 5 Text-Inputs,
    Merge-Update-Semantik, inline PreviewNonce für
    iframe-Reload nach Save
  * Live-Preview: iframe gegen /embed/widget?key=... (Preview ==
    Production garantiert, kein Drift-Risiko)
  * Upgrade-Prompt für Starter-Plan mit Link zu /pricing
- 3 neue AuditAction-Values: widget.config_updated,
  widget.public_key_generated, widget.toggled
- src/lib/widget/publicKey.ts: parseConfig() exportiert + neuer
  generatePublicKey()-Helper (Konsistenz mit
  src/scripts/generate-widget-keys.ts Format)
- Z1: prisma/schema.prisma Zeile 42 Schema-Kommentar auf
  Verweis zu phase-3b-spec-reconciliation.md aktualisiert
  (out-of-date 3-Felder-Liste entfernt)
- Z2: docs/tech-debt.md neuer Eintrag "Phase 4-pre —
  prompt/route.ts ohne auditLog()" (Pre-existing Drift,
  in 6.1 Pattern-Referenz-Lesung entdeckt, Fix trivial
  aber out-of-scope für Phase 6)
- ADR docs/decisions/phase-6-dashboard-widget.md: 4
  Architektur-Entscheidungen + technische Details + offene
  Punkte für 6.3/6.4
- Phase 6.3 (Channel-Filter) und 6.4 (E2E-Smoke-Test) stehen
  noch aus

### Phase 6.3 — Conversations-List-View + Channel-Filter (Commit 018a9cb)
- Datum: 2026-04-12
- Entscheidung E2 aus 6.1-Pre-Analyse umgesetzt: Ansatz Y
  (dedizierte List-View statt verstreute Filter in 3 bestehenden
  Views)
- Neue Server-Component-Page /dashboard/conversations mit
  Prisma-Direct-Load, URL-Query-Filter ?channel=WHATSAPP|WEB
  und ?page=N Paginierung (20/Seite), Channel-Badge pro Eintrag,
  Empty-State mit Filter-Reset-Link
- ConversationsFilter Client-Component mit useTransition für
  smooth Filter-Wechsel ohne Full-Page-Flash
- ChannelBadge als wiederverwendbare Komponente in eigener
  Datei extrahiert, wird in 3 Views konsumiert (List, Detail,
  CRM) — DRY mit technisch unmöglichem Drift
- Channel-Badge-Farbwahl: Emerald (WhatsApp) + Sky (Web)
  statt Briefing-Wortlaut Primary/Accent. Begründung:
  Dashboard-Gold = PAUSED, Dashboard-Purple = ACTIVE, Kollision
  mit Status-Pills wäre unvermeidbar gewesen. Als bewusste
  Briefing-Abweichung nach CLAUDE.md Regel 5 in ChannelBadge.tsx
  kommentiert + im ADR phase-6-dashboard-widget.md ausführlich
  begründet
- API /api/dashboard/conversations erweitert um channel-Filter
  (Zod-validiert) und channel im Response-Shape
- API /api/dashboard/conversations/[id] liefert channel mit
- API /api/dashboard/leads nested Select erweitert um
  conversation.channel für CRM-Kanban-Karten
- dashboard/page.tsx: "Alle anzeigen →"-Link im "Letzte
  Gespräche"-Block unten rechts, öffnet /dashboard/conversations
- KPI-Kachel "Aktive Gespräche": verifiziert dass der zugrunde
  liegende DB-Query bereits kanal-agnostisch ist (nur tenantId +
  status, kein channel-Filter), summiert automatisch WhatsApp +
  Web. Kein Fix nötig
- Cosmetic: lokale URLSearchParams-Variable in buildPageUrl
  von params auf qp umbenannt, vermeidet Verwechslung mit
  Next.js-searchParams-Prop
- Phase-6.1-Hydration-Failure-Eintrag in docs/tech-debt.md
  (pre-existing dirty aus Debug-Vorfall vor 6.2) im selben
  Commit mitgenommen — nicht als separater Commit
- Read-only GET-Endpoints (List, Detail) loggen weiterhin
  kein auditLog, konsistent mit Poll-Endpoint-Präzedenz aus
  docs/decisions/phase-3b-spec-reconciliation.md
- Phase 6.4 (E2E-Smoke-Test durch Project Owner) steht noch aus

### Phase 6.4 — E2E-Smoke-Test verifiziert (Commit b3b113a)
- Datum: 2026-04-12
- Tester: Project Owner
- Test-Setup: internal-admin-Tenant temporär auf paddlePlan
  "growth_monthly" gesetzt via src/scripts/upgrade-test-tenant.ts
  (hasPlanFeature(..., "web_widget") = true, Widget-Settings-Page
  zeigt Settings statt UpgradePrompt)
- Dev-Server: Port 3000, .next/ frisch nach Cache-Reset
  (Phase-6.1-Lesson-Learned angewandt)
- Befund: ALLE 7 End-to-End-Kriterien grün
  1. Widget lädt auf public/widget-demo.html, Bubble
     erscheint, DSGVO-Consent-Modal funktioniert, Konversation
     läuft mit echtem Bot-Response-Pfad
  2. Conversation wird in DB persistiert mit channel: WEB
  3. /dashboard/conversations zeigt neue Web-Session mit
     ChannelBadge "Web" (Sky-Blau), Score 30, Status Aktiv
  4. Detail-View /dashboard/conversations/[id] zeigt kompletten
     Chat-Verlauf, alle Messages korrekt AES-256-GCM-
     entschlüsselt, ChannelBadge im Header neben maskierter ID
  5. Lead wird mit Score 30/100, Stage MQL, Pipeline NEU
     automatisch angelegt (GPT-4o-Scoring-Pipeline via
     processMessage.runScoringPipeline async)
  6. Sprache automatisch als DE erkannt (language="de" default)
  7. Bot-Logik (System-Prompt, Lead-Scoring) funktioniert
     kanal-agnostisch — exakt dieselbe processMessage-
     Pipeline wie für WhatsApp (Phase 1 Extraktion bestätigt)
- Alle Phase-6-Done-Kriterien aus WEB_WIDGET_INTEGRATION.md
  § "Phase 6: Dashboard-Integration" erfüllt:
  * Nutzer kann Widget im Dashboard konfigurieren ✓
  * Embed-Code kopieren + in Host-Webseite einbetten ✓
  * Live-Preview des Widgets ✓
  * Channel-Filter funktioniert in der neuen List-View ✓
  * Plan-Gating greift (STARTER → 403, GROWTH+ → Settings) ✓
- docs/decisions/phase-6-dashboard-widget.md um Sub-Phase-6.4-
  Sektion erweitert mit Befund, Test-Setup-Notiz und Klarstellung
  zur Bot-Antwort-Beobachtung (siehe dort)
- **Phase 6 final abgeschlossen.** Nächster Schritt: Phase 7
  (Hardening, 10 Test-Szenarien aus WEB_WIDGET_INTEGRATION.md,
  Pilot-Kunden-Integration-Guide aus tech-debt.md)

### Phase 7 — Testing & Hardening: Pilot-Ready (Commits dc9538a, ea0e2bb + dieser Commit)
- Datum: 2026-04-12
- Pre-Analyse: 10 Test-Szenarien gruppiert (A: sofort, B: Setup,
  C: blockiert), Security-Checkliste 17 Punkte geprueft
- Test-Gruppe A (6/6 gruen): Happy Path, DSGVO, Widget-Deaktiviert,
  Graceful Degradation, Plan-Gating, Rate-Limit
- Test-Gruppe B (3/3 gruen):
  * B1 Cross-Origin: http-server auf Port 3001, Widget-Embedding
    per CORS verifiziert
  * B2 Tenant-Isolation: 13 Sub-Tests (API + DB), null Cross-Leaks,
    Fabricated-Token → 401
  * B3 Mobile: Echtes Smartphone (Brave Android), 2 Bugs gefunden
    und gefixt (Close-X-Overlap + Auto-Fokus-Tastatur)
- Test-Gruppe C (1 blockiert): WhatsApp-Regression durch fehlende
  Meta Business Verification extern blockiert
- Security-Checkliste: 16 PASS + 1 akzeptiert per ADR
- 2 Mobile-UX-Fixes: Close-X nach oben-rechts auf Mobile
  (widget.js), Auto-Fokus-Unterdrueckung (ChatClient.tsx)
- Chromium-Keyboard-Avoidance als Tech-Debt akzeptiert
  (Standard-Plattformverhalten)
- Integration-Guide docs/integration-guide.md geschrieben
- Test-Tenant-B Seed-Script erstellt
- 3 ADRs geschrieben (CORS, Embed-Script Vanilla-JS,
  Tenant-Isolation-Test-Setup)
- **Gesamt: 9/10 Szenarien verifiziert. System ist Pilot-Ready.**

### Phase 6.5 — Settings-Sidebar + Browser-Verifikation + Polish (Commits b1f842f, 4cc1db0, 94bf6d6)
- Datum: 2026-04-12
- Scope: Navigation-Polish nach dem E2E-Abschluss. Die Settings-
  Bereiche (Widget aus 6.2, Prompt aus Phase 4-pre) saßen bis
  hierher als isolierte Einzel-Seiten ohne Einstiegspunkt vom
  Haupt-Dashboard — 6.5 macht sie zu einem dedizierten Bereich
  mit eigener linker Sidebar
- Drei Architektur-Entscheidungen:
  1. Sidebar-Pattern statt Tab/Dropdown (Notion/Linear/Stripe-
     Standard, skaliert auf 6+ Settings-Bereiche)
  2. Coming-Soon-Items sichtbar aber disabled: signalisiert
     Pilot-Kunden Produkt-Roadmap ohne versprechenden Link
  3. Mobile-Hamburger direkt mitgebaut (<640px, sm:-Breakpoint),
     kein späterer Responsive-Refactor nötig
- 3 neue Files:
  * src/app/dashboard/settings/layout.tsx (Server Component,
    flex-Container mit Sidebar + main, min-h-screen bg[#07070d])
  * src/app/dashboard/settings/SettingsSidebar.tsx (Client
    Component mit useState für Mobile-Open + usePathname für
    Active-State, responsive fixed→static via sm:-Klassen)
  * src/app/dashboard/settings/page.tsx (Server Component,
    Settings-Übersicht mit 2 aktiven + 4 Coming-Soon-Cards)
- 1 modifiziertes File:
  * src/app/dashboard/page.tsx — neuer "Einstellungen"-Tab
    in der Haupt-Nav nach "Clients". Active-State bleibt
    statisch false, Kommentar erklärt warum dynamischer Check
    hier immer false wäre (Tab-Bar ist auf dashboard/page.tsx
    scoped, nicht auf einem geteilten Dashboard-Layout)
- Existing settings/widget/page.tsx und settings/prompt/page.tsx
  bleiben unverändert. Ihre eigenen min-h-screen-Wrapper werden
  durch das neue Layout doppelt gesetzt, aber visuell harmlos
  (gleiche Farbe, gleiche Semantik). Refactor ist Phase-7-Scope
- Tailwind sm:-Breakpoint (640px) für Mobile/Desktop-Switch,
  nicht md: — per User-Briefing "Mobile <640px"
- Build grün, neue Route /dashboard/settings (Static, 175 B)
  erscheint im Route-Manifest
- **Browser-Verifikation am 2026-04-12 durch Project Owner:**
  alle 12 Smoke-Test-Schritte grün
- 4 Polish-Fixes aus Browser-Beobachtung (Commits 4cc1db0 +
  94bf6d6):
  * Toggle-Handle sichtbar (weiß) + symmetrische Position
    (translate-x-[22px])
  * Embed-Code Overflow-Fix (pr-20 + scrollbar-hide für
    Phantom-Scrollbar aus globals.css)
  * Responsive Copy-Button für Mobile (full-width unter
    Snippet statt absolute-overlay)
- Tech-Debt: Webpack-Chunk-Mismatch-Pattern dokumentiert
  (siehe docs/tech-debt.md)

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

**Post-Phase-7 — Pilot-Kunden-Onboarding**
- Erstes Pilot-Kunden-Deployment auf Vercel Production
- WhatsApp-Regression-Test nach Meta Business Verification (extern blockiert)
- Monitoring + Feedback-Loop mit Pilot-Kunden
- Tech-Debt-Abbau nach Prioritaet (siehe docs/tech-debt.md)

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
