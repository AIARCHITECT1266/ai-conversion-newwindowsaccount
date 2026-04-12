# Phase 7 — Testing & Hardening: Pre-Analyse + Plan

**Datum:** 2026-04-12
**Basis-Commit:** 74323de (Phase 6.5 abgeschlossen)
**Status:** Freigegeben — Pre-Analyse abgeschlossen, bereit fuer Test-Szenario-Durchlauf

---

## 1. Test-Szenarien: Gruppierung nach Testbarkeit

### Gruppe A — Sofort testbar (lokaler Dev-Server, 1 Tenant)

| # | Szenario | Was genau testen | Voraussetzung |
|---|----------|-----------------|---------------|
| 1 | **Happy Path** | Besucher -> Widget oeffnen -> Qualifizierung -> Lead landet im CRM mit Channel WEB | Dev-Server + widget-demo.html + internal-admin auf growth_monthly |
| 6 | **DSGVO** | Consent-Modal erscheint vor erster Nachricht, consentGiven=true + consentAt-Timestamp in DB | Gleich wie #1 |
| 7 | **Widget deaktiviert** | webWidgetEnabled=false -> /api/widget/config liefert 404/Fehler, Widget-Bubble laedt nicht | DB-Update auf webWidgetEnabled=false |
| 8 | **Graceful Degradation** | API-Fehler (z.B. ungueltige Session-Token, Rate-Limit-Treffer) -> sinnvolle Fehlermeldung im Widget, kein stummes Brechen | Gezielt fehlerhafte Requests senden |
| 10 | **Plan-Gating** | Starter-Account -> Widget-Settings zeigt Upgrade-Prompt, Aktivierung ueber API gibt 403 | paddlePlan zurueck auf null/starter setzen |
| 4 | **Rate-Limit** | Session-Creation >10x/h/IP -> 429, Message >60x/h -> 429, Poll >1/s -> 429 | Schnelle Wiederholungs-Requests (curl-Loop) |

**6 von 10 Szenarien sind sofort testbar.**

### Gruppe B — Braucht Setup (machbar, aber Vorbereitung noetig)

| # | Szenario | Was genau testen | Setup-Bedarf |
|---|----------|-----------------|-------------|
| 2 | **Cross-Origin** | Widget auf localhost:3001 kommuniziert mit Backend auf localhost:3000 | Zweiten HTTP-Server starten (z.B. `npx serve` auf Port 3001 mit einer HTML-Seite die das Widget einbettet). Ca. 5 Minuten Setup |
| 3 | **Tenant-Isolation** | Public Key von Tenant A schreibt unter keinen Umstaenden in Daten von Tenant B | Test-Tenant B angelegt (siehe Owner-Entscheidungen). Setup: zwei Demo-HTML-Files mit je einem Public Key |
| 5 | **Mobile** | Widget funktioniert auf iPhone Safari, Android Chrome | Entweder: (a) ngrok/localtunnel fuer externen Zugriff auf Dev-Server, oder (b) Vercel Preview Deployment. Ca. 15-20 Minuten Setup |

**3 Szenarien brauchen Setup, sind aber innerhalb einer Session machbar.**

### Gruppe C — Blockiert

| # | Szenario | Was genau testen | Blocker |
|---|----------|-----------------|---------|
| 9 | **WhatsApp-Regression** | Bestehender WhatsApp-Flow komplett unveraendert funktional | Blockiert durch fehlende Meta Business Verification (US-LLC-Gruendung laeuft, 2-4 Wochen). Kein Workaround moeglich — echter WhatsApp-Nachrichtenversand an echte Nummer noetig |

**1 Szenario ist extern blockiert.** Risiko-Mitigation: processMessage
ist seit Phase 1 kanal-agnostisch — jeder erfolgreiche Web-Widget-Test
bestaetigt implizit die Bot-Logik. Der WhatsApp-spezifische Teil
(Webhook-Handler, Message-Format-Parsing) bleibt ungetestet.

---

## 2. Sicherheits-Checkliste: Status-Tabelle

Cross-Check jedes Spec-Punkts aus WEB_WIDGET_INTEGRATION.md
"Sicherheits-Checkliste (Pflicht vor Go-Live)" gegen den
aktuellen Code-Stand.

