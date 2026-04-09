WEB_WIDGET_INTEGRATION.md

## Zielsetzung
Erweiterung der bestehenden AI Conversion Plattform um einen zweiten Kanal: ein einbettbares Web-Widget, das Besucher auf Kundenwebseiten qualifiziert und exakt denselben Lead-Flow wie der WhatsApp-Kanal nutzt.

**Kernprinzip (nicht verhandelbar):** Das Web-Widget ist ein KANAL, kein zweites Produkt.
- Dieselbe Bot-Logik (`/src/modules/bot/` + `processMessage`)
- Dasselbe CRM, Lead-Scoring, Template-Engine und Platzhalter
- Dieselbe Tenant-Isolation, Audit-Logging, Verschlüsselung (AES-256-GCM)
- Dieselbe Plan-Feature-Gating (`checkLimit` aus `@/lib/plan-limits`)
- Dieselbe DSGVO-Compliance (Cleanup-Cron, DPA)

Neu gebaut wird nur: Transport, Session-Handling, Embed-Infrastruktur und Widget-UI.

---

## Code-Standards (gilt für ALLE Phasen)

Alle neuen Dateien müssen die bestehenden Patterns aus `CLAUDE.md` einhalten:

- **Zod-Validierung Pflicht** für alle POST/PATCH-Endpoints
  (`safeParse`, Schema vor Handler, Fehler: `{ error: "Ungültige Eingabe", details: result.error.flatten() }`)
- **Tenant-Isolation über Composite Keys**:
  `findFirst({ where: { id, tenantId } })` – niemals ID-only
- **Audit-Logging** via `auditLog()` aus `@/modules/compliance/audit-log` für alle mutierenden Aktionen,
  inklusive neuer AuditAction-Einträge zur Union-Type wo nötig
- **Verschlüsselung** via `encryptText()` / `decryptText()` aus `@/modules/encryption/aes`
  für alle Message-Inhalte, auch im Web-Kanal
- **TypeScript strict**, kein `any`
- **Kommentare auf Deutsch**
- **DSGVO**: keine personenbezogenen Daten loggen (nur Hashes)
- **Build-Check**: `npx next build` vor jedem Commit
- **Plan-Feature-Gating** via `checkLimit(tenantId, paddlePlan, resource)` vor mutierenden Aktionen
- **Prisma**: Singular-Modellnamen (`db.tenant`, `db.conversation`, `db.message`)

---

## Architektur-Entscheidungen (getroffen, nicht mehr diskutieren)

1. **Tenant-Identifier im Widget:** `webWidgetPublicKey` (Format: `pub_${nanoid(16)}`), NICHT Slug.
   Grund: Rotierbar, trennt öffentlichen Identifier von internem Admin-Namen, erlaubt später
   mehrere Keys pro Tenant.

2. **Polling-Strategie:** Simple Polling alle 2 Sekunden. NICHT Long-Polling in v1.0.
   Grund: Einfacher zu bauen, Vercel-Fluid-Compute-freundlich, Latenz akzeptabel für
   Widget-Use-Case. Long-Polling kann in v1.1 nachgerüstet werden, wenn Daten es rechtfertigen.

3. **`processMessage()` Return-Typ:** Objekt mit `responses`, `conversationStatus`, `error`.
   NICHT nur String. Grund: Widget-Frontend braucht Status-Information ohne zusätzlichen
   DB-Query nach jedem Call.

4. **iframe-Isolation:** Das Chat-UI läuft in einem iframe, das vom Embed-Script eingefügt wird.
   Grund: Vollständige CSS-Isolation von Host-Seite, Security-Boundary, einfachere CSP-Handhabung.

---

## Wichtiger Hinweis zum Public Key

**Der `webWidgetPublicKey` ist ÖFFENTLICH und MUSS im Embed-Script im Klartext stehen**
– genau dafür ist er gebaut. Jeder Besucher einer Kundenseite kann ihn im HTML-Quellcode sehen.
Das ist gewollt und sicher, solange folgende Regeln eingehalten werden:

