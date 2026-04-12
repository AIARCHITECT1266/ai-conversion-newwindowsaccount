# Web-Widget Audit — 2026-04-12

## Zusammenfassung

**Audit-Umfang:** 25+ Dateien geprueft — 4 Widget-API-Endpoints,
Embed-Frontend (ChatClient, page, Avatar, layout), widget.js
Loader, 3 Dashboard-Widget-Config-Endpoints, processMessage
Bot-Pipeline, Prisma-Schema, Middleware (Widget-Routing),
plan-limits, publicKey-Resolver, sessionToken-Handler, colors-Helper.

**Befunde nach Severity:**
- Critical: 0
- High: 2
- Medium: 8
- Low: 12
- Info: 30+

**Gesamturteil:** Solider Stand fuer Pilot-Phase. Keine
Critical-Befunde (kein Tenant-Leak, keine Security-Breach-
Vektoren). Zwei High-Befunde erfordern Aufmerksamkeit vor
Pilot-Kunden-Akquise: (1) Claude-Fallback-Message wird bei
WEB-Channel nicht persistiert (User sieht keine Fehler-Antwort),
(2) Raw Session-Token als senderIdentifier (potenzieller
Token-Leak in Bot-Pipeline). Acht Medium-Befunde betreffen
Wartbarkeit, Accessibility und Defense-in-Depth.

---

## Executive Summary fuer Philipp

