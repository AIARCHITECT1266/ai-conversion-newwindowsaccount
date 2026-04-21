# PRE-PILOT AUDIT REPORT

**Datum:** 2026-04-21  
**Commit:** db94724  
**Auditor:** Claude Code  

---

## EXECUTIVE SUMMARY

- **Gesamt-Findings:** 22
- **Kritisch (Pilot-Blocker):** 0
- **Hoch (vor erstem Kunden fixen):** 3
- **Mittel (innerhalb erster Woche):** 7
- **Niedrig (Tech-Debt-Backlog):** 12

**Pilot-Launch-Empfehlung: GELB** — Kein Pilot-Blocker gefunden,
aber 3 High-Severity-Findings sollten vor dem ersten zahlenden
Kunden adressiert werden (Gesamtaufwand ~3-4h). System ist
funktional bereit, Security-Baseline ist solide.

---

## FINDINGS NACH KATEGORIE

### KATEGORIE 1: Security — Auth & Session

**Finding 1.1:** Dashboard-Token 30 Tage ohne Rotation  
- Schweregrad: Mittel
- Pilot-Blocker: Nein
- Fundstelle: src/app/dashboard/login/route.ts:67
- Beschreibung: `maxAge: 60 * 60 * 24 * 30` (30 Tage). Token wird
  bei Login einmal gesetzt und nie rotiert. Bei Token-Kompromittierung
  hat Angreifer 30 Tage Zugang.
- Empfehlung: Token-Rotation nach jedem Login (neuer Token → alter
  invalidiert). Alternativ maxAge auf 7 Tage reduzieren.
- Aufwand: 30 Min

**Finding 1.2:** Keine CSRF-Protection auf State-Changing-Endpoints  
- Schweregrad: Niedrig
- Pilot-Blocker: Nein
- Fundstelle: Alle POST/PATCH/DELETE Routes
- Beschreibung: Kein CSRF-Token-Pattern implementiert. Risiko ist
  gemindert durch SameSite=Strict auf Cookies und JSON-Body-Validierung
  (Browser senden keine JSON-Requests bei CSRF). Restrisiko minimal.
- Empfehlung: Akzeptabel fuer Pilot. SameSite=Strict + JSON-Only
  ist branchenueblicher Schutz fuer SPAs.
- Aufwand: Kein Fix noetig

**Finding 1.3:** Admin-Login Rate-Limit nur 5/Min  
- Schweregrad: Niedrig
- Pilot-Blocker: Nein
- Fundstelle: src/app/api/admin/login/route.ts:10
- Beschreibung: `max: 5, windowMs: 60_000`. Angemessen fuer
  Brute-Force-Schutz. Kein Finding, nur Dokumentation.
- Empfehlung: Keine Aenderung noetig.
- Aufwand: 0

**Finding 1.4:** Logout invalidiert Token korrekt  
- Schweregrad: Info (positiv)
- Fundstelle: src/app/api/admin/logout/route.ts, src/app/dashboard/logout/route.ts
- Beschreibung: Cookie wird mit `maxAge: 0` geloescht. Dashboard-
  Logout setzt neuen Random-Token in DB → alter Token ungueltig.
  Korrekt implementiert.

### KATEGORIE 2: Security — Tenant-Isolation

**Finding 2.1:** Admin-Routes haben korrekterweise KEINEN Tenant-Scope  
- Schweregrad: Info (korrekt)
- Fundstelle: src/app/api/admin/tenants/route.ts
- Beschreibung: Admin-Endpoints (tenant CRUD, stats) operieren
  Cross-Tenant — das ist korrekt, da Admin-Auth einen separaten,
  globalen Zugang darstellt (ADMIN_SECRET).

**Finding 2.2:** Cron-Cleanup operiert Cross-Tenant — korrekt  
- Schweregrad: Info (korrekt)
- Fundstelle: src/app/api/cron/cleanup/route.ts
- Beschreibung: Iteriert ueber alle Tenants und loescht abgelaufene
  Daten. Geschuetzt via CRON_SECRET. Korrekt.

