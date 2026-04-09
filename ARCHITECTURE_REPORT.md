# ARCHITECTURE_REPORT.md — Web-Widget Pre-Analyse (Phase 0)

Erstellt: 2026-04-09
Basis: WEB_WIDGET_INTEGRATION.md.txt, Codebase-Stand commit `debe389`

---

## 0. Test-Modus-Ist-Zustand

`/test/[slug]` ruft die Bot-Logik NICHT ueber `processMessage` oder `handleIncomingMessage` auf.

**Aktueller Ablauf:**
1. `src/app/test/[slug]/page.tsx` (Server-Component) laedt den Tenant via `db.tenant.findUnique({ where: { slug, isActive: true } })` und gibt `tenantId` + `tenantName` an die Client-Component.
2. `src/app/test/[slug]/WebTestClient.tsx` (Client-Component) ruft `POST /api/bot-preview` auf (Zeile 39 und 75).
3. `/api/bot-preview/route.ts` erfordert `getDashboardTenant()` (Zeile 25) — d.h. der Aufruf funktioniert NUR wenn der Benutzer gleichzeitig im Dashboard eingeloggt ist.

**Toter Code:** `src/lib/test-mode.ts` exportiert `sendTestMessage()` mit In-Memory-Session-Store. Diese Funktion wird von keinem Endpoint importiert oder aufgerufen. Sie ist faktisch Dead Code.

**Wiederverwendbarkeit fuer Phase 1:**
- `loadSystemPrompt()` aus `src/modules/bot/system-prompts/index.ts` (Zeile 224) ist vollstaendig kanal-agnostisch und direkt wiederverwendbar.
- `generateReply()` aus `src/modules/bot/claude.ts` (Zeile 74) ist vollstaendig kanal-agnostisch.
- `scoreLeadFromConversation()` aus `src/modules/bot/gpt.ts` (Zeile 66) ist vollstaendig kanal-agnostisch.
- Das In-Memory-Session-Management aus `test-mode.ts` ist NICHT wiederverwendbar fuer das Widget (Widget braucht DB-Persistenz).

---

## 1. Bot-Handler-Abstraktion

### 1a. WhatsApp-spezifischer Code

**`src/modules/bot/handler.ts`** — Haupt-Handler:
| Zeile | Code | WhatsApp-spezifisch weil |
|-------|------|--------------------------|
| 10-12 | `import { getTenantByPhoneId }` | Tenant-Lookup ueber WhatsApp Phone Number ID |
| 16 | `import { sendMessage }` from whatsapp/client | WhatsApp Cloud API Nachrichtenversand |
| 69-75 | `hashPhoneNumber()` | SHA-256-Hash der Telefonnummer als externalId |
| 82-88 | `IncomingMessage` Interface | Felder `phoneNumberId`, `from`, `messageId` sind WhatsApp-Payload-Felder |
| 330 | `getTenantByPhoneId(message.phoneNumberId)` | Tenant-Aufloesung ueber WA Phone ID |
| 336 | `hashPhoneNumber(message.from)` | Phone → externalId Transformation |
| 349-358 | QR/Campaign-Parsing aus `message.text` (`qr:xxx`, `campaign:xxx`) | WhatsApp-spezifisches Deep-Link-Format |
| 377 | `sendMessage(message.from, CONSENT_MESSAGE, message.phoneNumberId)` | WA Consent-Versand |
| 408-413 | `sendMessage(...)` fuer STOP-Bestaetigung | WA STOP-Antwort |
| 470 | `sendMessage(...)` fuer Fallback | WA Fehler-Fallback |
| 480-483 | `sendMessage(...)` fuer Claude-Antwort | WA Antwort-Versand |

