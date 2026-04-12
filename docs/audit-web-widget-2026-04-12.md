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

### Status: ERLEDIGT (12.04.2026 spaet abends)

**Fix-Commit:** `4e05e8c` — `fix(bot): persist fallback message
when claude fails`
**Deployed:** Production ai-conversion.ai
**Verifikation:**
- H.3 lokaler Test mit simuliertem Claude-Fehler: Fallback
  erscheint im Poll
- H.5 Production-Smoke-Test: Happy-Path unveraendert funktional

**Fix-Zusammenfassung:** `saveMessage()` +
`auditLog('bot.reply_failed')` in beiden Catch-Bloecken (innerer
Claude-Fehler + aeusserer Exception-Handler) von
`processMessage.ts`. Aeusserer Catch liefert jetzt
`responses: [RETRY_FALLBACK_MESSAGE]` statt leerem Array.

Beide Kanaele profitieren: Web-Widget-User bekommt Fallback via
Poll, WhatsApp erhaelt sie zusaetzlich im DB-Audit-Trail.

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

### Status: ERLEDIGT (12.04.2026 spaet abends)

**Fix-Commit:** `763fa69` — `fix(bot): enforce tenantId in
processmessage db queries`
**Deployed:** Production ai-conversion.ai
**Verifikation:**
- H.3 lokal: Multi-Turn-Konversation + STOP-Handler (401 nach
  STOP = updateMany mit tenantId funktioniert)
- H.5 Production: Multi-Turn-Flow OK (4 Messages)

5 Queries um Composite-Key-Filter ergaenzt:
loadConversationHistory (Signatur+where), STOP-Handler (updateMany),
Consent-Update (updateMany), Scoring lead.findFirst, Scoring
conversation.findFirst. Defense-in-Depth, kein aktiver Leak-Vektor.

**Gleichzeitig abgeschlossen:** Low L11 (Scoring-Pipeline-Queries)
— im selben Commit mitgefixt.

**M2 — parseLogoUrl akzeptiert http://-URLs**
- **Datei:** `src/lib/widget/publicKey.ts:108`
- **Beobachtung:** `parseLogoUrl` akzeptiert `http://` neben
  `https://` und relativen Pfaden.
- **Warum relevant:** Logo-/Bubble-Images koennten ueber
  unverschluesselte Verbindung geladen werden (MITM-Risiko).
- **Empfehlung:** Nur `https://` und relative Pfade zulassen.

### Status: ERLEDIGT (12.04.2026 spaet abends)

**Fix-Commit:** `4a2ff80` — `fix(widget): reject http urls in
parseLogoUrl (https-only)`
**Deployed:** Production ai-conversion.ai
**Fix:** parseLogoUrl akzeptiert nur noch `https://` oder
same-origin-Pfade (`/`). Gilt fuer logoUrl UND bubbleIconUrl.
Kein http-Leak mehr moeglich.

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

### Status: ERLEDIGT (12.04.2026 spaet abends)

**Fix-Commit:** `b049bce` — `fix(widget): add top-level try/catch
to all widget api routes`
**Deployed:** Production ai-conversion.ai
**Verifikation:**
- H.3 lokaler Regressions-Test: Happy-Path + Fehler-Pfade
  (400/401) korrekt
- H.5 Production-Smoke-Test: keine 500-Regression

Inline-try/catch pro Route. Fallback-Response
`{error: "Interner Serverfehler"}` mit Status 500 + withCors.
Bestehende spezifische Fehler-Handler (Zod, Rate-Limit, Auth)
unveraendert.

---

## Fix-Planung Medium M1: tenantId Composite Keys (Pre-Analyse H.1)

### Vollstaendiger Query-Katalog in processMessage.ts

12 DB-Queries in `src/lib/bot/processMessage.ts`. `tenantId` ist
ab Zeile 318 (Destrukturierung aus `input`) verfuegbar — alle
Queries liegen danach oder in Funktionen die `tenantId` als
Parameter erhalten.