**Finding 2.3:** Dashboard-Routes alle Tenant-scoped  
- Schweregrad: Info (korrekt)
- Fundstelle: Alle src/app/api/dashboard/* Routes
- Beschreibung: Alle Dashboard-Routes nutzen `getDashboardTenant()`
  als ersten Call, der den Tenant aus dem Cookie-Token extrahiert.
  Alle DB-Queries filtern anschliessend nach `tenant.id`. Kein
  Cross-Tenant-Leak gefunden.

**Finding 2.4:** Widget-Config resolved nur per Public Key  
- Schweregrad: Info (korrekt)
- Fundstelle: src/app/api/widget/config/route.ts
- Beschreibung: Widget-Endpoint resolved Tenant nur ueber
  `webWidgetPublicKey` (nicht ueber ID). Gibt nur nicht-sensitive
  Config-Felder zurueck. Kein Tenant-ID-Leak.

**Finding 2.5:** CampaignTemplate + Broadcast ohne FK-Constraint  
- Schweregrad: Mittel
- Pilot-Blocker: Nein
- Fundstelle: prisma/schema.prisma (CampaignTemplate.tenantId,
  Broadcast.tenantId)
- Beschreibung: Bereits in docs/tech-debt.md dokumentiert. Beide
  Models haben tenantId als String OHNE @relation. Kein FK-Cascade
  bei Tenant-Delete → verwaiste Records. Aktuell kein Risiko (kein
  Tenant-Delete geplant), aber strukturelle Luecke.
- Empfehlung: FK-Constraint hinzufuegen. Aufwand: 30-45 Min
  (Schema-Migration).
- Aufwand: 45 Min

### KATEGORIE 3: Security — Input-Validation & Injection

**Finding 3.1:** 25 API-Routes ohne Zod-Validation  
- Schweregrad: Hoch
- Pilot-Blocker: Nein (aber fixen vor erstem Kunden)
- Fundstellen: Siehe Liste unten
- Beschreibung: 25 von ~50 Routes haben keine Zod-Validation.
  Die meisten sind GET-Endpoints oder Admin-Routes (hinter Auth),
  aber einige POST-Routes fehlen (z.B. asset-studio/generate,
  clients/[id]/docs). Prisma validiert Typen, aber keine
  Laengen-Limits oder Format-Checks.
- Betroffene POST-Routes ohne Zod:
  - src/app/api/admin/login/route.ts (Login-Body unvalidiert)
  - src/app/api/asset-studio/edit/route.ts
  - src/app/api/asset-studio/generate/route.ts
  - src/app/api/dashboard/clients/[id]/docs/route.ts
  - src/app/api/dashboard/leads/[id]/predict/route.ts
  - src/app/api/dashboard/leads/[id]/summary/route.ts
- Empfehlung: Zod-Schemas fuer alle POST-Routes mit externem Input.
  GET-Only-Routes und Cron-Routes sind niedrige Prioritaet.
- Aufwand: 2-3h (fuer die 6 kritischen POST-Routes)

**Finding 3.2:** Keine Raw-SQL-Queries  
- Schweregrad: Info (positiv)
- Beschreibung: Kein `$queryRaw` oder `$executeRaw` im App-Code
  (nur in generierten Prisma-Typen). SQL-Injection via Prisma
  praktisch ausgeschlossen.

**Finding 3.3:** dangerouslySetInnerHTML auf Legal-Pages  
- Schweregrad: Niedrig
- Pilot-Blocker: Nein
- Fundstelle: src/app/agb/page.tsx, datenschutz/page.tsx,
  impressum/page.tsx, widerrufsbelehrung/page.tsx
- Beschreibung: Alle 5 Stellen rendern Markdown aus lokalen Dateien
  (content/legal/*.md) via remark. Source ist trusted (keine
  User-Eingabe). Kein XSS-Risiko.
- Empfehlung: Kein Fix noetig.

**Finding 3.4:** Kein File-Upload-Endpoint  
- Schweregrad: Info
- Beschreibung: Kein FormData/Multipart-Upload im gesamten Codebase.
  Kein Upload-Risiko.

### KATEGORIE 4: Security — Secrets & Credentials

**Finding 4.1:** Console-Logs erwaehnen "Token" aber loggen keine Werte  
- Schweregrad: Niedrig
- Pilot-Blocker: Nein
- Fundstelle: src/app/api/admin/tenants/[id]/route.ts:293
- Beschreibung: `console.log("[Admin] Dashboard-Token regeneriert",
  { tenantId: tenant.id })` — loggt nur die Tenant-ID, NICHT den
  Token-Wert. Korrektes Pattern. Alle anderen Fundstellen analog
  (loggen Konfigurationsstatus, nicht Werte).
- Empfehlung: Kein Fix noetig.

**Finding 4.2:** NEXT_PUBLIC_ Variablen sind nicht-sensitiv  
- Schweregrad: Info (korrekt)
- Beschreibung: Nur NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_CALENDLY_URL, NEXT_PUBLIC_MARKETING_WIDGET_KEY —
  alle per Design oeffentlich. Keine API-Keys als NEXT_PUBLIC_.

**Finding 4.3:** Keine Secrets in Codebase committed  
- Schweregrad: Info (korrekt)
- Beschreibung: .env.local in .gitignore. Kein Env-File committed.
  Credentials nur in Vercel Environment Variables (Production-Scope).

### KATEGORIE 5: Bugs & Edge-Cases

**Finding 5.1:** findMany ohne take-Limit in vielen Dashboard-Routes  
- Schweregrad: Hoch
- Pilot-Blocker: Nein (aber fixen bei Skalierung)
- Fundstellen: 15 findMany-Calls ohne take (broadcasts, campaigns,
  templates, clients, abTests, leads in stats, cron-cleanup)
- Beschreibung: Bei wachsender Datenmenge koennen diese Queries
  OOM verursachen. Fuer den ersten Pilot (1 Tenant, <1000 Records)
  unkritisch, aber bei 5+ Tenants mit jeweils 500+ Leads problematisch.
- Empfehlung: take: 100 (oder sinnvolle Grenze) + Pagination.
  Dashboard-Endpoints zuerst (User-facing), Cron-Cleanup spaeter.
- Aufwand: 2h

**Finding 5.2:** Cleanup-Cron findMany statt deleteMany (bekannt)  
- Schweregrad: Niedrig
- Pilot-Blocker: Nein
- Fundstelle: src/app/api/cron/cleanup/route.ts:62
- Beschreibung: Bereits in docs/tech-debt.md dokumentiert. Holt
  alle leeren Conversations in den Speicher statt batch-delete.
  Performance-Problem erst bei >10.000 Records.
- Empfehlung: Bereits geplant. Niedrige Prioritaet.
- Aufwand: 30 Min

**Finding 5.3:** Widget Cache-Invalidierung fehlt  
- Schweregrad: Niedrig
- Pilot-Blocker: Nein
- Fundstelle: src/lib/widget/publicKey.ts:78 (TODO-Kommentar)
- Beschreibung: Widget-Config wird 60s in-memory gecacht. Nach
  Dashboard-Update dauert es bis zu 60s bis Aenderungen sichtbar
  sind. Bereits in tech-debt.md dokumentiert.
- Empfehlung: Akzeptabel fuer Pilot.
- Aufwand: 0 (akzeptiert)

### KATEGORIE 6: Performance & Skalierung

**Finding 6.1:** Claude-Antworten nicht gestreamt  
- Schweregrad: Mittel
- Pilot-Blocker: Nein
- Fundstelle: src/lib/bot/processMessage.ts
- Beschreibung: Bot wartet auf vollstaendige Claude-Antwort
  (messages.create, nicht stream). Bei langen Antworten (>3s)
  sieht der Widget-User den Typing-Indicator, erhaelt aber erst
  bei Poll die komplette Antwort. UX-Optimierung, kein Bug.
- Empfehlung: Streaming in v1.1 (erfordert SSE/WebSocket-Upgrade
  des Polling-Systems). Aktuell akzeptabel.
- Aufwand: 8-16h (groesseres Refactoring)

**Finding 6.2:** Prisma-Schema hat gute Index-Abdeckung  
- Schweregrad: Info (positiv)
- Beschreibung: Composite Indexes auf [tenantId, status],
  [tenantId, channel], [tenantId, createdAt] fuer Conversations.
  [conversationId, timestamp] fuer Messages. Abdeckung ist gut
  fuer die haeufigsten Queries.

**Finding 6.3:** widget.js ist 12.9 KB (unkomprimiert)  
- Schweregrad: Info
- Beschreibung: Vanilla-JS, kein Build-Step. Wird als static file
  von Vercel CDN mit Brotli/Gzip geliefert (~4-5 KB komprimiert).
  Akzeptabel.

### KATEGORIE 7: Code-Qualitaet & Wartbarkeit

**Finding 7.1:** Null TypeScript `any`-Types  
- Schweregrad: Info (positiv)
- Beschreibung: Kein einziger `: any` oder `as any` im gesamten
  App-Code (ausserhalb generated/). Excellent.

**Finding 7.2:** 10 verwaiste Komponenten  
- Schweregrad: Niedrig
- Pilot-Blocker: Nein
- Fundstellen: src/components/Footer.tsx, HeroSection.tsx,
  HowItWorks.tsx, PilotSection.tsx, FloatingChat.tsx, NeuralGrid.tsx,
  LogoCloud.tsx, CalendarSection.tsx, ProblemSolution.tsx, Features.tsx
- Beschreibung: Alte Pre-Relaunch-Komponenten. Werden nirgends
  importiert. Enthalten teilweise mailto-Links und alte Preise.
  Kein Runtime-Impact, aber Repo-Bloat.
- Empfehlung: Loeschen in Cleanup-Session. 5 Min.
- Aufwand: 5 Min

**Finding 7.3:** Nur 1 TODO im gesamten Codebase  
- Schweregrad: Info (positiv)
- Fundstelle: src/lib/widget/publicKey.ts:78
- Beschreibung: Einziger TODO-Kommentar. Saubere Codebase.

**Finding 7.4:** Keine automatisierten Tests  
- Schweregrad: Hoch
- Pilot-Blocker: Nein
- Beschreibung: Vitest ist eingerichtet, aber 0 Tests existieren.
  Kritische Flows (processMessage, Auth, Tenant-Isolation) haben
  keinen Test-Coverage. Bereits in docs/test-debt.md dokumentiert.
- Empfehlung: Mindestens 5 Smoke-Tests fuer kritische Paths
  (processMessage, getDashboardTenant, widget-session, widget-poll,
  tenant-isolation).
- Aufwand: 4-6h

### KATEGORIE 8: Produkt-Integritaet (Pilot-Readiness)

**Finding 8.1:** Bot-Flow End-to-End funktioniert  
- Schweregrad: Info (positiv)
- Beschreibung: Web-Widget → Chat → processMessage → Claude → 
  Lead-Scoring (GPT-4o) → Lead-Notification (Resend) → Dashboard.
  Vollstaendig implementiert und in Phase 6.4 E2E-verifiziert.

**Finding 8.2:** Tenant-Onboarding ist manuell (bewusst)  
- Schweregrad: Info
- Beschreibung: Neuer Tenant wird via Admin-UI angelegt (Name,
  Slug, WhatsApp-ID, Plan). Dashboard-Token wird automatisch
  generiert. Magic-Link wird per Resend verschickt. Flow
  funktioniert, ist aber manuell. Dokumentiert in TD-Admin-01.

**Finding 8.3:** Widget-Embedding dokumentiert  
- Schweregrad: Info (positiv)
- Fundstelle: docs/integration-guide.md + Dashboard Settings Page
- Beschreibung: Copy-Paste-Code im Dashboard Widget-Settings
  (HTML/WordPress/Shopify/GTM Tabs). Integration-Guide mit
  CSP-Anleitungen vorhanden.

**Finding 8.4:** Lead-Notification funktioniert  
- Schweregrad: Info (positiv)
- Fundstelle: src/modules/crm/lead-notification.ts
- Beschreibung: Bei Lead-Score > 70 wird automatisch E-Mail via
  Resend gesendet. Graceful Fallback wenn RESEND_API_KEY fehlt.

**Finding 8.5:** DSGVO-Loeschantrag-Flow fehlt  
- Schweregrad: Mittel
- Pilot-Blocker: Nein (manuell loesbar)
- Beschreibung: Kein Self-Service-DSGVO-Loeschantrag-Button fuer
  Endbesucher. Aktuell muss Philipp per Admin-UI / DB manuell
  loeschen. Chat-Widget-Consent-Text verweist auf E-Mail
  (philipp@ai-conversion.ai).
- Empfehlung: Fuer Pilot akzeptabel (E-Mail → manuelle Loesung).
  Spaeter: Self-Service-Endpoint fuer Besucher.
- Aufwand: 2-3h (spaeter)

**Finding 8.6:** Retention-Cron laeuft  
- Schweregrad: Info (positiv)
- Fundstelle: src/app/api/cron/cleanup/route.ts
- Beschreibung: 90-Tage-Cleanup laeuft via CRON_SECRET-geschuetztem
  Endpoint. Loescht abgelaufene Messages, leere Conversations und
  verwaiste Leads. Korrekt implementiert.

**Finding 8.7:** Error-Fallback im Bot vorhanden  
- Schweregrad: Info (positiv)
- Fundstelle: src/lib/bot/processMessage.ts:53
- Beschreibung: Bei Claude-API-Fehler wird RETRY_FALLBACK_MESSAGE
  gesendet + in DB persistiert + auditLog. Besucher sieht eine
  freundliche Fehlermeldung statt Silence.

**Finding 8.8:** prompt/route.ts ohne auditLog  
- Schweregrad: Mittel
- Pilot-Blocker: Nein
- Fundstelle: src/app/api/dashboard/settings/prompt/route.ts
- Beschreibung: Bereits in docs/tech-debt.md dokumentiert.
  POST-Endpoint aendert System-Prompt ohne Audit-Log. Compliance-
  relevant wenn Pilot-Kunde Prompt aendert.
- Empfehlung: auditLog("dashboard.prompt_updated") ergaenzen.
- Aufwand: 10 Min

---

## PRIORISIERTE TODO-LISTE

### ROT (Pilot-Blocker, sofort fixen)

Keine.

### GELB (vor erstem Kunden fixen, <= 1 Woche)

1. **[3.1]** Zod-Validation fuer 6 kritische POST-Routes — 2-3h
2. **[5.1]** findMany take-Limits fuer Dashboard-Endpoints — 2h
3. **[7.4]** Mindestens 5 Smoke-Tests fuer kritische Paths — 4-6h

### GRUEN (Tech-Debt, wenn Zeit)

1. **[1.1]** Dashboard-Token maxAge auf 7d reduzieren — 10 Min
2. **[2.5]** FK-Constraints CampaignTemplate + Broadcast — 45 Min
3. **[5.2]** Cleanup-Cron auf batch-delete umstellen — 30 Min
4. **[7.2]** 10 verwaiste Komponenten loeschen — 5 Min
5. **[8.5]** DSGVO-Loeschantrag-Self-Service — 2-3h
6. **[8.8]** auditLog fuer Prompt-Update — 10 Min
7. **[6.1]** Claude-Streaming (v1.1) — 8-16h

## QUICK-WINS

Findings, die in unter 30 Min fixbar sind:

1. **[8.8]** auditLog in prompt/route.ts ergaenzen — 10 Min
2. **[1.1]** Dashboard-Token maxAge 30d → 7d — 10 Min
3. **[7.2]** 10 tote Komponenten loeschen — 5 Min

Gesamt: 25 Min fuer 3 Verbesserungen.

## POSITIVE ERKENNTNISSE

1. **Null any-Types** — strenge TypeScript-Nutzung, kein einziger `: any`
2. **Tenant-Isolation ist solide** — alle Dashboard-Routes Tenant-scoped via getDashboardTenant(), Middleware schuetzt Admin + Dashboard Pfade
3. **Cookie-Security korrekt** — httpOnly, Secure (prod), SameSite=Strict auf allen Cookies
4. **Kein Secret-Leak** — keine Credentials in Logs, .env korrekt gitignored, NEXT_PUBLIC_ nur fuer oeffentliche Werte
5. **Bot-Fallback robust** — bei Claude-Fehler: persistierte Fallback-Message + Audit-Log
6. **CSP Nonce-basiert** — strict-dynamic mit Per-Request-Nonce, frame-ancestors korrekt konfiguriert
7. **Gute Index-Abdeckung** — Prisma-Schema hat Composite Indexes fuer haeufige Queries
8. **DSGVO-Cleanup funktioniert** — 90-Tage-Retention mit Cron, Consent-Tracking, AES-256-GCM-Verschluesselung

## EMPFOHLENE FIX-REIHENFOLGE

1. **Quick-Wins** (25 Min): auditLog + Token-maxAge + tote Komponenten
2. **Zod-Validation** (2-3h): 6 POST-Routes absichern
3. **Pagination** (2h): findMany take-Limits
4. **Smoke-Tests** (4-6h): 5 kritische Flows testen

Begruendung: Quick-Wins zuerst (sofortiger Wert, geringes Risiko),
dann Zod (Input-Validation ist Security-relevant), dann Pagination
(Performance-Safety), dann Tests (langfristige Stabilitaet).

## OFFENE FRAGEN AN PHILIPP

1. **Dashboard-Token 30 Tage:** Bewusste Entscheidung oder Versehen?
   Fuer Pilot-Kunden, die selten einloggen, sind 30 Tage
   bequem — aber auch ein laengeres Angriffsfenster.
2. **Wann erster Pilot-Kunde erwartet?** Falls >1 Woche: alle
   GELB-Items vorher fixen. Falls diese Woche: Quick-Wins + Zod
   reichen.
3. **Smoke-Tests Prioritaet:** Sollen die vor oder nach dem
   ersten Kunden geschrieben werden?