**`src/app/api/webhook/whatsapp/route.ts`** — Komplett WhatsApp-spezifisch:
| Zeile | Code | WhatsApp-spezifisch weil |
|-------|------|--------------------------|
| 2 | `createHmac` Import | X-Hub-Signature-256 Validierung |
| 16-17 | `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | Meta Webhook-Konfiguration |
| 21-43 | `isDuplicate()` | WhatsApp-Message-ID Deduplizierung |
| 46-55 | `verifySignature()` | Meta HMAC-Signatur-Check |
| 58-75 | `GET` Handler | Meta Webhook-Verifizierung (`hub.mode`, `hub.verify_token`, `hub.challenge`) |
| 78-109 | TypeScript Interfaces | WhatsApp Cloud API Payload-Struktur |
| 112-206 | `POST` Handler | WhatsApp-Payload-Parsing, Message-Extraktion, fire-and-forget an Handler |

**Kanal-agnostischer Kern** (wiederverwendbar ohne Aenderung):
- `src/modules/bot/claude.ts` — komplett kanal-agnostisch
- `src/modules/bot/gpt.ts` — komplett kanal-agnostisch
- `src/modules/bot/handler.ts` Zeilen 115-156 — `loadConversationHistory()`, `formatConversationForScoring()`, `saveMessage()`
- `src/modules/bot/handler.ts` Zeilen 160-308 — `runScoringPipeline()` (ausser HubSpot-Push, der kanal-agnostisch ist)

### 1b. System-Prompt-Inventar

**WhatsApp-spezifische Strings (woertliche Zitate):**

| Datei | Zeile | Zitat |
|-------|-------|-------|
| `starter.ts` | 20 | `"Du arbeitest ausschliesslich ueber WhatsApp und bist spezialisiert auf [BRANCHE]."` |
| `starter.ts` | 35 | `"Keine Bullet-Points in WhatsApp-Nachrichten"` |
| `growth.ts` | 15 | `"Du arbeitest ausschliesslich ueber WhatsApp und bist spezialisiert auf [BRANCHE]."` |
| `growth.ts` | 30 | `"Keine Bullet-Points in WhatsApp-Nachrichten"` |
| `growth.ts` | 290 | `"Du arbeitest ausschliesslich ueber WhatsApp und bist spezialisiert auf Immobilien in [REGION]."` |
| `growth.ts` | 305 | `"Keine Bullet-Points in WhatsApp-Nachrichten"` |
| `professional.ts` | 11 | `"Du arbeitest ausschliesslich ueber WhatsApp und bist spezialisiert auf [BRANCHE]."` |
| `professional.ts` | 26 | `"Keine Bullet-Points in WhatsApp-Nachrichten"` |

Kein Match fuer: "Telefonnummer", "Nachricht an dich", "per WhatsApp".

**Strategie-Empfehlung: Channel-Parameter im Prompt** (nicht separate Varianten).

Begruendung:
1. Es gibt 4 Prompt-Dateien × 2 betroffene Zeilen = 8 Stellen. Bei separaten Varianten wuerden 4 zusaetzliche Prompt-Dateien entstehen — Wartungsaufwand verdoppelt sich.
2. Die WhatsApp-spezifischen Strings sind reine Kanal-Beschreibungen ("ueber WhatsApp"), keine Logik-Unterschiede. Ersetzung durch `"Du arbeitest ueber [KANAL]"` ist semantisch aequivalent.
3. "Keine Bullet-Points in WhatsApp-Nachrichten" ist auch fuer Web sinnvoll (kurze Chat-Nachrichten). Aenderung zu "Keine Bullet-Points in Chat-Nachrichten" ist kanal-neutral.
4. `fillTemplate()` (Zeile 29, index.ts) unterstuetzt bereits beliebige `[KEY]`-Platzhalter — ein `[KANAL]`-Platzhalter erfordert null Code-Aenderung in der Template-Engine.

### 1c. processMessage-Signatur

Basierend auf dem tatsaechlichen Code in `handler.ts` (Zeilen 325-523):

```typescript
// Empfohlene Signatur fuer Extraktion
export async function processMessage(input: {
  tenantId: string;
  channel: "WHATSAPP" | "WEB";
  conversationId: string;
  senderIdentifier: string; // WhatsApp: phoneHash, Web: sessionId
  message: string;
  isNewConversation: boolean;
  consentGiven: boolean;
}): Promise<{
  success: boolean;
  conversationId: string;
  responses: string[];          // Bot-Antworten (kann mehrere sein: Consent + Greeting)
  conversationStatus: "ACTIVE" | "CLOSED";
  needsConsent: boolean;        // Frontend muss Consent-UI zeigen
  error?: string;
}>
```

**Begruendung der Abweichung von der Spec:**
- `isNewConversation` und `consentGiven`: Der Handler entscheidet basierend auf diesen Flags ob Consent angefordert, STOP verarbeitet oder normal geantwortet wird (Zeilen 376-438). Diese Logik gehoert in processMessage, nicht in den Caller.
- `responses: string[]` statt `response: string`: Bei neuen Conversations sendet der Handler erst CONSENT_MESSAGE, dann wartet er auf die naechste Nachricht. Das Widget braucht beide Zustaende.
- `needsConsent`: Das Widget-Frontend muss wissen ob es einen DSGVO-Consent-Dialog zeigen soll — Information die der WhatsApp-Flow implizit ueber das Conversation-Window loest.

**Side-Effects die in processMessage bleiben:**
- `db.message.create()` — verschluesselte Speicherung (Zeile 148)
- `db.conversation.update()` — Consent/Status-Updates (Zeilen 403, 432)
- `db.lead.upsert()` — Lead-Scoring-Ergebnis (Zeile 235)
- `auditLog()` — Compliance-Pflicht (Zeilen 385, 389, 421, 496)
- `runScoringPipeline()` — async, non-blocking (Zeile 507)

**Side-Effects die NICHT in processMessage gehoeren:**
- `sendMessage()` (WhatsApp) — Transport-Schicht, Caller-Verantwortung
- `getTenantByPhoneId()` — Tenant-Resolution, Caller-Verantwortung
- `hashPhoneNumber()` — Identifier-Generierung, Caller-Verantwortung

**Imports die processMessage braucht:**
- `db` aus `@/shared/db`
- `encryptText`, `decryptText` aus `@/modules/encryption/aes`
- `generateReply` aus `./claude`
- `scoreLeadFromConversation` aus `./gpt`
- `auditLog` aus `@/modules/compliance/audit-log`
- `loadSystemPrompt` aus `./system-prompts`
- `notifyHighScoreLead` aus `@/modules/crm/lead-notification`
- `pushLeadToHubSpot` aus `@/modules/crm/hubspot`

### 1d. Persistenz-Semantik der Bot-Antwort

Aktueller Handler (handler.ts, Zeile 480-500):
Bot-Antwort wird erst via sendMessage() an WhatsApp gesendet, dann als
ASSISTANT-Message persistiert. Bei Transport-Fehler: keine Persistenz.

Fuer processMessage() gilt folgende Festlegung:
- processMessage() persistiert BEIDE Seiten (User-Message und Bot-Response)
  UNABHAENGIG vom Transport-Erfolg.
- Transport (sendMessage fuer WhatsApp, Polling-DB-Lookup fuer Web) erfolgt
  NACH Persistenz im Caller.
- Transport-Fehler werden im Caller geloggt, nicht in processMessage.

Begruendung:
- Symmetrisch ueber Kanaele (Web-Polling braucht DB-Persistenz zwingend).
- Robuster gegen WhatsApp-Transport-Ausfaelle — Lead-Score bleibt korrekt.
- Debugging-freundlicher — jede Bot-Antwort ist in der DB auffindbar.

Semantik-Aenderung ggue. Ist-Zustand:
Bei WhatsApp-Transport-Fehler steht die Bot-Message jetzt in der DB,
obwohl der User sie nie gesehen hat. Vertretbar, weil Lead-Score korrekt
bleibt und Re-Send-Strategien moeglich werden.

---

## 2. Schema-Pruefung

### 2a. Conversation-Model

```prisma
model Conversation {
  id             String             @id @default(cuid())
  tenantId       String
  externalId     String             // WhatsApp Chat-ID (gehashed fuer DSGVO)
  consentGiven   Boolean            @default(false)
  consentAt      DateTime?
  language       String             @default("de")
  campaignSlug   String?
  leadSource     String?            // "qr", "link", "organic"
  status         ConversationStatus @default(ACTIVE)
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  tenant         Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  messages       Message[]
  lead           Lead?

  @@unique([tenantId, externalId])
  @@index([tenantId, status])
  @@index([tenantId, createdAt])
  @@map("conversations")
}
```

### 2b. Message-Model

```prisma
model Message {
  id               String      @id @default(cuid())
  conversationId   String
  role             MessageRole
  contentEncrypted String      @db.Text
  messageType      MessageType @default(TEXT)
  timestamp        DateTime    @default(now())

  conversation     Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, timestamp])
  @@map("messages")
}
```

### 2c. Tenant-Model (relevante Felder)

```prisma
model Tenant {
  id               String         @id @default(cuid())
  name             String
  slug             String         @unique
  whatsappPhoneId  String         @unique
  systemPrompt     String         @db.Text
  brandName        String
  brandColor       String         @default("#000000")
  retentionDays    Int            @default(90)
  dashboardToken   String?        @unique
  dashboardTokenExpiresAt DateTime?
  dpaAcceptedAt    DateTime?
  isActive         Boolean        @default(true)
  paddlePlan       String?
  paddleStatus     String?        @default("inactive")
  // ... Relationen
}
```

### 2d. WhatsApp-spezifische Felder

| Feld | Model | WhatsApp-spezifisch | Muss nullable werden? |
|------|-------|---------------------|-----------------------|
| `whatsappPhoneId` | Tenant | Ja — WhatsApp Business Phone Number ID | Nein. Bleibt Pflicht fuer WhatsApp. Neues `webWidgetPublicKey` kommt additiv hinzu. |
| `externalId` | Conversation | Ja — SHA-256-Hash der Telefonnummer | Nein. Fuer Web-Sessions wird `externalId` mit der Session-ID befuellt (gleicher Zweck: opaque Identifier fuer den Sender). |
| `campaignSlug` | Conversation | Teilweise — wird aus WhatsApp-Nachrichtentext geparsed (`qr:xxx`) | Nein. Ist bereits nullable. Fuer Web-Widget wird Campaign-Tracking ueber URL-Parameter statt Message-Text geloest. |
| `leadSource` | Conversation | Nein — generisches Feld | Nein. Web-Sessions setzen `leadSource: "web"`. |

**Fazit:** Keine bestehenden Felder muessen nullable werden. Das Schema ist additiv erweiterbar.

### 2e. Dashboard-Query-Inventar

Alle Dashboard-Queries die `externalId` lesen:

| Datei | Zeile | Verwendung | Kritikalitaet |
|-------|-------|-----------|---------------|
| `api/dashboard/conversations/route.ts` | 79 | `externalId: c.externalId` — Ausgabe an Frontend | Unkritisch: `maskId()` im Frontend hat Fallback fuer kurze Strings |
| `api/dashboard/conversations/[id]/route.ts` | 79 | `externalId: conversation.externalId` | Unkritisch: reine Anzeige |
| `api/dashboard/leads/route.ts` | 31 | `select: { externalId: true }` | Unkritisch: reine Anzeige |
| `api/dashboard/leads/[id]/route.ts` | 42, 94 | `externalId: true`, Ausgabe | Unkritisch: reine Anzeige |
| `api/dashboard/stats/route.ts` | 137 | `externalId: c.externalId` | Unkritisch: reine Anzeige |
| `api/dashboard/export/route.ts` | 71, 103 | Export-Feld | Unkritisch: optionales Feld im Export |
| `api/dashboard/clients/[id]/route.ts` | 34 | `conversation: { select: { externalId: true } }` | Unkritisch: reine Anzeige |
| `dashboard/page.tsx` | 79-81, 636 | `maskId(conv.externalId)` — Frontend-Anzeige | Unkritisch: `maskId` handelt kurze Strings ("•••••") |
| `dashboard/crm/page.tsx` | 178-180, 403, 573 | `maskId()` Aufrufe | Unkritisch: gleicher Fallback |
| `dashboard/conversations/[id]/page.tsx` | 80-82, 164 | `maskId()` Aufruf | Unkritisch: gleicher Fallback |
| `dashboard/clients/[id]/page.tsx` | 22 | TypeScript-Interface `externalId: string` | Unkritisch: Anzeige |

**Ergebnis:** Keine Query verwendet `externalId` als WHERE-Bedingung oder JOIN-Key (ausser dem Composite Unique `[tenantId, externalId]` der nur im Handler genutzt wird). Alle Verwendungen sind reine Ausgabe-Felder. Kein Dashboard-View bricht bei Web-Sessions.

### 2f. Migration-Plan (additiv, kein Drop/Rename)

```prisma
// Tenant-Erweiterung
webWidgetEnabled    Boolean  @default(false)
webWidgetPublicKey  String?  @unique
webWidgetConfig     Json?    // { primaryColor, logoUrl, welcomeMessage }