| Zeile | Model | Query | where-Clause | tenantId? | Bewertung |
|---|---|---|---|---|---|
| 107 | message | findMany | `{ conversationId }` | **Nein** | **M1** |
| 137 | message | create | `{ conversationId, ... }` | Nicht in where (create) | OK (kein Lookup) |
| 167 | lead | findUnique | `{ conversationId }` | **Nein** | **L11** |
| 171 | conversation | findUnique | `{ id: conversationId }` | **Nein** | **L11** |
| 175 | tenant | findUnique | `{ id: tenantId }` | Ja (IS tenantId) | OK |
| 201 | campaign | findUnique | `{ tenantId_slug: { tenantId, slug } }` | Ja | OK |
| 207 | abTest | findFirst | `{ campaignId, isActive }` | Nein (aber indirekt via campaign) | OK |
| 212 | abTest | update | `{ id: activeTest.id }` | Nein (aber ID aus vorheriger Query) | OK |
| 223 | lead | upsert | `{ conversationId }` / create `{ tenantId }` | Im create ja, im where nein | Teilweise |
| 358 | conversation | update | `{ id: conversationId }` | **Nein** | **M1** |
| 379 | conversation | update | `{ id: conversationId }` | **Nein** | **M1** |
| 392 | tenant | findUnique | `{ id: tenantId }` | Ja (IS tenantId) | OK |

### Betroffene Stellen (Fix noetig)

**Prioritaet Hoch (M1 — direkte Composite-Key-Verletzung):**

1. **Zeile 107** — `loadConversationHistory`:
   `db.message.findMany({ where: { conversationId } })`
   Fix: `where: { conversationId, conversation: { tenantId } }`
   Oder: tenantId als Parameter an die Funktion ergaenzen und
   via Message-Relation filtern.

2. **Zeile 358** — STOP-Handler:
   `db.conversation.update({ where: { id: conversationId } })`
   Fix: `where: { id: conversationId, tenantId }` — aber Prisma
   `update` erwartet `@unique` oder `@@unique` in where. Da
   `id` allein `@id` (unique) ist, geht `{ id, tenantId }` nur
   mit `updateMany` (Returns count statt Record) oder via
   `findFirst` + `update` Zwei-Schritt-Pattern.
   **Sauberste Loesung:** `db.conversation.updateMany({
   where: { id: conversationId, tenantId }, data: { status:
   "CLOSED" } })` — gibt `{ count: 1 }` zurueck.

3. **Zeile 379** — Consent-Update:
   Gleiche Problematik wie Zeile 358. Gleiche Loesung:
   `updateMany` mit `{ id: conversationId, tenantId }`.

**Prioritaet Niedrig (L11 — Scoring-Pipeline, Fire-and-Forget):**

4. **Zeile 167** — `db.lead.findUnique({ where: { conversationId } })`
   Fix: Kein einfacher Composite moeglich, weil `conversationId`
   bereits `@unique` auf Lead ist. Der tenantId-Check waere
   redundant mit dem DB-Constraint. Trotzdem: Defense-in-Depth
   via `findFirst({ where: { conversationId, tenantId } })`.

5. **Zeile 171** — `db.conversation.findUnique({ where: { id } })`
   Fix: `findFirst({ where: { id: conversationId, tenantId } })`

### Echter Leak-Vektor

**Aktuell kein exploitabler Leak.** Begruendung:
- `conversationId` ist ein CUID (26+ Zeichen, 128-bit Entropie)
  — nicht erratbar
- Die Caller (`/api/widget/message` + WhatsApp-Handler)
  validieren die Conversation VOR dem processMessage-Aufruf:
  Widget via `verifySessionToken` (Token → Conversation),
  WhatsApp via `externalId + tenantId`-Lookup
- Ein Angreifer muesste sowohl ein gueltiges Session-Token HABEN
  als auch eine fremde conversationId in den processMessage-
  Aufruf injizieren — das ist ueber die API nicht moeglich,
  weil `conversationId` aus der Token-Validierung kommt