- Der Public Key darf NIEMALS interne Tenant-IDs, API-Keys oder andere Secrets exponieren
- Der Config-Endpoint (`/api/widget/config`) darf über den Public Key NUR nicht-sensitive Daten
  zurückgeben: `primaryColor`, `logoUrl`, `welcomeMessage`
- Bei Leak oder Missbrauch eines Public Keys: rotierbar über Dashboard (neuer Key generieren,
  alter ungültig)
- Rate-Limiting am Config- und Session-Endpoint schützt vor Missbrauch eines geleakten Keys
- Interne `tenantId` bleibt serverseitig, taucht NIEMALS im Browser oder Embed-Script auf

---

## Pre-Analyse (VOR jeder Code-Änderung)

Bevor eine Datei angefasst wird, folgende vier Punkte analysieren und in
`ARCHITECTURE_REPORT.md` dokumentieren:

### 1. Bot-Handler-Abstraktion prüfen
- Lies `/src/modules/bot/system-prompts/` und `/src/lib/bot/`
- Identifiziere WhatsApp-spezifische Teile (Phone IDs, Message-Formate, Webhook-Payloads)
- Identifiziere ob System-Prompts WhatsApp-spezifische Formulierungen enthalten
- Plane Extraktion in kanal-agnostisches `processMessage()`

### 2. Schema-Prüfung
- Lies `/prisma/schema.prisma`
- Welche Felder in `Conversation` und `Message` sind WhatsApp-spezifisch?
- Kann `Conversation` sauber einen `channel`-Enum bekommen, ohne bestehende Queries zu brechen?
- Welche Queries im Dashboard gehen davon aus, dass jede Conversation eine Phone Number hat?

### 3. Rate-Limiting-Strategie
- Lies bestehenden Rate-Limit-Code (`/src/lib/rate-limit.ts` oder äquivalent)
- Wie wird WhatsApp heute limitiert?
- Wie wird das für anonyme Web-Besucher erweitert (IP-basiert, strenger)?
- Welche Limits gelten pro Session, pro IP, pro Tenant?

### 4. Tenant-Identifikation im Web-Kanal
- Aktuell: `db.tenant.findUnique({ where: { slug, isActive: true } })` im Test-Modus
- Ziel: Über neuen `webWidgetPublicKey` (Entscheidung siehe oben)
- Plane Daten-Migration: Public Key für alle bestehenden Tenants generieren

**STOPP nach Pre-Analyse.** `ARCHITECTURE_REPORT.md` schreiben, gemeinsame Freigabe abwarten,
DANN erst Phase 1. Keine Code-Änderungen bevor der Report vorliegt.

---

## Implementierungs-Phasen

### Phase 1: Architektur-Refactoring (Tag 1)

**Ziel:** Bot-Logik kanal-agnostisch, WhatsApp-Flow unverändert funktionsfähig.

Extrahiere `processMessage()` nach `/src/lib/bot/processMessage.ts`:

```typescript
export async function processMessage(input: {
  tenantId: string;
  channel: 'WHATSAPP' | 'WEB';
  conversationId: string;
  senderIdentifier: string; // WhatsApp: phoneHash, Web: sessionId (niemals IP)
  message: string;
}): Promise
```

Diese Funktion:
- Kennt keine HTTP-Details
- Kennt keine Phone Numbers (außer über `senderIdentifier` als opaque String)
- Ruft bestehende Bot-Logik auf, wiederverwendet Templates und Prompts
- Schreibt Lead-Updates und CRM-Changes als Side Effects
- Gibt strukturierte Antwort zurück für Widget-Frontend

Passe WhatsApp-Webhook so an, dass er `processMessage()` aufruft statt Bot-Logik direkt.

**Regression-Test Pflicht:** WhatsApp-Flow muss 100 % unverändert funktionieren.

**Done-Kriterium:**
- `npx next build` läuft fehlerfrei
- WhatsApp-Flow wurde manuell getestet, funktioniert unverändert
- Commit: `refactor(bot): extract channel-agnostic processMessage`

### Phase 2: Schema-Migration (Tag 1-2)

**Änderungen am `Tenant`-Model:**