| # | Checklisten-Punkt | Status | Code-Referenz | Gap |
|---|-------------------|--------|--------------|-----|
| 1 | Public Key gibt NUR nicht-sensitive Daten frei | **PASS** | config/route.ts:117-135 — liefert nur 11 Display-Felder (Farben, Logo, botName, welcomeMessage etc.) | Keins |
| 2 | Session-Token serverseitig validiert gegen DB | **PASS** | sessionToken.ts:53-71 — findUnique + channel=WEB + !CLOSED + 24h TTL | Keins |
| 3 | IP-basiertes Rate-Limit auf Session-Creation (10/IP/h) | **PASS** | session/route.ts:78-85 — max:10, windowMs:3600000, Key: widget-session:{ip} | Keins |
| 4 | Message-Rate-Limit pro Session (60/h) | **PASS** | message/route.ts:97-102 — max:60, Key: widget-message:{hashedToken} | Keins |
| 5 | Poll-Rate-Limit (1/Sekunde/Session) | **PASS** | poll/route.ts:101-106 — max:3600, windowMs:3600000 = 1/s | Keins |
| 6 | Config-Rate-Limit (100/IP/h) | **PASS** | config/route.ts:69-71 — max:100, Key: widget-config:{ip} | Keins |
| 7 | Eingehende Messages verschluesselt via encryptText() | **PASS** | processMessage.ts:389→saveMessage:132-145 — encryptText(content) vor DB-Insert | Keins |
| 8 | Audit-Log fuer alle Widget-Aktionen mit IP-Hash | **PARTIAL** | config:110, session:153, message:152 — alle mit hashIp(). Poll: bewusst KEIN auditLog (Performance, ADR phase-3b-spec-reconciliation.md Drift 2) | Spec sagt "alle", Poll hat keins. Bereits per ADR entschieden — akzeptierter Drift |
| 9 | CORS explizit gesetzt, nicht * fuer sensitive Endpoints | **PASS (akzeptiert per ADR)** | Alle 4 Endpoints: Access-Control-Allow-Origin: * (config:27, session:33, message:32, poll:29). Widget-Endpoints sind public-facing by design — ADR: docs/decisions/phase-7-cors-public-widget-endpoints.md | Keins (per ADR geschlossen) |
| 10 | iframe sandbox="allow-scripts allow-same-origin allow-forms" | **PASS** | public/widget.js:245 — exakt diese 3 Attribute | Keins |
| 11 | CSP des iframe-Inhalts erlaubt nur eigene Domain | **PASS** | middleware.ts:44,73 — frame-ancestors * fuer Widget-Routen (noetig fuer Cross-Origin-Embedding), script-src mit Nonce + strict-dynamic | Keins |
| 12 | DSGVO-Disclaimer vor erster Nachricht, Timestamp | **PASS** | ChatClient.tsx:154-199 (Consent-Modal) + session/route.ts:145-146 (consentGiven + consentAt in DB) | Keins |
| 13 | IP-Adressen gehashed, nicht im Klartext | **PASS** | hashIp() mit SHA-256 in allen 4 Route-Dateien + sessionToken.ts:41-43 hashTokenForRateLimit | Keins |
| 14 | Keine Secrets im Embed-Script | **PASS** | public/widget.js — nur data-key Attribut (Public Key), keine API-Keys/Tokens | Keins |
| 15 | Rate-Limit Web STRENGER als WhatsApp | **PASS** | Web Session: 10/h/IP vs. WhatsApp Webhook: 100/min/IP (=6000/h). Web ist 600x strenger | Keins |
| 16 | Zod-Validierung auf allen Endpoints | **PASS** | session:48-59, message:47-54, config:44-48, poll:44-55 — alle mit safeParse | Keins |
| 17 | Tenant-Isolation via Composite Keys | **PASS** | Session-Token -> Conversation (unique widgetSessionToken) -> tenantId. Alle Queries ueber conversationId das tenantId traegt | Keins |

### Ergebnis: 16 PASS (inkl. 1 per ADR geschlossen), 1 PARTIAL (akzeptiert per ADR)

---

### CORS-Entscheidung (ehemals Gap)

**Entscheidung:** Option A — akzeptiert per ADR.
Widget-Endpoints sind public-facing by design, CORS * ist
architekturbedingt korrekt. Absicherung via Rate-Limit +
Session-Token, nicht CORS. ADR:
`docs/decisions/phase-7-cors-public-widget-endpoints.md`

---

## 3. Build-Check: widget-embed/ existiert nicht

Die Spec (WEB_WIDGET_INTEGRATION.md Phase 7) verlangt:
```bash
npx next build
cd widget-embed && npm run build
```

**Ist-Zustand:** Das Verzeichnis `widget-embed/` existiert nicht.
Das Embed-Script (`public/widget.js`) wurde in Phase 5 als
**Vanilla-JS-Datei** direkt in `public/` geschrieben — kein
separater Build-Schritt, kein NPM-Projekt.

**Konsequenz:** Der zweite Build-Check (`cd widget-embed && npm
run build`) ist gegenstandslos. Die Spec-Referenz ist ein
Relikt aus einem frueheren Architektur-Entwurf, der einen
separaten Build-Schritt vorsah.