**Defense-in-Depth Argument:** Trotzdem sollte processMessage
seine eigenen Queries absichern, weil ein zukuenftiger Caller
(z.B. Admin-impersonation, Bulk-Import) die Conversation-ID
moeglicherweise nicht vorab validiert.

### Fix-Plan

**5 Stellen in 1 Datei:**

`src/lib/bot/processMessage.ts`:

1. `loadConversationHistory` (Zeile 106): Signatur um `tenantId`
   Parameter erweitern, where-Clause ergaenzen
2. STOP-Handler (Zeile 358): `update` → `updateMany` mit tenantId
3. Consent-Update (Zeile 379): `update` → `updateMany` mit tenantId
4. Scoring: lead.findUnique (Zeile 167): → `findFirst` mit tenantId
5. Scoring: conversation.findUnique (Zeile 171): → `findFirst` mit tenantId

### Aufwand
**S (~25 Min).** 5 Query-Aenderungen, keine neue Logik.
`loadConversationHistory` braucht einen neuen Parameter.
Die Aufrufe dieser Funktion (Zeile 414) muessen `tenantId`
mitgeben.

### Regression-Risiko
**Niedrig.** Alle Aenderungen sind additiv (zusaetzliches
where-Kriterium). Im Happy-Path ist `tenantId` immer korrekt
zugeordnet → die Queries liefern identische Ergebnisse.
Nur bei fehlerhafter Zuordnung (die aktuell nicht vorkommt)
wuerde das neue Kriterium greifen und einen Zugriff verhindern.

Die `updateMany`-Umstellung aendert den Return-Typ von
`Conversation` auf `{ count: number }` — an den 2 betroffenen
Stellen wird der Return-Wert nicht verwendet, also kein
Breaking Change.

**M4 — poll/route.ts: findMany ohne select-Clause**
- **Datei:** `src/app/api/widget/poll/route.ts:130-137`
- **Beobachtung:** `db.message.findMany` laedt alle Spalten,
  obwohl nur `id`, `role`, `contentEncrypted`, `timestamp`
  benoetigt werden.
- **Warum relevant:** Laedt potentiell sensitive Felder
  (zukuenftige Spalten) unnoetig in den Speicher.
- **Empfehlung:** `select`-Clause ergaenzen.

### Status: ERLEDIGT (12.04.2026 spaet abends)

**Fix-Commit:** `ce5ccbe` — `fix(widget): explicit select clause
in poll findMany`
**Deployed:** Production ai-conversion.ai
**Fix:** findMany mit explizitem select:
`{ id, role, contentEncrypted, timestamp }`. Response-Schema
unveraendert, keine Regression. Lokal + Production verifiziert.

**M5 — Dashboard Toggle: Race-Condition bei Key-Generierung**
- **Datei:** `src/app/api/dashboard/widget-config/toggle/route.ts:73-84`
- **Beobachtung:** Check auf bestehenden Key und Update mit
  neuem Key sind nicht atomar.
- **Warum relevant:** Zwei gleichzeitige Toggle-Requests
  koennten einen gerade generierten Key ueberschreiben.
  Niedriges Risiko (Dashboard, geringe Concurrency).
- **Empfehlung:** Atomares `upsert` oder Transaction.

### Status: ERLEDIGT (12.04.2026 spaet abends)

**Fix-Commit:** `67240f9` — `fix(widget): atomic key generation
via conditional updateMany`
**Deployed:** Production ai-conversion.ai
**Fix:** Option D aus H.1 — `updateMany` mit
`{ id, webWidgetPublicKey: null }`. Atomare Key-Generierung
ohne Transaction. Zweiter paralleler Request bekommt count=0
und setzt nur `enabled`.

---

## Fix-Planung Medium M5: Toggle Race-Condition (Pre-Analyse H.1)

### Ist-Zustand