// Conversation-Erweiterung
channel  Channel  @default(WHATSAPP)

// Neuer Enum
enum Channel {
  WHATSAPP
  WEB
}

// Neuer Index
@@index([tenantId, channel])  // auf Conversation
```

**Risikobewertung:** Alle Aenderungen sind additiv. `channel @default(WHATSAPP)` setzt den Default fuer alle bestehenden Rows. Kein bestehender Query wird gebrochen.

### 2g. Session-vs-Conversation-Modell im Web-Kanal

Festlegung fuer v1.0: Modell A — Session = Conversation.

Jeder Web-Widget-Besuch startet eine neue Conversation. Wiederkehrende
Besucher werden nicht wiedererkannt, Lead-Score startet bei Null.

Begruendung:
- Einfachstes Modell, keine Browser-Storage-Abhaengigkeit.
- Konsistent mit WhatsApp-Flow (jeder Phone-Hash = eine Conversation).
- Keine Cookies oder localStorage noetig, DSGVO-freundlich.

externalId-Befuellung: kryptographisch zufaellige Session-ID
(`crypto.randomBytes(16).toString('base64url')`). Composite Unique
`[tenantId, externalId]` bleibt gewahrt.

Modell B (Session ≠ Conversation, akkumulierender Score ueber Besuche)
ist v1.1-Kandidat, wenn Daten mehrtaegige Web-Dialoge als relevant zeigen.

---

## 3. Rate-Limiting

### 3a. Ist-Zustand

**Library:** `@upstash/ratelimit` mit `@upstash/redis` (Sliding Window)
**Datei:** `src/shared/rate-limit.ts`
**Fallback:** In-Memory `Map` wenn `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` fehlen

**Aktuelle Keys und Limits (aus dem Code):**

| Key-Prefix | Limit | Datei | Zeile |
|------------|-------|-------|-------|
| `webhook:{ip}` | 100/60s | `api/webhook/whatsapp/route.ts` | 115 |
| `bot-preview:{ip}` | 10/60s | `api/bot-preview/route.ts` | 32 |
| `onboarding-create:{ip}` | 3/3600s | `api/onboarding/route.ts` | 43 |
| `admin-login:{ip}` | 5/300s | `api/admin/login/route.ts` | (aus Auth-Modul) |

**Separate Funktion:** `checkLimit()` in `src/lib/plan-limits.ts` (Zeile 23) — KEIN Redis, DB-Count bei jedem Call. Unterstuetzte Resources: `campaigns`, `broadcasts`, `leads`. Kein `web_widget` Resource-Typ.

### 3b. Tech-Debt-Abgleich

**Frage:** Wird `checkLimit()` ohne Redis-Cache zum Problem fuer das Web-Widget?

**Antwort: Nein** fuer v1.0.

Begruendung:
- `checkLimit()` wird NUR bei Create-Operationen aufgerufen (Campaigns, Broadcasts). Es wird NICHT bei jedem API-Call aufgerufen.
- Widget-Config/Session/Message/Poll-Endpoints verwenden `checkRateLimit()` (Redis-basiert), nicht `checkLimit()`.
- Der einzige Beruehrungspunkt: wenn `web_widget` als Plan-Feature gegated wird, wird `checkLimit()` einmalig beim Aktivieren im Dashboard aufgerufen — nicht bei jedem Widget-Request.
- **Empfehlung:** Akzeptiertes Risiko fuer v1.0. Redis-Cache fuer `checkLimit()` ist ein separates Optimierungs-Ticket.

### 3c. Web-Erweiterung

Strategie auf Basis der bestehenden `checkRateLimit()` Library:

| Endpoint | Key-Schema | Limit | Begruendung |
|----------|-----------|-------|-------------|
| `GET /api/widget/config` | `widget-config:{ip}` | 100/3600s | Oeffentlich, IP-basiert, gemaess Spec |
| `POST /api/widget/session` | `widget-session:{ip}` | 10/3600s | Streng, verhindert Session-Flooding |
| `POST /api/widget/message` | `widget-msg:{sessionToken}` | 60/3600s | Pro Session, nicht pro IP |
| `GET /api/widget/poll` | `widget-poll:{sessionToken}` | 1/1s (= 3600/3600s) | 1 Request/Sekunde/Session |

Alle Keys nutzen die bestehende `checkRateLimit()` Funktion. Kein neuer Code noetig in `rate-limit.ts`. Nur neue Aufrufe in den Endpoint-Handlern.

---

## 4. Tenant-Identifikation im Web-Kanal

### 4a. Test-Modus-Identifikation

`/test/[slug]/page.tsx` Zeile 17-19:
```typescript
const tenant = await db.tenant.findUnique({
  where: { slug, isActive: true },
  select: { id: true, brandName: true, name: true },
});
```

Der Slug wird aus dem URL-Pfad extrahiert (`params.slug`). Bei nicht-gefundenem oder inaktivem Tenant → `notFound()`.

**Problem fuer Widget:** Der Slug ist der interne Admin-Name und nicht rotierbar. Das Widget verwendet stattdessen `webWidgetPublicKey` (Format: `pub_${nanoid(16)}`), der rotierbar und vom Slug entkoppelt ist.

### 4b. Migrations-Skript-Skelett

```typescript
// src/scripts/generate-widget-keys.ts (SKELETT — NICHT AUSFUEHREN)
import { db } from "@/shared/db";
import { nanoid } from "nanoid"; // oder crypto.randomBytes