```prisma
model Tenant {
  // ... bestehende Felder

  webWidgetEnabled    Boolean @default(false)
  webWidgetPublicKey  String? @unique
  webWidgetConfig     Json?   // { primaryColor, logoUrl, welcomeMessage }
}
```

**Änderungen am `Conversation`-Model:**

```prisma
model Conversation {
  // ... bestehende Felder
  channel Channel @default(WHATSAPP)

  @@index([tenantId, channel])
}

enum Channel {
  WHATSAPP
  WEB
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_web_widget_support
npx prisma generate
```

**Daten-Migration:**
Erstelle `/src/scripts/generate-widget-keys.ts` – generiert für alle bestehenden Tenants
ohne Public Key einen neuen `pub_${nanoid(16)}`.

**Done-Kriterium:**
- Migration läuft durch, `npx prisma generate` erfolgreich
- Alle bestehenden Tenants haben `webWidgetPublicKey`
- Bestehende Queries funktionieren unverändert
- Commit: `feat(db): add web widget schema support`

### Phase 3: Widget-API-Endpoints (Tag 2-4)

**Reihenfolge der Implementierung:**

#### 3.1 Public Key Lookup
`/src/lib/widget/publicKey.ts`

```typescript
export async function resolvePublicKey(publicKey: string): Promise
```

Cache das Ergebnis in-memory für 60 Sekunden, um DB-Load zu reduzieren.

#### 3.2 Config-Endpoint
`/src/app/api/widget/config/route.ts`

- `GET ?key=pub_xxx`
- Gibt NUR nicht-sensitive Tenant-Config zurück: `{ primaryColor, logoUrl, welcomeMessage }`
- CORS: `Access-Control-Allow-Origin: *` (öffentlicher Endpoint)
- Rate-Limit: 100 Requests/IP/Stunde

#### 3.3 Session-Endpoint
`/src/app/api/widget/session/route.ts`

- `POST {publicKey}` im Body
- Erstellt neue Conversation mit `channel: 'WEB'` und neuer Session-ID
- Gibt signiertes Session-Token zurück (JWT oder serverseitig gespeicherter Random-String)
- Rate-Limit STRENG: 10 Sessions/IP/Stunde
- **Hinweis:** Session-Token ist KEIN Auth-Token, identifiziert nur die Konversation

#### 3.4 Message-Endpoint
`/src/app/api/widget/message/route.ts`

- `POST {sessionToken, content}`
- Validiert Session-Token serverseitig gegen DB
- Ruft bestehendes `processMessage()` auf mit `channel: 'WEB'`
- Antwort wird NICHT synchron zurückgegeben, sondern asynchron via Polling
- Speichert Bot-Antwort in DB, sobald verfügbar
- Rate-Limit: 60 Messages/Session/Stunde

#### 3.5 Poll-Endpoint
`/src/app/api/widget/poll/route.ts`

- `GET ?token=xxx&since=timestamp`
- Validiert Session-Token
- Gibt neue Nachrichten seit `since` zurück
- Simple Polling (NICHT Long-Polling)
- Rate-Limit: 1 Request/Sekunde/Session

**Pflicht für ALLE Endpoints:**
- Zod-Schema mit `safeParse`
- `auditLog()` für alle Aktionen (mit IP-Hash, nicht Klartext-IP)
- Input-Validierung strenger als für WhatsApp (weil anonymer)
- TypeScript strict, keine `any`

**Done-Kriterium:**
- Alle Endpoints via curl testbar
- Zod-Schemas komplett
- Audit-Log-Einträge erscheinen bei jeder Aktion
- Rate-Limits greifen wie spezifiziert
- Commit: `feat(widget): add widget API endpoints`

### Phase 4: iframe-Chat-UI (Tag 4-6)

**Route:** `/src/app/widget/[publicKey]/page.tsx`

**Technik:**
- `'use client'`, reines React + Tailwind
- Keine externen UI-Libraries (kein shadcn – iframe muss minimal sein)
- Lädt beim Mount Config vom `/api/widget/config`-Endpoint
- Erstellt bei erster Interaktion (nicht beim Öffnen) Session via `/api/widget/session`
- Polling alle 2 Sekunden via `/api/widget/poll`
- Mobile-first: `@media (max-width: 640px)` → vollbild
- Styling ausschließlich Tailwind, CSS-Variablen für Primary Color