`toggle/route.ts:73-95`:
```typescript
const existing = await db.tenant.findUnique({
  where: { id: tenant.id },
  select: { webWidgetPublicKey: true },
});
let publicKey = existing?.webWidgetPublicKey ?? null;
let keyGenerated = false;
if (enabled && !publicKey) {
  publicKey = generatePublicKey();
  keyGenerated = true;
}
await db.tenant.update({
  where: { id: tenant.id },
  data: {
    webWidgetEnabled: enabled,
    ...(keyGenerated && publicKey ? { webWidgetPublicKey: publicKey } : {}),
  },
});
```

Pattern: **Read-then-Write ohne Transaktion.** Zwischen dem
`findUnique` (Zeile 73) und dem `update` (Zeile 86) liegt ein
Zeitfenster in dem ein zweiter Request denselben Zustand liest.

### Race-Szenarien

**Szenario 1 — Doppelklick (realistisch):** Admin klickt
zweimal schnell auf den Toggle. Beide Requests sehen
`publicKey=null`, beide generieren einen neuen Key, der zweite
`update` ueberschreibt den ersten. Resultat: der Key vom ersten
Request war kurzzeitig in der DB, wird dann durch den zweiten
ersetzt. Falls der erste Key bereits irgendwo kopiert wurde
(Embed-Code), ist er jetzt ungueltig.

**Szenario 2 — Zwei Tabs (unwahrscheinlich):** Admin hat
Dashboard in zwei Tabs offen. Beide klicken Toggle. Gleicher
Effekt wie Szenario 1.

**Szenario 3 — Mehrere Admin-User (nicht implementiert):**
Aktuell gibt es nur einen Admin-User pro Tenant (Magic-Link).
Dieses Szenario existiert nicht.

**Realismus-Einschaetzung:** Szenario 1 ist real moeglich, aber
niedrige Auswirkung: der ueberschriebene Key war nur Sekunden
alt und wurde vermutlich noch nicht verteilt. Kein Datenverlust,
kein Security-Risk — nur ein unerwarteter Key-Wechsel.

### Loesungsansaetze

**A) DB-Unique-Constraint + P2002-Catch:**
- Pro: Verhindert Duplikate auf DB-Ebene
- Con: Loest das Race-Problem nicht (beide Keys sind unique,
  keiner kollidiert — das Problem ist das Ueberschreiben)
- **Nicht anwendbar** — unique-Constraint existiert bereits,
  aber die Race ist kein Duplikat-Problem

**B) `updateMany` als atomare Operation:**
- Pro: Einfach
- Con: Loest das Read-then-Write nicht — `updateMany` ist nur
  fuer die where-Clause atomar, nicht fuer die
  Read-before-Write-Logik
- **Nicht anwendbar**

**C) Prisma `$transaction` (Serializable Isolation):**
- Pro: Korrekte Loesung — Read + Write atomar
- Con: Prisma-Transactions sind in Prisma 7 mit Driver-Adapters
  (PrismaPg) eingeschraenkt. `$transaction([...])` (Sequential)
  gibt keine echte Serializable-Isolation.
  Interactive Transactions (`$transaction(async (tx) => {...})`)
  waeren korrekt, aber Kompatibilitaet mit PrismaPg pruefen.
- **Moeglich, aber Kompatibilitaets-Risiko**

**D) Conditional Update (atomar in SQL):**
- Pro: Kein Read noetig. `update` mit `where` + Conditional-
  Schreib-Logik direkt in SQL
- Umsetzung: `updateMany` mit Bedingung
  `{ id: tenant.id, webWidgetPublicKey: null }` und
  `data: { webWidgetPublicKey: newKey, webWidgetEnabled: true }`
  — wenn Key bereits existiert, matched die where-Clause nicht,
  count=0, dann nur noch `enabled` setzen.
- Con: Zwei separate Updates noetig (einer fuer Key-Gen, einer
  fuer Enable-only). Etwas mehr Code.