async function main() {
  const tenants = await db.tenant.findMany({
    where: { webWidgetPublicKey: null },
    select: { id: true },
  });

  for (const tenant of tenants) {
    const publicKey = `pub_${nanoid(16)}`;
    await db.tenant.update({
      where: { id: tenant.id },
      data: { webWidgetPublicKey: publicKey },
    });
    console.log(`Tenant ${tenant.id}: ${publicKey}`);
  }

  console.log(`${tenants.length} Keys generiert.`);
}

main();
```

**Abhaengigkeit:** `nanoid` muss als Dependency hinzugefuegt werden, ODER `crypto.randomBytes(12).toString('base64url')` als zero-dependency Alternative.

### 4c. Rotation-Flow

1. Tenant generiert im Dashboard neuen `webWidgetPublicKey`.
2. Alter Key wird sofort ungueltig (`UPDATE tenants SET "webWidgetPublicKey" = $new WHERE id = $id`).
3. Bestehende Web-Conversations sind NICHT betroffen — sie referenzieren `tenantId` (CUID), nicht den Public Key. Der Public Key wird nur fuer die initiale Tenant-Aufloesung verwendet.
4. Aktive Widget-Sessions auf Kundenseiten erhalten beim naechsten Poll einen 401 → Frontend zeigt "Session abgelaufen, bitte Seite neu laden."
5. Nach Seiten-Reload laedt das Embed-Script den neuen Key aus dem `data-tenant`-Attribut — der Kunde muss das Script-Tag im HTML aktualisieren.

**Risiko:** Zwischen Rotation und HTML-Update sind bestehende Widgets tot. Das ist gewollt bei kompromittierten Keys.

---

## 5. Feature-Flag-Strategie fuer Phase 1

**Env-Variable:** `ENABLE_PROCESS_MESSAGE_V2=true|false`

**Implementierung im WhatsApp-Webhook:**
```typescript
// In handler.ts oder webhook/whatsapp/route.ts
if (process.env.ENABLE_PROCESS_MESSAGE_V2 === "true") {
  // Neuer Pfad: processMessage()
  const result = await processMessage({ ... });
  if (result.responses.length > 0) {
    await sendMessage(message.from, result.responses[0], message.phoneNumberId);
  }
} else {
  // Alter Pfad: handleIncomingMessage() direkt
  await handleIncomingMessage(message);
}
```

**Fallback:** Bei `false` oder fehlender Variable → alter Pfad. Kein Breaking Change.

**Verifikations-Plan fuer WhatsApp-Regression (manuelle Test-Schritte):**
1. Sende "Hallo" an die WhatsApp-Nummer → Bot antwortet mit DSGVO-Consent-Nachricht
2. Sende zweite Nachricht → Consent wird gesetzt, Bot antwortet inhaltlich
3. Sende 5 Qualifizierungs-Antworten → Bot fuehrt durch Phasen, Lead-Score wird aktualisiert (im Dashboard pruefen)
4. Sende "STOP" → Bot bestaetigt Datenloeschung, Conversation-Status wird CLOSED
5. Sende "qr:test-campaign" als erste Nachricht einer neuen Nummer → campaignSlug und leadSource werden gesetzt
6. Pruefe in `/api/dashboard/conversations` dass alle Conversations mit korrektem externalId, Status und Lead-Score angezeigt werden

---

## 6. One-Way-Door-Risiken

| Aenderung | Reversibilitaet | Begruendung |
|-----------|----------------|-------------|
| Schema-Migration `channel` Enum + Felder | **One-Way** | Prisma-Migrationen sind vorwaerts-gerichtet. Rollback erfordert manuelle SQL-Migration. Default `WHATSAPP` macht die Aenderung aber low-risk. |
| System-Prompt-Aenderung (WhatsApp → Kanal-Variable) | **One-Way (Drift-Risiko)** | Wenn Tenants ihren systemPrompt customized haben und dieser den String "WhatsApp" enthaelt, wird er NICHT automatisch aktualisiert. Nur Default-Prompts aendern sich. Customized Prompts driften auseinander. |
| `webWidgetPublicKey` Generation fuer bestehende Tenants | **Two-Way** | Keys koennen auf NULL zurueckgesetzt werden. Keine Abhaengigkeiten. |
| `processMessage()` Extraktion | **Two-Way** | Feature-Flag erlaubt Rollback auf alten Pfad. Alter Code bleibt erhalten bis Flag entfernt wird. |
| `nanoid` Dependency | **Two-Way** | Kann mit `npm uninstall` entfernt werden. Alternativ: zero-dependency `crypto.randomBytes`. |

**Kritischstes One-Way-Door:** Schema-Migration. Empfehlung: Migration in einer eigenen Session mit explizitem Rollback-SQL-Script bereithalten.

---

## 7. Tech-Debt-Kreuzungen

| Tech-Debt-Punkt | Beruehrt durch Widget? | Empfehlung |
|-----------------|----------------------|------------|
| **templates/route.ts Zod-Validierung** (briefing/openers/abVarianten/ziele) | Nein — Widget nutzt keine Campaign-Templates | Als Risiko akzeptieren |
| **Cleanup-Cron Stufe 4** (findMany statt deleteMany) | Ja — Web-Conversations erhoehen das Datenvolumen das der Cron verarbeitet | Parallel fixen — `deleteMany` statt `findMany` reduziert die Last wenn Web-Sessions das Volumen verdoppeln |
| **checkLimit ohne Redis-Cache** | Nein — Widget-Endpoints nutzen `checkRateLimit` (Redis), nicht `checkLimit` (DB) | Als Risiko akzeptieren |
| **CSP unsafe-inline** | Ja — iframe-Widget benoetigt eigene CSP-Policy. `unsafe-inline` im Parent wuerde das iframe-Sandbox-Modell untergraben | Parallel fixen — Nonce-basierte CSP fuer die Widget-iframe-Route (`/widget/[publicKey]`) |
| **HubSpot fire-and-forget** | Nein — Widget nutzt die gleiche Scoring-Pipeline, HubSpot-Push bleibt unveraendert | Als Risiko akzeptieren |
| **Paddle doppeltes ts=-Parsing** | Nein — Widget hat keine Paddle-Integration | Als Risiko akzeptieren |

---

## 8. Konfidenz & Metadaten

### Konfidenz pro Abschnitt

| Abschnitt | Konfidenz | Begruendung |
|-----------|-----------|-------------|
| 0. Test-Modus | Hoch | Alle 3 Dateien vollstaendig gelesen, Aufrufkette verifiziert |
| 1a. WhatsApp-Code | Hoch | handler.ts und webhook Zeile fuer Zeile analysiert |
| 1b. Prompt-Inventar | Hoch | Alle 5 Prompt-Dateien + grep-Ergebnis verifiziert |
| 1c. processMessage | Mittel | Signatur ist Empfehlung, abhaengig von Implementierungs-Entscheidungen |
| 2a-2c. Schema | Hoch | 1:1 aus schema.prisma kopiert |
| 2d. WA-spezifische Felder | Hoch | Jedes Feld einzeln geprueft |
| 2e. Dashboard-Queries | Hoch | grep ueber alle Dashboard-Dateien, jeder Treffer manuell bewertet |
| 2f. Migration-Plan | Hoch | Additive Aenderungen, kein Breaking Change |
| 3a. Rate-Limiting | Hoch | Library, Keys und Limits direkt aus dem Code |
| 3b-3c. Rate-Limit-Erweiterung | Mittel | Limits sind Empfehlungen, muessen in der Praxis getestet werden |
| 4. Tenant-Identifikation | Hoch | Code und Spec-Abgleich |
| 5. Feature-Flags | Mittel | Strategie basiert auf Empfehlung, nicht auf getesteter Implementierung |
| 6. One-Way-Doors | Hoch | Jede Aenderung einzeln auf Reversibilitaet geprueft |
| 7. Tech-Debt | Hoch | Direkte Kreuzung mit bekannter Liste |

### Gesamt-Konfidenz: HOCH

### Drei wichtigste Risiken

| # | Risiko | Falsifikationskriterium |
|---|--------|------------------------|
| 1 | **System-Prompt-Drift:** Tenants mit customized `systemPrompt` der "WhatsApp" enthaelt werden nicht automatisch aktualisiert → Web-Widget-Benutzer sehen WhatsApp-Referenzen | Abfrage: `SELECT count(*) FROM tenants WHERE "systemPrompt" ILIKE '%whatsapp%'` — wenn > 0, ist das Risiko real |
| 2 | **Test-Modus Dead Code:** `src/lib/test-mode.ts` wird nicht verwendet, `/test/[slug]` funktioniert nur mit Dashboard-Login → oeffentliche Demo-Seite ist faktisch kaputt fuer nicht-eingeloggte Benutzer | Test: Aufruf von `/test/{slug}` in einem nicht-eingeloggten Browser → wenn Bot-Preview 401 zurueckgibt, ist das Risiko bestaetigt |
| 3 | **Cleanup-Cron-Skalierung:** Web-Sessions verdoppeln das Conversation-Volumen. Der Cron nutzt `findMany` statt `deleteMany` (Tech-Debt #2) und wird bei verdoppeltem Volumen langsamer | Monitoring: Cron-Laufzeit vor und nach Widget-Launch messen. Wenn > 30s, ist Optimierung noetig |

### Reversibilitaets-Check pro Phase

| Phase | Beschreibung | Reversibilitaet |
|-------|-------------|-----------------|
| Phase 1 | processMessage-Extraktion | **Two-Way** — Feature-Flag, alter Code bleibt |
| Phase 2 | Schema-Migration | **One-Way** — Rollback nur mit manueller SQL-Migration |
| Phase 3 | Widget-API-Endpoints | **Two-Way** — Dateien loeschen reicht |
| Phase 4 | iframe-Chat-UI | **Two-Way** — Dateien loeschen reicht |
| Phase 5 | Embed-Script | **Two-Way** — Separates Sub-Projekt, unabhaengig |
| Phase 6 | Dashboard-Integration | **Two-Way** — Aenderungen an bestehenden Views sind revertierbar |
| Phase 7 | Testing | **Two-Way** — Keine Code-Aenderungen |