**UX für v1.0:**
- Launcher-Button unten rechts (bereits vom Embed-Script eingefügt, iframe zeigt nur Chat)
- Bei Öffnen: Willkommensnachricht aus Config als erste Bot-Nachricht
- Input-Feld + Senden-Button
- Nachrichten-Liste mit Bot/User-Differenzierung
- Typing-Indicator während Bot-Response
- DSGVO-Disclaimer VOR erster Nachricht, Consent wird mit Timestamp geloggt
- Fehler-Handling: Bei API-Fehler sinnvolle Meldung, nicht nur Schweigen

**Mobile-Handling:**
- `@media (max-width: 640px)` → Widget nimmt gesamten Viewport ein
- iOS Safari: `viewport-fit=cover` + `padding-bottom` für Home-Indicator

**Done-Kriterium:**
- iframe lädt unter `/widget/pub_testkey123`
- Komplette Qualifizierungs-Konversation läuft durch
- Mobile-Test auf iPhone Safari und Android Chrome bestanden
- DSGVO-Consent-Flow funktioniert
- Commit: `feat(widget): add iframe chat UI`

### Phase 5: Embed-Script (Tag 6-8)

**Neues Sub-Projekt:** `/widget-embed/`
widget-embed/
├── src/
│   ├── index.ts        # Entry Point
│   ├── launcher.ts     # Floating Button
│   ├── iframe.ts       # iframe-Lifecycle
│   └── postMessage.ts  # Parent ↔ iframe Kommunikation
├── package.json        # Eigenes package.json
├── tsconfig.json
└── rollup.config.js    # Rollup-Build

**Setup:**
```bash
cd widget-embed
npm init -y
npm install --save-dev rollup @rollup/plugin-typescript typescript tslib @rollup/plugin-terser
```

**Output:** `/public/widget.js` (minifiziert, < 15 KB)

**Verwendung auf Kundenseite:**
```html
<script src="https://ai-conversion.ai/widget.js" data-tenant="pub_xxx"></script>
```

**Script-Verhalten:**
1. Liest `data-tenant`-Attribut vom Script-Tag
2. Validiert Format (`pub_[a-zA-Z0-9]{16}`)
3. Erstellt Floating Launcher Button im DOM (unten rechts)
4. Bei Klick: iframe einfügen mit `src="https://ai-conversion.ai/widget/pub_xxx"`
5. iframe als `position: fixed` unten rechts (Desktop) / vollbild (Mobile)
6. postMessage-Handler für Parent↔iframe-Kommunikation (Höhe, Close)

**iframe-Attribute Pflicht:**
```html
<iframe
  sandbox="allow-scripts allow-same-origin allow-forms"
  ... />
```
NICHT mehr Sandbox-Permissions. `allow-popups` und `allow-top-navigation` ausdrücklich NICHT.

**Beschränkungen des Embed-Scripts:**
- Keine globalen Variablen außer `window.AIConversionWidget` (namespace-isoliert)
- Kein Zugriff auf Host-Cookies oder Host-LocalStorage
- Kein Tracking von Host-Seite-Verhalten
- Kein Laden externer Resources außer eigener Domain
- Keine Modifikation von Host-CSS
- Keine Secrets im Code (wird öffentlich served)

**Größen-Budget:** < 15 KB minifiziert. Wenn überschritten, wurde zu viel reingebaut.

**Test-Seite:** `/public/widget-test.html` zum lokalen Testen:
```html
<!DOCTYPE html>
<html>
<head><title>Widget Test</title></head>
<body>
  <h1>Test-Website</h1>
  <script src="/widget.js" data-tenant="pub_testkey123"></script>
</body>
</html>
```

**Done-Kriterium:**
- `npm run build` in `/widget-embed/` erfolgreich
- Output < 15 KB minifiziert
- Test-Seite lädt Widget, Konversation läuft end-to-end
- Commit: `feat(widget): add embed script`

### Phase 6: Dashboard-Integration (Tag 8-9)