**Entscheidung:** Vanilla-JS bleibt, ADR geschrieben:
`docs/decisions/phase-7-embed-script-vanilla-js.md`.
Build-Check fuer Phase 7 reduziert sich auf `npx next build`.

---

## 4. Integration-Guide: Struktur-Vorschlag

Basierend auf dem Tech-Debt-Eintrag (docs/tech-debt.md
"Phase 5 — Pilot-Kunden-Integration-Guide fehlt").

### Vorgeschlagene Datei: `docs/integration-guide.md`

**Sektion 1 — Quick Start (Copy-Paste)**
- Einfachstes Snippet: `<script src="..." data-key="pub_xxx" async></script>`
- Erwartetes Ergebnis: Floating Bubble unten rechts
- Screenshot oder ASCII-Diagramm des Ergebnisses

**Sektion 2 — CSP-Konfiguration (3 Varianten)**
- **Variante A — Keine CSP:** Snippet funktioniert sofort, keine Aenderung noetig
- **Variante B — CSP mit Allowlist:** Kunde muss `script-src https://ai-conversion.ai` + `connect-src https://ai-conversion.ai` + `frame-src https://ai-conversion.ai` in seine CSP eintragen
- **Variante C — CSP mit Nonce:** Snippet zeigt Nonce-Platzhalter, Kunde muss in seiner SSR-Pipeline den Nonce injizieren

**Sektion 3 — Plattform-spezifische Anleitungen**
- **Plain HTML:** Snippet direkt vor `</body>`
- **Next.js (App Router):** In `layout.tsx` als `<Script>` mit `strategy="afterInteractive"`
- **WordPress:** Im Theme-Footer oder via Plugin "Insert Headers and Footers"
- **Shopify:** In `theme.liquid` vor `</body>`
- **Google Tag Manager:** Custom HTML Tag mit Trigger "All Pages"
- **Rails (ERB):** In `application.html.erb` vor `</body>`

**Sektion 4 — Erforderliche Netzwerk-Freigaben**
- Tabelle: welche URLs, welche Richtung, welcher Zweck
  - `https://ai-conversion.ai/widget.js` — Script-Laden (script-src)
  - `https://ai-conversion.ai/api/widget/*` — API-Calls (connect-src)
  - `https://ai-conversion.ai/embed/widget` — iframe-Inhalt (frame-src)

**Sektion 5 — Troubleshooting**
- "Widget-Bubble erscheint nicht" -> CSP-Fehler in Browser-Console pruefen
- "Widget laedt aber zeigt keine Antworten" -> connect-src pruefen
- "Refused to frame..." -> frame-src pruefen
- "Widget funktioniert lokal aber nicht in Production" -> HTTPS-Pflicht, Mixed-Content-Check

**Sektion 6 — Erweiterte Konfiguration**
- data-key Attribut (Pflicht)
- Zukuenftige Attribute (data-position, data-language — noch nicht implementiert, als Coming Soon markieren)

### Aufwand-Schaetzung
Ca. 1.5-2 Stunden reine Doku-Arbeit. Kein Code-Change noetig.
Optional: Dashboard-Integration (Embed-Code-Generator zeigt
plattform-spezifische Snippets) — das waere ein separater
Feature-Scope.

---

## 5. Empfohlene Reihenfolge

| Schritt | Inhalt | Typ | Geschaetzter Aufwand | Status |
|---------|--------|-----|---------------------|--------|
| 7.1 | **Security-Checkliste abschliessen:** CORS-Gap-Entscheidung + ADR | Entscheidung + Doku | 30 Min | **ERLEDIGT** (ADR geschrieben) |
| 7.2 | **Test-Gruppe A durchlaufen** (6 Szenarien, sofort testbar) | Manueller Test | 1-1.5h | Offen |
| 7.3 | **Test-Gruppe B Setup + Durchlauf** (Cross-Origin, Tenant-Isolation, Mobile) | Setup + Test | 1.5-2h | Offen (Tenant B angelegt) |
| 7.4 | **Integration-Guide schreiben** (docs/integration-guide.md) | Doku | 1.5-2h | Offen |
| 7.5 | **Build-Check** (`npx next build`) | Verifikation | 15 Min | **ERLEDIGT** (gruen, 68 Seiten) |
| 7.6 | **Abschluss-Doku:** PROJECT_STATUS.md, ADR, Tech-Debt-Updates | Doku | 30 Min | Offen |

**Verbleibender Aufwand Phase 7:** ca. 4-5.5 Stunden (7.2 + 7.3 + 7.4 + 7.6)