- **Sauberste Loesung fuer diesen spezifischen Fall**

### Empfehlung: Option D (Conditional Update)

Statt Read-then-Write: einen einzigen `updateMany` mit
`where: { id, webWidgetPublicKey: null }` fuer den Key-Gen-Fall.
Falls `count === 0`: Key existierte schon, nur `enabled` setzen.

```typescript
if (enabled) {
  const newKey = generatePublicKey();
  const keyResult = await db.tenant.updateMany({
    where: { id: tenant.id, webWidgetPublicKey: null },
    data: { webWidgetPublicKey: newKey, webWidgetEnabled: true },
  });
  if (keyResult.count === 0) {
    // Key existiert schon — nur enabled setzen
    await db.tenant.update({
      where: { id: tenant.id },
      data: { webWidgetEnabled: true },
    });
  }
} else {
  await db.tenant.update({
    where: { id: tenant.id },
    data: { webWidgetEnabled: false },
  });
}
```

### Aufwand
**S (~20 Min).** Umstrukturierung der Zeilen 73-95, kein neuer
Import, keine Schema-Aenderung.

### Regression-Risiko
**Niedrig.** Toggle-Verhalten bleibt identisch im Happy-Path.
Nur der Race-Fall aendert sich: statt Key ueberschreiben wird
der zweite Request den bestehenden Key beibehalten.
Key-Rotation (in `generate-key/route.ts`) ist ein separater
Endpoint und nicht betroffen.

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

### Status M6+M7+M8: ERLEDIGT (12.04.2026 spaet abends)

**Fix-Commit:** `71869f8` — `fix(widget): improve accessibility
on toggle, color-picker, chat log`
**Deployed:** Production ai-conversion.ai
**Fixes:**
- M6: Toggle erhaelt `role="switch"` + `aria-checked` +
  `aria-label="Widget aktivieren"`
- M7: Color-Picker-Inputs erhalten `aria-label` (Farbwahl +
  Hex-Wert) fuer assistive Technologien
- M8: Messages-Container wechselt auf `role="log"` +
  `aria-live="polite"` + `aria-label="Konversationsverlauf"`.
  `role="article"` von einzelnen Bubbles entfernt.

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
- **Status: ERLEDIGT** — im selben Commit `763fa69` wie M1
  mitgefixt (lead.findFirst + conversation.findFirst mit tenantId).

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

---

## Fix-Planung High #1: Fallback-Message-Persistierung (Pre-Analyse H.1)

### Ist-Zustand

**Claude-Fehler-Pfad (`processMessage.ts:433-448`):**
```typescript
// Claude fehlgeschlagen → Fallback-Nachricht (NICHT persistiert)
if (!claudeResult || !claudeResult.success || !claudeResult.reply) {
  console.error("[processMessage] Claude fehlgeschlagen nach allen Retries", {
    conversationId,
    error: claudeResult?.error ?? "Timeout oder null",
  });

  return {
    success: false,
    conversationId,
    responses: [RETRY_FALLBACK_MESSAGE],
    conversationStatus: "ACTIVE",
    needsConsent: false,
    error: claudeResult?.error ?? "Claude nicht erreichbar",
  };
}
```

Die Fallback-Message wird in `responses[]` zurueckgegeben, aber
NICHT via `saveMessage()` in die DB geschrieben.

**Aeusserer Catch-Block (`processMessage.ts:479-496`):**
```typescript
} catch (error) {
  return {
    success: false,
    conversationId,
    responses: [],     // LEER — kein Fallback
    conversationStatus: "ACTIVE",
    needsConsent: false,
    error: errorMessage,
  };
}
```

Im aeusseren Catch werden sogar `responses: []` zurueckgegeben —
gar keine Fallback-Message.

### Happy-Path-Pattern (Referenz)

**Erfolgreiche Bot-Antwort (`processMessage.ts:450-451`):**
```typescript
// Bot-Antwort persistieren VOR Transport (Entscheidung 3)
await saveMessage(conversationId, "ASSISTANT", claudeResult.reply);
```