**Widget-Konfigurations-Seite:**
`/src/app/dashboard/settings/widget/page.tsx`

- Toggle: Widget aktiv/inaktiv (`webWidgetEnabled`)
- Public Key anzeigen mit Copy-Button
- Embed-Code-Generator mit Copy-Button
- Konfiguration editierbar: `primaryColor`, `logoUrl`, `welcomeMessage`
- Live-Preview des Widgets (iframe direkt eingebettet)

**Bestehende Dashboard-Views erweitern:**
- Channel-Filter in Conversations-View (Alle / WhatsApp / Web)
- KPI-Kacheln summieren WhatsApp + Web
- Neue Conversations mit `channel: 'WEB'` sichtbar im Live-Feed
- CRM-View zeigt Channel-Herkunft pro Lead

**Plan-Feature-Gating:**
```typescript
await checkLimit(tenantId, paddlePlan, 'web_widget');
```
Bei Starter-Plan: deaktiviert mit Upgrade-Prompt. Growth und Pro: inkludiert.

**Done-Kriterium:**
- Nutzer kann Widget im Dashboard konfigurieren, Code kopieren, Widget live sehen
- Channel-Filter funktioniert in allen relevanten Views
- Plan-Gating greift bei Starter-Accounts
- Commit: `feat(dashboard): add web widget configuration UI`

### Phase 7: Testing & Hardening (Tag 9-10)

**Manuelle Test-Szenarien (alle durchlaufen Pflicht):**

1. **Happy Path:** Besucher → Widget öffnen → Qualifizierung → Lead landet im CRM mit Channel-Marker WEB
2. **Cross-Origin:** Widget auf fremder Test-Domain (`localhost:3001`) kommuniziert mit Backend (`localhost:3000`)
3. **Tenant-Isolation:** Public Key von Tenant A schreibt unter keinen Umständen in Daten von Tenant B
4. **Rate-Limit:** Botartige Anfragen werden sauber geblockt (Session-Creation, Message-Posting, Polling)
5. **Mobile:** Widget funktioniert auf iPhone Safari, Android Chrome
6. **DSGVO:** Consent wird vor erster Nachricht eingeholt, Timestamp geloggt
7. **Widget deaktiviert:** `webWidgetEnabled: false` → Config-Endpoint liefert klaren Fehler, Widget lädt nicht
8. **Graceful Degradation:** API-Fehler → sinnvolle Fehlermeldung, kein stummes Brechen
9. **Regression:** Bestehender WhatsApp-Flow komplett unverändert funktional
10. **Plan-Gating:** Starter-Account kann Widget nicht aktivieren, Upgrade-Prompt erscheint

**Build-Check vor Go-Live:**
```bash
npx next build
cd widget-embed && npm run build
```
Beide müssen fehlerfrei durchlaufen.

**Commit:** `test(widget): complete regression and hardening tests`

---

## Sicherheits-Checkliste (Pflicht vor Go-Live)

Alle Punkte MÜSSEN abgehakt sein, bevor das Widget bei einem Pilot-Kunden eingebettet wird:

- [ ] Public Key gibt NUR nicht-sensitive Daten frei (Farbe, Logo, Welcome Message) – NIEMALS API-Keys, interne IDs, Secrets
- [ ] Session-Token serverseitig validiert gegen DB
- [ ] IP-basiertes Rate-Limit auf Session-Creation (10/IP/h)
- [ ] Message-Rate-Limit pro Session (60/h)
- [ ] Poll-Rate-Limit (1/Sekunde/Session)
- [ ] Config-Rate-Limit (100/IP/h)
- [ ] Eingehende Messages verschlüsselt gespeichert via `encryptText()`
- [ ] Audit-Log für alle Widget-Aktionen mit IP-Hash (nicht Klartext)
- [ ] CORS explizit gesetzt, nicht `*` für sensitive Endpoints
- [ ] iframe mit `sandbox="allow-scripts allow-same-origin allow-forms"` – nicht mehr
- [ ] CSP des iframe-Inhalts erlaubt nur eigene Domain
- [ ] DSGVO-Disclaimer vor erster Nachricht, Einwilligung mit Timestamp gespeichert
- [ ] IP-Adressen gehashed, nicht im Klartext
- [ ] Keine Secrets im Embed-Script (es wird öffentlich served)
- [ ] Rate-Limit für anonyme Web-Sessions STRENGER als für WhatsApp
- [ ] Zod-Validierung auf allen Endpoints
- [ ] Tenant-Isolation durchgängig via Composite Keys