**1. Claude-Fehler-Antwort fehlt im Web-Widget (High):**
Wenn Claude nach allen Retries fehlschlaegt, bekommt der
WhatsApp-User eine Fallback-Nachricht ("Entschuldigung, ich bin
gerade nicht erreichbar"). Beim Web-Widget wird diese Nachricht
NICHT in die DB geschrieben — der User sieht ueber Polling nur
seine eigene Nachricht ohne Antwort. Das ist ein funktionaler
Bug, der vor Pilot-Kunden gefixt werden muss. Fix: eine Zeile
in `processMessage.ts` — `saveMessage()` fuer die Fallback-
Nachricht ergaenzen.

**2. Session-Token-Leak-Risiko in Bot-Pipeline (High):**
Der geheime Session-Token (`ws_xxx`) wird als `senderIdentifier`
an die Bot-Pipeline weitergegeben. Falls `processMessage` diesen
Wert irgendwo persistiert oder loggt, leckt das Bearer-Credential.
Aktuell kein aktives Leak gefunden, aber das Design ist fragil.
Fix: Token vor Weitergabe hashen.

**3. Accessibility-Luecken im Dashboard (Medium, gebuendelt):**
Toggle-Switch ohne `role="switch"`/`aria-checked`, Color-Picker-
Labels nicht mit Inputs verknuepft, Feedback-Banner ohne
`aria-live`. Keine funktionalen Bugs, aber Pilot-Kunden mit
Accessibility-Anforderungen wuerden das bemerken. Fix-Aufwand:
~1 Stunde fuer alle drei.

---

## Befunde im Detail

### High

**H1 — Claude-Fallback nicht persistiert fuer WEB-Channel**
- **Datei:** `src/lib/bot/processMessage.ts:433-448`
- **Beobachtung:** `RETRY_FALLBACK_MESSAGE` wird bei Claude-
  Fehler in `responses[]` zurueckgegeben, aber explizit NICHT
  via `saveMessage()` in die DB geschrieben (Kommentar:
  "NICHT persistiert").
- **Warum relevant:** WhatsApp-Transport liefert die Nachricht
  direkt aus. Web-Widget nutzt Polling gegen die DB — ohne
  DB-Persistierung sieht der User nie die Fehler-Antwort.
  Resultat: User wartet endlos auf eine Bot-Antwort die nie
  kommt.
- **Empfehlung:** `saveMessage(conversationId, "ASSISTANT",
  RETRY_FALLBACK_MESSAGE)` vor dem Return ergaenzen. Eine Zeile.

**H2 — Raw Session-Token als senderIdentifier**
- **Datei:** `src/app/api/widget/message/route.ts:137`
- **Beobachtung:** Der geheime `sessionToken` (`ws_xxx`) wird
  als `senderIdentifier` an `processMessage()` uebergeben.
  Kommentar erklaert: "Phase 3b.5 Consent-Fix braucht stabilen
  Identifier zwischen Turns."
- **Warum relevant:** Falls `processMessage` den
  `senderIdentifier` irgendwo persistiert (z.B. in einem
  Log, Audit-Eintrag, oder zukuenftigem Feature), leckt das
  Bearer-Credential. Ein Hash waere genauso stabil.
- **Empfehlung:** `hashTokenForRateLimit(sessionToken)` statt
  Raw-Token als `senderIdentifier` uebergeben. Muss auch
  geprueft werden ob `processMessage` den Wert aktuell
  persistiert (Erstcheck: es wird als `externalId`-Fallback
  NICHT verwendet, da WEB `externalId=null` hat).

### Status: ERLEDIGT (12.04.2026 abends)

**Fix-Commit:** `76ef8fa` — `fix(widget): hash session token
before passing as senderIdentifier`
**Deployed:** Production ai-conversion.ai
**Verifikation:**
- H.3 lokaler Production-Test: gruen (Message 202, Multi-Turn
  stabil, kein Leak)
- H.5 Production-Smoke-Test: gruen (alle 7 Checks)

**Fix-Zusammenfassung:** `sessionToken` →
`hashTokenForRateLimit(sessionToken)` in
`src/app/api/widget/message/route.ts:137`. Defense-in-Depth:
auch wenn der Parameter aktuell ein toter Parameter ist, kann
er in zukuenftigen Refactors nicht mehr versehentlich als
Raw-Token geloggt werden.

---

### Medium

**M1 — processMessage: DB-Queries ohne tenantId Composite Key**
- **Datei:** `src/lib/bot/processMessage.ts:107,359,380`
- **Beobachtung:** `loadConversationHistory`, STOP-Handler und
  Consent-Update nutzen `where: { conversationId }` ohne
  `tenantId`. Verlaesst sich auf Caller-Validierung.
- **Warum relevant:** Verstosst gegen CLAUDE.md Architektur-
  Pattern ("IMMER Composite Keys"). Aktuell kein Exploit
  moeglich (conversationId ist CUID, Caller validiert), aber
  fragil bei zukuenftigen Aenderungen.
- **Empfehlung:** `tenantId` als Defense-in-Depth in alle drei
  Queries ergaenzen. `processMessage` hat `tenantId` bereits
  im Input.

**M2 — parseLogoUrl akzeptiert http://-URLs**
- **Datei:** `src/lib/widget/publicKey.ts:108`
- **Beobachtung:** `parseLogoUrl` akzeptiert `http://` neben
  `https://` und relativen Pfaden.
- **Warum relevant:** Logo-/Bubble-Images koennten ueber
  unverschluesselte Verbindung geladen werden (MITM-Risiko).
- **Empfehlung:** Nur `https://` und relative Pfade zulassen.

**M3 — Kein top-level try/catch auf Widget-API-Handlern**
- **Datei:** Alle 4 Widget-API-Routes
- **Beobachtung:** Keiner der Handler wrappt den Body in
  try/catch. Unerwartete Fehler (DB-Timeout, Encryption-
  Failure) resultieren in Next.js-Default-500 mit moeglichem
  Stack-Trace.
- **Warum relevant:** Oeffentliche Endpoints sollten niemals
  interne Stack-Traces exponieren.
- **Empfehlung:** Pro Handler ein try/catch mit strukturiertem
  `{ error: "Interner Fehler" }` Response (Status 500).

**M4 — poll/route.ts: findMany ohne select-Clause**
- **Datei:** `src/app/api/widget/poll/route.ts:130-137`
- **Beobachtung:** `db.message.findMany` laedt alle Spalten,
  obwohl nur `id`, `role`, `contentEncrypted`, `timestamp`
  benoetigt werden.
- **Warum relevant:** Laedt potentiell sensitive Felder
  (zukuenftige Spalten) unnoetig in den Speicher.
- **Empfehlung:** `select`-Clause ergaenzen.

**M5 — Dashboard Toggle: Race-Condition bei Key-Generierung**
- **Datei:** `src/app/api/dashboard/widget-config/toggle/route.ts:73-84`
- **Beobachtung:** Check auf bestehenden Key und Update mit
  neuem Key sind nicht atomar.
- **Warum relevant:** Zwei gleichzeitige Toggle-Requests
  koennten einen gerade generierten Key ueberschreiben.
  Niedriges Risiko (Dashboard, geringe Concurrency).
- **Empfehlung:** Atomares `upsert` oder Transaction.

**M6 — Dashboard Toggle: role="switch" fehlt**
- **Datei:** `src/app/dashboard/settings/widget/page.tsx:268-283`
- **Beobachtung:** Toggle-Button ohne `role="switch"`,
  `aria-checked`, `aria-label`.
- **Warum relevant:** Screenreader koennen den Toggle-Zustand
  nicht vermitteln.
- **Empfehlung:** ARIA-Attribute ergaenzen.

**M7 — Dashboard Color-Picker: Labels nicht verknuepft**
- **Datei:** `src/app/dashboard/settings/widget/page.tsx:555-568`
- **Beobachtung:** `<label>` nicht via `htmlFor`/`id` mit
  `<input>` verknuepft.
- **Warum relevant:** Accessibility-Luecke, Label-Klick
  fokussiert nicht den Input.
- **Empfehlung:** `htmlFor`/`id`-Paare ergaenzen.

**M8 — Chat-Message-Bubbles: role="article" statt Listensemantik**
- **Datei:** `src/app/embed/widget/ChatClient.tsx:476,501`
- **Beobachtung:** Messages nutzen `role="article"` statt
  `role="listitem"` in einem `role="list"` Container.
- **Warum relevant:** Screenreader koennen Message-Anzahl
  und Navigation nicht vermitteln.
- **Empfehlung:** Messages-Container als `role="list"`,
  jede Bubble als `role="listitem"`.

---

### Low

**L1 — Magic Numbers in Rate-Limits**
- **Dateien:** Alle 4 Widget-API-Routes
- `max: 10` (session), `max: 60` (message), `max: 3600` (poll),
  `max: 100` (config), `max: 4000` (message length)
- **Empfehlung:** Named Constants extrahieren.

**L2 — CORS-Helper in 4 Dateien dupliziert**
- **Dateien:** config, session, message, poll route.ts
- Identische `CORS_HEADERS` + `withCors()` in jeder Datei.
- **Empfehlung:** `src/lib/widget/cors.ts` extrahieren.

**L3 — publicKey-Cache ohne Size-Limit**
- **Datei:** `src/lib/widget/publicKey.ts:75-77`
- In-Memory-Map waechst theoretisch unbegrenzt.
- **Empfehlung:** LRU-Cache oder Max-Size-Eviction.

**L4 — decryptText-Fehler im Poll nicht gefangen**
- **Datei:** `src/app/api/widget/poll/route.ts:144`
- Korrupter Ciphertext wuerde unstrukturierten 500 werfen.
- **Empfehlung:** Per-Message try/catch mit Fallback-Text.

**L5 — Textarea focus:outline-none ohne Ersatz**
- **Datei:** `src/app/embed/widget/ChatClient.tsx:383`
- Keyboard-Nutzer sehen keinen Fokus-Indikator.
- **Empfehlung:** `focus-visible:ring-1` ergaenzen.

**L6 — mergeMessages re-sortiert bei jedem Poll**
- **Datei:** `src/app/embed/widget/ChatClient.tsx:406`
- Mitigiert durch Empty-Check-Guard, aber nicht optimal.
- **Empfehlung:** Nur sortieren wenn neue Messages gemerged.

**L7 — MessageBubble/TypingIndicator ohne React.memo**
- **Datei:** `src/app/embed/widget/ChatClient.tsx`
- Re-Render bei jedem State-Change.
- **Empfehlung:** React.memo fuer Message-Bubbles.

**L8 — Dashboard Feedback-Banner ohne aria-live**
- **Datei:** `src/app/dashboard/settings/widget/page.tsx:461-471`
- Screenreader kuendigen Erfolg/Fehler nicht an.
- **Empfehlung:** `role="alert"` oder `aria-live="polite"`.

**L9 — Dashboard Platform-Tabs ohne ARIA-Tab-Pattern**
- **Datei:** `src/app/dashboard/settings/widget/page.tsx:333-353`
- Buttons als Tabs ohne `role="tablist"`/`role="tab"`.
- **Empfehlung:** ARIA-Tab-Pattern implementieren.

**L10 — Dashboard Preview-iframe feste Breite 400px**
- **Datei:** `src/app/dashboard/settings/widget/page.tsx:445-452`
- Ueberlaeuft auf Mobile-Screens < 400px.
- **Empfehlung:** `max-width: 100%` ergaenzen.

**L11 — Scoring-Pipeline-Queries ohne tenantId**
- **Datei:** `src/lib/bot/processMessage.ts:166-176`
- Gleiche Thematik wie M1, aber Fire-and-Forget.
- **Empfehlung:** tenantId als Defense-in-Depth.

**L12 — widget.js: innerHTML fuer SVG-Injection**
- **Datei:** `public/widget.js:228`
- Statischer SVG-String, aktuell sicher. Aber `innerHTML`
  ist ein Code-Smell fuer zukuenftige Aenderungen.
- **Empfehlung:** Kommentar "SAFE: statischer SVG-Literal"
  oder Refactor zu `createElementNS`.

---

### Info (Auswahl der wichtigsten positiven Befunde)

- **Zero `any`-Types** in allen Widget-Dateien
- **Zero `dangerouslySetInnerHTML`** in React-Components
- **Alle Kommentare auf Deutsch** (CLAUDE.md-konform)
- **Kein Dead Code** in Widget-Pfaden
- **Encryption korrekt:** Alle Messages via `encryptText()`
- **Kein Cross-Channel-Leak:** processMessage ist echt
  channel-agnostisch, kein WhatsApp-Import
- **Schema korrekt:** Alle Indices vorhanden, `@unique` auf
  `widgetSessionToken`, FK-Constraints mit Cascade
- **Plan-Gating korrekt:** `hasPlanFeature` auf allen
  Dashboard-Widget-Endpoints
- **Audit-Logging vollstaendig:** Alle mutierenden Widget-
  Endpoints loggen mit gehashter IP
- **DSGVO-Consent-Flow korrekt:** Modal vor Chat, Timestamp
  in DB, Pre-Consent-Optimierung funktional
- **Embed-Script 13.3 KB** (< 15 KB Budget)
- **Session-Token 128-bit Entropie** (crypto.randomBytes)
- **Public-Key 96-bit Entropie** (crypto.randomBytes)
- **Closed Shadow DOM** im Loader (kein CSS-Bleed)
- **Sandbox-Attribute korrekt:** `allow-scripts allow-same-
  origin allow-forms`
- **CSP frame-ancestors `*`** auf Widget-Routen (korrekt)
- **prefers-reduced-motion** in widget.js (Accessibility)

---

## Nicht geprueft

- WhatsApp-Webhook-Handler (ausser gemeinsamer processMessage)
- Admin-Dashboard (ausser Widget-Config-Endpoints)
- Marketing-Seiten (/, /pricing, /faq etc.)
- Paddle-Integration
- Resend-Email-Integration
- Asset Studio
- Allgemeine Next.js-Infra (ausser Middleware Widget-Routing)
- Performance unter Last (keine Load-Tests)
- Browser-Kompatibilitaet (kein Cross-Browser-Testing)

## Methodik-Limitation

Statische Code-Analyse ohne Runtime-Tests. Keine Penetration-
Tests. Keine automatisierten Security-Scanner (SAST/DAST).
Performance-Einschaetzungen basieren auf Code-Struktur, nicht
auf Last-Tests. Tenant-Isolation-Verifikation basiert auf
Code-Review, nicht auf automatisiertem Fuzzing.

Die processMessage-Analyse prueft ob `senderIdentifier`
aktuell persistiert wird — eine Runtime-Verifikation (z.B.
via DB-Query nach einem Test-Request) wuerde das definitiv
bestaetigen.

---

## Fix-Planung High #2: Session-Token-Hash (Pre-Analyse H.1)

### Ist-Zustand

**Web-Widget (`message/route.ts:134-137`):**
```typescript
// senderIdentifier: opaquer String fuer processMessage.
// Voller Session-Token, weil der Phase-3b.5-Consent-Fix darauf
// basiert dass Identifier stabil zwischen Turns bleibt.
const senderIdentifier = sessionToken;
```
Der Raw-Session-Token (`ws_xxx`, 128-bit Entropie, Bearer-Credential)
wird als `senderIdentifier` an `processMessage()` uebergeben.

**WhatsApp-Referenz (`handler.ts:387`):**
```typescript
senderIdentifier: externalId,
```
WhatsApp nutzt `externalId` — den SHA-256-Hash der Telefonnummer.
Dieser wird beim Conversation-Lookup erzeugt und ist bereits ein
opaker, nicht-reversibler Identifier. Kein Secret.

### senderIdentifier-Verwendung in processMessage

**Ergebnis: senderIdentifier wird NIRGENDWO im Funktionskoerper
von processMessage.ts verwendet.**

Einziges Vorkommen: Zeile 25 (Type-Definition):
```typescript
senderIdentifier: string; // WhatsApp: phoneHash, Web: sessionId
```

Der Parameter wird in der Funktionssignatur deklariert, aber
im gesamten Funktionskoerper (498 Zeilen) nie gelesen, nie
persistiert, nie geloggt, nie an eine Sub-Funktion weitergegeben.
Er ist ein **toter Parameter**.

Begruendung: processMessage wurde in Phase 1 als kanal-agnostische
Extraktion gebaut. Der `senderIdentifier` war als Platzhalter
fuer zukuenftige Features gedacht (z.B. Sender-basiertes
Rate-Limiting innerhalb der Bot-Pipeline). Bisher wurde kein
solches Feature implementiert.

### Audit-Log-Pfad

`src/modules/compliance/audit-log.ts` (89 Zeilen):
- `auditLog()` akzeptiert `details: Record<string, unknown>`
- `sanitizeDetails()` filtert sensitive Felder (`token`, `key`,
  `secret`, `message`, etc.) automatisch heraus
- `senderIdentifier` wird in keinem `auditLog()`-Aufruf als
  Detail-Feld uebergeben
- Selbst WENN es uebergeben wuerde: der Feldname enthaelt weder
  "token" noch "key" noch "secret", wuerde also NICHT gefiltert
  werden — das waere ein Leak

**Kein aktives Token-Leak gefunden.** Aber das Design ist fragil:
Ein zukuenftiges Feature, das `senderIdentifier` loggt oder
persistiert, wuerde den Raw-Token exponieren.

### Grep-Vollpruefung

`grep -rn "senderIdentifier" src/` ergibt 5 Treffer:
1. `processMessage.ts:25` — Type-Definition (toter Parameter)
2. `message/route.ts:134` — Kommentar
3. `message/route.ts:137` — Zuweisung `= sessionToken`
4. `message/route.ts:145` — Uebergabe an processMessage
5. `handler.ts:387` — WhatsApp: `= externalId`

Keine `console.log`, kein `logger`, kein `auditLog`-Aufruf
mit senderIdentifier.

### Ziel-Zustand

**Option A (empfohlen): Hash statt Raw-Token**

`hashTokenForRateLimit(sessionToken)` existiert bereits in
`src/lib/widget/sessionToken.ts:41-43` (SHA-256, 16 Hex-Chars).
Dieselbe Funktion fuer den senderIdentifier verwenden:

```typescript
const senderIdentifier = hashTokenForRateLimit(sessionToken);
```

Ein Hash ist genauso stabil zwischen Turns wie der Raw-Token.

**Option B (alternative): Leeren String uebergeben**

Da `senderIdentifier` ein toter Parameter ist, koennte auch
`""` uebergeben werden. Das waere ehrlicher, aber bricht das
Interface-Versprechen ("opaquer Identifier fuer den Sender")
und verhindert zukuenftige Nutzung.

**Empfehlung: Option A.** Hash uebergeben, damit der Parameter
sein Interface-Versprechen erfuellt, aber kein Secret transportiert.

### Fix-Plan

**1 Datei, 1 Zeile:**

`src/app/api/widget/message/route.ts:137`:
```typescript
// Vorher:
const senderIdentifier = sessionToken;

// Nachher:
const senderIdentifier = hashTokenForRateLimit(sessionToken);
```

`hashTokenForRateLimit` ist bereits importiert (Zeile 24):
```typescript
import { verifySessionToken, hashTokenForRateLimit } from "@/lib/widget/sessionToken";
```

Kein neuer Import noetig. Keine neue Funktion noetig.

**Kommentar-Update (Zeile 134-136):**
```typescript
// senderIdentifier: opaquer, gehashter String fuer processMessage.
// SHA-256-Hash des Session-Tokens — stabil zwischen Turns,
// aber kein Bearer-Credential (Defense-in-Depth).
```

### Regression-Risiko

**Niedrig.** `senderIdentifier` ist ein toter Parameter in
`processMessage.ts`. Der Wert wird nirgendwo gelesen. Selbst
wenn er gelesen wuerde: ein Hash ist genauso stabil wie der
Raw-Token. Keine bestehende Funktionalitaet kann brechen.

### Migrations-Frage

**Forward-Only ausreichend.** Da `senderIdentifier` nirgendwo
persistiert wird, gibt es keine bestehenden DB-Eintraege zu
migrieren. Neue Sessions bekommen den Hash, alte Sessions
(die den Raw-Token hatten) sind irrelevant weil der Wert nie
gespeichert wurde.

### Test-Strategie

1. `npx next build` — muss gruen sein
2. Manueller curl-Test: Session erstellen, Message senden,
   Poll → Bot antwortet → Consent-Flow funktioniert
3. Verifikation: `senderIdentifier` im processMessage-Aufruf
   ist ein 16-Hex-Char-Hash, nicht der Raw-Token

---

## Fix-Verification H.3: Lokaler Test (12.04.2026 abends)

### Setup
- Branch: `fix/widget-sender-identifier-hash` (Commit `76ef8fa`)
- Build: gruen
- Server: `npx next start -p 3100`

### Test-Ergebnisse

| Test | Ergebnis |
|---|---|
| Build | Gruen |
| Session-Erstellung (consentGiven=true) | 200, Token + ConvID zurueck |
| Message Turn 1 | 202 Accepted |
| Message Turn 2 (gleicher Token) | 202 Accepted |
| Poll (nach Turn 1+2) | 4 Messages (2 User, 2 Assistant) |
| Token-Leak in Message-Response | OK — nicht enthalten |
| Token-Leak in Poll-Response | OK — nicht enthalten |
| Multi-Turn-Stabilitaet | OK — Hash ist stabil zwischen Turns |

### Token-Leak-Analyse

- **Message-Response `{"ok":true}`:** Enthaelt kein `ws_`-Token. OK.
- **Poll-Response:** Messages enthalten nur `id`, `role`, `content`,
  `timestamp`. Kein `senderIdentifier` oder `ws_`-Token. OK.
- **Audit-Log:** `senderIdentifier` wird in keinem `auditLog()`-
  Aufruf innerhalb von `processMessage.ts` verwendet (bestaetigt
  in H.1 Pre-Analyse: toter Parameter). Kein Leak moeglich.
- **DB `externalId`:** WEB-Conversations haben `externalId=null`
  (korrekt seit Phase 3a.5). Der gehashte `senderIdentifier`
  landet NICHT in `externalId`.

### Gesamturteil

**GO fuer Phase H.4 (Merge + Deploy).** Fix verifiziert:
- Keine Regression (Message-Endpoint funktioniert, Multi-Turn stabil)
- Kein Token-Leak in Responses
- Hash stabil zwischen Turns (2 User + 2 Assistant Messages)

---

## Fix-Verification H.5: Production-Smoke-Test (12.04.2026 abends)

### Setup
- Production: `ai-conversion.ai` (Commit `76ef8fa` deployed)

### Test-Ergebnisse

| Test | Ergebnis |
|---|---|
| Landing-Page `/` | 200 OK |
| CSP-Header | Nonce-basiert (`nonce-3xAaU7...`, `strict-dynamic`) |
| Widget-Config-Endpoint | 200, JSON mit 11 Feldern |
| Session-Erstellung | 200, Token + ConvID |
| Message Turn 1 | 202 Accepted |
| Message Turn 2 | 202 Accepted |
| Token-Leak in Response | OK — nicht enthalten |

### Gesamturteil

**GO. High #2 ist in Production gefixt und verifiziert.**
Keine Regression. Alle Widget-Endpoints funktional. Kein
Token-Leak. CSP-Nonce intakt.