`saveMessage()` (`processMessage.ts:132-145`):
```typescript
async function saveMessage(
  conversationId: string,
  role: MessageRole,
  content: string
) {
  return db.message.create({
    data: {
      conversationId,
      role,
      contentEncrypted: encryptText(content),
      messageType: "TEXT",
    },
  });
}
```

Verschluesselung via `encryptText()` ist integriert — jede
Message die via `saveMessage()` geht, wird automatisch
verschluesselt.

### Poll-Endpoint-Abhaengigkeit

`poll/route.ts:130-145` liest ausschliesslich aus der DB:
```typescript
const rawMessages = await db.message.findMany({
  where: { conversationId: conversation.id, ... },
  orderBy: { timestamp: "asc" },
});
const messages = rawMessages.map((m) => ({
  content: decryptText(m.contentEncrypted),
  ...
}));
```

Kein In-Memory-Cache. Nur persistierte Messages werden
ausgeliefert. Eine nicht-persistierte Fallback-Message ist
fuer Web-Widget-User unsichtbar.

### WhatsApp-Vergleich

**WhatsApp-Handler (`handler.ts:507`):**
```typescript
await sendMessage(message.from, RETRY_FALLBACK_MESSAGE, message.phoneNumberId);
```

WhatsApp schickt die Fallback direkt per Transport (Cloud API).
Auch hier: keine `saveMessage()`-Persistierung. Fuer WhatsApp
ist das akzeptabel (User sieht die Nachricht im Chat-Transport).
Fuer Web-Widget fatal (Polling liest nur DB).

**Beide Pfade haben denselben Persistierungs-Mangel**, aber
nur beim Web-Widget fuehrt es zu einem sichtbaren Bug.

### Verschluesselungs-Kontext

`saveMessage()` ruft intern `encryptText(content)` auf
(Zeile 141). Wenn wir `saveMessage(conversationId, "ASSISTANT",
RETRY_FALLBACK_MESSAGE)` ergaenzen, wird die Fallback-Message
automatisch verschluesselt. Keine separate Verschluesselungs-
Logik noetig.

### Audit-Log-Kontext

Aktuell wird im Fehler-Fall KEIN `auditLog()` geschrieben.
Nur im Erfolgsfall:
```typescript
auditLog("bot.reply_sent", { tenantId, details: { conversationId, channel } });
```

Die Action `bot.reply_failed` existiert in der AuditAction-Union
(audit-log.ts:25), wird aber nirgendwo aufgerufen.

**Empfehlung:** Zusaetzlich zum `saveMessage()`-Fix ein
`auditLog("bot.reply_failed", ...)` im Fehler-Block ergaenzen.
Das ist optional (nicht Teil des High-Befunds), aber sinnvoll.

### Scope-Antworten

**Frage 1 (Kanal-agnostisch):** Ja. `saveMessage()` ist kanal-
agnostisch — es schreibt nur `conversationId`, `role`, `content`.
Der Fix passiert VOR dem `return` im Claude-Fehler-Block, der
fuer beide Kanaele identisch ist. WhatsApp-Regression-Risiko:
keins, weil WhatsApp die Fallback zusaetzlich per Transport
sendet (das aendert sich nicht).

**Frage 2 (Fallback-Text):** Ja, `RETRY_FALLBACK_MESSAGE`
existiert bereits (Zeile 53-56). Der Text muss NICHT neu
eingefuehrt werden. Er muss nur zusaetzlich persistiert werden.

**Frage 3 (Aufwand):** **Klein (~15 Min).** Eine Zeile
`await saveMessage(...)` im Claude-Fehler-Block. Plus optional
eine Zeile `auditLog("bot.reply_failed", ...)`. Kein
Strukturumbau noetig.

### Fix-Plan

**1 Datei, 2 Aenderungen:**

`src/lib/bot/processMessage.ts`:

**Aenderung 1 (Zeile ~434, VOR dem return):**
```typescript
await saveMessage(conversationId, "ASSISTANT", RETRY_FALLBACK_MESSAGE);
```
Platzierung: nach dem `console.error`, vor dem `return`.

**Aenderung 2 (optional, Zeile ~435):**
```typescript
auditLog("bot.reply_failed", {
  tenantId,
  details: { conversationId, channel, error: claudeResult?.error },
});
```

**Aeusserer Catch-Block (Zeile 479-496):**
Hier ebenfalls `saveMessage` mit Fallback ergaenzen, damit
auch bei unerwarteten Fehlern (DB-Timeout waehrend Claude-Call,
etc.) der User eine Rueckmeldung bekommt.

### Regression-Risiko

**Niedrig.** `saveMessage()` ist derselbe Pfad wie im Happy-Path.
Einziges Risiko: wenn `saveMessage()` selbst fehlschlaegt (DB
nicht erreichbar), wuerde der Catch-Block erneut ausgeloest.
Das ist aber ohnehin der Fall — ein doppelter DB-Fehler aendert
das Verhalten nicht.

### Test-Strategie fuer H.3

Claude-Fehler lokal simulieren: `ANTHROPIC_API_KEY` in
`.env.local` temporaer auf einen falschen Wert setzen (z.B.
`sk-invalid-key-for-testing`). Dann:
1. Session erstellen
2. Message senden
3. 5 Sekunden warten (Retry-Timeout)
4. Poll: Fallback-Message muss als ASSISTANT-Message erscheinen
5. `.env.local` wieder korrigieren

---

## Fix-Verification H.3: Lokaler Test mit simuliertem Claude-Fehler

### Setup
- Branch: `fix/bot-fallback-persistence` (Commit `4e05e8c`)
- Build: gruen (mit `ANTHROPIC_API_KEY=sk-invalid-for-testing`)
- Server: `npx next start -p 3100`

### Test-Ergebnisse

| Test | Ergebnis |
|---|---|
| Session-Erstellung | 200, Token + ConvID |
| Message senden | 202 Accepted |
| Poll nach 15s (Retry-Timeout) | 2 Messages |
| Message 1 | role: `user`, content: "Test bei kaputtem Claude" |
| Message 2 | role: `assistant`, content: "Entschuldigung, ich hatte gerade einen kurzen technischen Haenger..." |
| Fallback-Message im Poll | **PASS** |
| ANTHROPIC_API_KEY restored | **Ja** (verifiziert: kein "invalid" im Key) |

### Kern-Ergebnis

Die Fallback-Message wird jetzt korrekt in der DB persistiert und
vom Poll-Endpoint an den Web-Widget-User ausgeliefert. Der Claude-
Fehler-Pfad funktioniert wie geplant:
1. User-Message wird gespeichert (Zeile 389, unveraendert)
2. Claude schlaegt fehl (alle Retries erschoepft)
3. **NEU:** Fallback wird via `saveMessage()` persistiert
4. Poll liefert USER + ASSISTANT Messages

### Gesamturteil

**GO fuer H.4 (Merge + Deploy).**

---

## Fix-Planung Medium M3: Top-Level Error-Handler (Pre-Analyse H.1)

### Ist-Zustand pro Route

| Route | Handler | try/catch vorhanden | Scope des try/catch |
|---|---|---|---|
| config (GET) | `GET()` | Nein | — |
| session (POST) | `POST()` | Teilweise | Nur `request.json()` (Zeile 97-103) |
| message (POST) | `POST()` | Teilweise | Nur `request.json()` (Zeile 73-79) |
| poll (GET) | `GET()` | Nein | — |

Keiner der Handler hat einen top-level try/catch der den
gesamten Funktionskoerper umschliesst. Bei unerwarteten Fehlern
(DB-Timeout, Redis-Ausfall, `decryptText`-Fehler in poll,
`resolvePublicKey`-Crash in config/session) laeuft die Exception
ungefangen durch und Next.js erzeugt einen Default-500-Response,
der in Dev-Mode Stack-Traces enthalten kann.