---

## Was NICHT gebaut wird (v1.0 Scope)

Ein Feature nur bauen, wenn es NICHT auf dieser Liste steht UND ein echter Pilot-Kunde es explizit fordert.

- ❌ File-Upload im Chat
- ❌ Voice- / Video-Chat
- ❌ Co-Browsing
- ❌ Live-Übergabe an menschlichen Agent
- ❌ Team-Inbox, Ticketing, Agent-Dashboard
- ❌ Trigger-Builder ("öffne nach 30 Sek")
- ❌ A/B-Testing von Willkommensnachrichten
- ❌ Knowledge-Base / RAG-Integration
- ❌ Multi-Language-UI-Management (Bot antwortet automatisch sprachlich via Claude, UI ist Deutsch)
- ❌ Custom-Branding-Editor (nur die 3 Felder: Farbe, Logo, Welcome Text)
- ❌ Zapier/Make/n8n-Integrationen (bestehende API reicht)
- ❌ Long-Polling (v1.1 frühestens, nur wenn Nutzungsdaten es rechtfertigen)
- ❌ WebSockets
- ❌ Read-Receipts
- ❌ Emoji-Picker, Rich-Text-Input
- ❌ Offline-Formular
- ❌ Analytics-Dashboard (nur Channel-Filter im bestehenden Dashboard)
- ❌ Typing-Indicator von User-Seite (nur Bot-Seite)

**Wenn während des Bauens neue Feature-Ideen auftauchen:** In `BACKLOG.md` aufschreiben, NICHT bauen. Nach v1.0-Abschluss neu priorisieren.

---

## Abschluss-Kriterien für v1.0

Das Web-Widget gilt als v1.0-fertig, wenn alle folgenden Punkte abgehakt sind:

- [ ] Eine beliebige Test-Website kann das Widget per Script-Tag einbinden
- [ ] Ein Besucher kann das Widget öffnen, schreiben, Bot-Antwort erhalten
- [ ] Der Bot qualifiziert nach bestehender Logik (identisch zum WhatsApp-Flow)
- [ ] Heiße Leads landen im bestehenden CRM mit `channel: 'WEB'` Marker
- [ ] Dashboard zeigt Web-Konversationen neben WhatsApp-Konversationen
- [ ] Ein Tenant kann im Dashboard Embed-Code kopieren und Widget konfigurieren
- [ ] Cross-Origin-Embedding funktioniert auf mindestens einer fremden Test-Domain
- [ ] Alle Sicherheits-Checkliste-Punkte abgehakt
- [ ] `npx next build` läuft fehlerfrei
- [ ] `widget-embed/` Build läuft fehlerfrei, Output < 15 KB
- [ ] Bestehender WhatsApp-Flow funktioniert unverändert (Regression)
- [ ] Manuelle Test-Szenarien 1-10 erfolgreich durchgelaufen
- [ ] Plan-Feature-Gating greift bei Starter-Accounts

Wenn alle Punkte abgehakt: Commit, Deploy, bei Pilot-Kunde einbetten.

---

## Nächste Session: Pre-Analyse

Ablauf für die nächste Claude Code Session:

1. Lies dieses Dokument (`WEB_WIDGET_INTEGRATION.md`) komplett
2. Lies `CLAUDE.md` und `/prisma/schema.prisma`
3. Führe die 4 Pre-Analyse-Punkte durch
4. Schreibe `ARCHITECTURE_REPORT.md` mit Erkenntnissen und Refactoring-Empfehlungen
5. **STOPP** – Report vorlegen, Freigabe abwarten

**Keine Code-Änderungen in der ersten Session. Die erste Session ist ausschließlich Analyse.**

---