**Szenario 9 (WhatsApp-Regression)** ist external-blocked durch
Meta Business Verification. Phase 7 wird mit 9/10 Szenarien
abgeschlossen. Szenario 9 als Post-LLC-Blocker in test-debt.md
gefuehrt.

---

## 6. Owner-Entscheidungen (2026-04-12)

Alle 5 offenen Fragen aus der Pre-Analyse wurden vom Project
Owner beantwortet.

### Entscheidung 1 — CORS: Option A (akzeptieren per ADR)
Widget-Endpoints sind public-facing by design. Absicherung via
Rate-Limit + Session-Token, nicht CORS.
**ADR:** `docs/decisions/phase-7-cors-public-widget-endpoints.md`

### Entscheidung 2 — Mobile-Test: DevTools + echtes Smartphone
Chrome DevTools Device-Toolbar fuer Szenario 5 in der Test-
Session. Echtes Smartphone (iPhone/Android) wird vom Project
Owner separat getestet.

### Entscheidung 3 — Zweiter Test-Tenant: angelegt via Seed-Script
`src/scripts/seed-test-tenant-b.ts` erstellt (idempotent).
- Tenant-ID: `cmnvnp51m0000q4ldnojo05dl`
- Slug: `test-b`
- Name: "Atelier Hoffmann (Test-Tenant B)"
- Public Key: `pub_2lxs3_H7wUPc0joC`
- Plan: `growth_monthly`
- System-Prompt: Moebel-Werkstatt-Szenario (bewusster Kontrast
  zu internal-admin fuer inhaltliche Isolation-Verifikation)

### Entscheidung 4 — widget-embed/: Vanilla-JS bleibt
Build-Pipeline war overengineered fuer 12.5-KB-Loader ohne
Dependencies. Build-Check reduziert sich auf `npx next build`.
**ADR:** `docs/decisions/phase-7-embed-script-vanilla-js.md`

### Entscheidung 5 — WhatsApp-Regression: external-blocked
Phase 7 wird mit 9/10 Szenarien abgeschlossen. Szenario 9
(WhatsApp-Regression) ist durch fehlende Meta Business
Verification blockiert (US-LLC-Gruendung laeuft, 2-4 Wochen).
Wird als Post-LLC-Blocker in `docs/test-debt.md` gefuehrt.
Phase-1-Verifikation via Code-Review + kanal-agnostische
processMessage-Pipeline (jeder Web-Widget-Test bestaetigt
implizit die Bot-Logik).

---

## 7. Tenant-Isolation-Test-Setup (Szenario 3)

### Zwei Tenants

| | Tenant A | Tenant B |
|---|----------|----------|
| Slug | internal-admin | test-b |
| Public Key | (aus Widget-Settings-Page oder dashboard-links.txt) | pub_2lxs3_H7wUPc0joC |
| System-Prompt | AI Conversion Plattform (Lead-Qualifizierung) | Moebel-Werkstatt Atelier Hoffmann |
| Plan | growth_monthly | growth_monthly |

### Test-Ablauf

1. Zwei Demo-HTML-Dateien erstellen (oder widget-demo.html
   kopieren), jeweils mit einem anderen `data-key`
2. Parallele Konversationen starten — je eine pro Tenant
3. Verifizieren:
   - Tenant A sieht NUR seine Conversations im Dashboard
   - Tenant B sieht NUR seine Conversations im Dashboard
   - Bot antwortet mit dem jeweiligen System-Prompt-Kontext
     (AI Conversion vs. Moebel-Werkstatt)
   - Messages in DB haben getrennte conversationIds mit
     getrennten tenantIds
   - Cross-Key-Test: Session mit Key A starten, dann
     Message mit Token aus Session B senden -> muss 401/403
     liefern

---

## 8. Build-Transient-Bug (2026-04-12)

**Beobachtet:** Beim ersten `npx next build` warfen zwei
pre-existing Routes ("Cannot find module for page"):
- `/api/cron/followup`
- `/api/dashboard/broadcasts`

**Root-Cause:** `.next/`-Cache-Korruption analog zum
Webpack-Chunk-Mismatch-Pattern aus `docs/tech-debt.md`
(Sub-Phase 6.5 Eintrag). Die Route-Dateien existieren,
alle Imports zeigen auf existierende Module, alle Prisma-
Modelle sind im Schema vorhanden.

**Loesung:** Zweiter Build-Lauf mit frischem `.next/`-Cache
lief fehlerfrei durch (68 Seiten, alle Routes im Manifest).

**Keine Code-Aenderung, kein neuer Tech-Debt-Eintrag.**
Der existierende Eintrag "Webpack-Chunk-Mismatch nach
Dashboard-Page-Fixes (Next.js 15.5.14)" deckt diese
Fehlerklasse ab.