### Bestehende Error-Response-Pattern

Alle 4 Routes verwenden konsistentes JSON-Format:
```
{ error: "Fehlerbeschreibung auf Deutsch" }
```
Optionales `details`-Feld bei Zod-Fehlern:
```
{ error: "Ungueltige Eingabe", details: result.error.flatten() }
```

Kein shared Error-Handler (`handleApiError` o.ae.) existiert im
Projekt.

### Options-Bewertung

**Option A — Inline try/catch pro Route:**
- Pro: Minimal-invasiv, kein neuer Import, jeder Handler bleibt
  eigenstaendig lesbar
- Con: 4× identischer Catch-Block (6-8 Zeilen je Route)
- Aufwand: S (~20 Min)

**Option B — Shared Error-Handler-Wrapper:**
- Pro: DRY, zentraler Error-Logging-Punkt
- Con: Neuer Import, neuer File, Wrapper-Indirection erschwert
  Stack-Trace-Zuordnung, ueberdimensioniert fuer 4 Dateien
- Aufwand: S (~25 Min)

**Option C — Next.js error.tsx:**
- Pro: Framework-nativ
- Con: Funktioniert NUR fuer Page-Routes, NICHT fuer API-Routes
- **Disqualifiziert** fuer diesen Use-Case

### Empfehlung: Option A (Inline try/catch)

Begruendung: 4 identische 6-Zeilen-Bloecke sind akzeptabler
Boilerplate fuer eine Pre-Pilot-Phase. Ein Shared-Wrapper lohnt
sich erst ab 8+ Endpoints oder wenn Error-Reporting (Sentry)
dazukommt. Der CORS-Duplication-Befund (L2) waere ein besserer
Kandidat fuer eine shared Utility als der Error-Handler.

### Fix-Plan

Pro Route-Handler: den gesamten Funktionskoerper (nach den CORS-
Preflight-Returns) in try/catch wrappen:

```typescript
export async function GET/POST(request: NextRequest): Promise<NextResponse> {
  // ... bestehender Code ...

  try {
    // ... gesamter Handler-Body (nach CORS-Preflight) ...
  } catch (error) {
    console.error("[widget/ROUTE] Unerwarteter Fehler", error);
    return withCors(
      NextResponse.json(
        { error: "Interner Fehler" },
        { status: 500 },
      ),
    );
  }
}
```

**Wichtig:** Der try/catch muss NACH den spezifischen Fehler-
Returns (Zod, Rate-Limit, Auth) kommen — oder den gesamten Body
wrappen, wobei die spezifischen Returns innerhalb des try-Blocks
via `return` rausspringen. Die spezifischen Fehler-Responses
(400, 401, 429) bleiben unveraendert — sie werden VOR dem catch
via return beendet.

### Betroffene Dateien

1. `src/app/api/widget/config/route.ts` — GET Handler
2. `src/app/api/widget/session/route.ts` — POST Handler
3. `src/app/api/widget/message/route.ts` — POST Handler
4. `src/app/api/widget/poll/route.ts` — GET Handler

### Regression-Risiko

**Niedrig.** Bestehende return-Pfade (Zod-400, Rate-Limit-429,
Auth-401) bleiben exakt gleich. Der try/catch umschliesst den
gesamten Body und faengt nur Exceptions ab, die bisher ungefangen
durchliefen. Kein bestehendes Verhalten aendert sich.

### Test-Strategie

DB-Timeout lokal simulieren: `DATABASE_URL` auf nicht-existierenden
Host setzen, Session/Config-Request senden → muss `{ error:
"Interner Fehler" }` mit Status 500 liefern statt Stack-Trace.
Alternativ: einfach nach dem Build pruefen, dass normale Requests
weiterhin die erwarteten Responses liefern (Regressions-Test).