## Architektur-Prinzipien (zur Erinnerung während des Bauens)

1. **Wiederverwendung vor Neuentwicklung.** Jede neue Code-Zeile: Gibt es schon etwas Ähnliches im WhatsApp-Teil?
2. **Kanal-Abstraktion bleibt sauber.** Bot-Logik kennt keine HTTP-Details, keine Phone Numbers, keine Widget-Sessions.
3. **Tenant-Isolation auf JEDER Ebene.** Composite Keys mit `tenantId`. Keine Ausnahmen.
4. **Fail Loud, Fail Early.** Klare Errors im Dev-Mode statt stille Dateninkonsistenz in Prod.
5. **Security First.** Jeder öffentliche Endpoint vor dem Schreiben gegen Security-Checkliste abgleichen.
6. **Scope-Disziplin.** Neue Feature-Ideen → `BACKLOG.md`. Erst v1.0 fertig, dann neu priorisieren.

---

## Änderungs-Protokoll für Architektur-Entscheidungen

Die oben getroffenen Entscheidungen sind stabil, nicht unveränderlich.
Der Sinn der Stabilität ist, Implementierungs-Diskussionen zu vermeiden
— nicht, objektiv bessere Wege zu verpassen. Wenn während des Bauens
eine echte Alternative auftaucht, gilt folgender Prozess:

### Schritte bei einer Re-Evaluation

1. **Stopp der aktuellen Phase.** Kein paralleles Weiterbauen mit
   halb-altem, halb-neuem Ansatz.
2. **ADR schreiben** unter `/docs/adr/NNN-<kurz>.md` mit:
   - Ursprungs-Entscheidung aus diesem Dokument (wörtliches Zitat)
   - Neue Alternative (konkret, implementierbar)
   - Trigger: welche Erkenntnis hat die Re-Evaluation ausgelöst?
   - Trade-off-Vergleich (Steelman für beide Seiten)
   - Reversibilitäts-Check: Two-Way-Door oder One-Way-Door?
   - Impact auf bereits gebaute Phasen (Rückbau nötig? Wie viel?)
   - Empfehlung mit Konfidenz-Level
3. **Freigabe durch Human Project Owner.** ConvArch darf ADRs
   vorbereiten und bewerten, aber nicht selbst freigeben. Claude Code
   darf keine ADRs schreiben — nur Trigger melden und auf ConvArch
   verweisen.
4. **Dokument-Update.** Die Ursprungs-Entscheidung in diesem Dokument
   bleibt sichtbar, wird aber mit `[ersetzt durch ADR-NNN am <Datum>]`
   markiert. Keine stille Überschreibung der Historie.

### Was KEIN Grund für eine Re-Evaluation ist

- "Fühlt sich eleganter an" oder persönlicher Geschmack
- Neue Library- oder Framework-Trends während der Implementierung
- Einzelne Blog-Posts, Stack-Overflow-Antworten oder Tweets
- Widerstand beim Bauen, der mit Geduld und Routine lösbar ist
- Wunsch, den gebauten Code umzustrukturieren ohne funktionalen Gewinn

### Was SEHR WOHL Grund für eine Re-Evaluation ist

- Messbare Performance-Probleme im Regression-Test oder Load-Test
- Security-Lücke im gewählten Ansatz, die in der Spec übersehen wurde
- Bestehender Code, der die geplante Abstraktion bereits besser löst
- DSGVO-, AVV- oder Compliance-Konflikt, der vorher nicht gesehen wurde
- Blocking-Issue in einer gewählten Library (Deprecation, CVE, Lizenz)
- Objektiv niedrigere Tenant-Isolation beim geplanten Ansatz

### Verantwortlichkeiten

| Rolle | Darf | Darf nicht |
|---|---|---|
| Claude Code | Trigger melden, Fakten liefern | ADR schreiben, selbst entscheiden |
| ConvArch | ADR entwerfen, Trade-offs bewerten, empfehlen | Ohne Owner-Freigabe umsetzen |
| Project Owner | Freigeben, ablehnen, Scope setzen | — |

**Prinzip:** Stabil per Default. Revidierbar per Prozess. Niemals still.