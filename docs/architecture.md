# Architektur-Übersicht — AI Conversion

> **Zweck:** Die 10-Minuten-Antwort auf "Wie funktioniert das System
> grob?". Lebendes Dokument — wird bei jeder System-Änderung
> aktualisiert (siehe CLAUDE.md Regel 1).
>
> **Letzte Aktualisierung:** 2026-04-12
> **Stand des Codes:** Commit `8b2ccf1` (nach Phase 4c + Phase 5-Pre
> Hotfix + CLAUDE.md-Härtung)

---

## 1. Was ist AI Conversion?

AI Conversion ist ein **Multi-Tenant SaaS** zur automatischen
Lead-Qualifizierung und Verkaufsvorbereitung. Jeder Tenant bekommt
einen eigenen KI-Verkaufsassistenten, der Besucher über mehrere
Kanäle qualifiziert, Lead-Scores vergibt und heiße Leads ans
Vertriebs-CRM übergibt. Die Plattform ist DSGVO-konform (Hosting
in Frankfurt, Consent-Tracking, AES-256-GCM-Verschlüsselung der
Nachrichteninhalte, Audit-Log für sensitive Operationen).

Seit dem 11. April 2026 läuft zusätzlich zum bestehenden
WhatsApp-Kanal ein zweiter Kanal: ein einbettbares Web-Widget
für Kunden-Websites. Beide Kanäle nutzen **dieselbe Bot-Logik**,
dasselbe CRM und dasselbe Lead-Scoring.

---

## 2. Die großen Komponenten

### Web-Frontend (Next.js 15 App Router, React 19, Tailwind 4)

- **Marketing-Site** — `/`, `/pricing`, `/faq`, `/multi-ai`,
  `/datenschutz`, `/impressum`
- **Onboarding** — `/onboarding` (Self-Service-Tenant-Erstellung
  mit Paddle-Checkout)
- **Admin-Konsole** — `/admin` (Tenant-CRUD, Stats, Plan-Prompts)
- **Tenant-Dashboard** — `/dashboard/*` (Conversations, Leads, CRM,
  Clients, Campaigns, Broadcasts, Settings)
- **Asset Studio** — `/dashboard/assets/*` (KI-Bildgenerierung
  mit Konva-basiertem Editor)
- **Embed-Widget** — `/embed/widget` (iframe-Chat-UI für Kunden-
  Websites, Phase 4a–4c)

### Backend (Next.js API Routes, 47 Endpoints)

Gruppiert nach Zweck:

| Gruppe | Routen | Auth |
|---|---|---|
| **Admin** | `/api/admin/*` — login, tenants, stats, plan-prompts | Session-Cookie nach `ADMIN_SECRET` |
| **Dashboard** | `/api/dashboard/*` — me, stats, conversations, leads, campaigns, broadcasts, clients, crm, export, settings | Magic-Link-Token (`dashboard_token` Cookie) |
| **Widget** | `/api/widget/*` — config, session, message, poll | `webWidgetPublicKey` + Session-Token |
| **Webhooks** | `/api/webhook/whatsapp`, `/api/paddle/webhook` | HMAC-Signatur |
| **Cron** | `/api/cron/cleanup`, `/api/cron/followup` | `CRON_SECRET` Header |
| **Asset Studio** | `/api/asset-studio/generate`, `/edit` | Dashboard-Auth |
| **Public** | `/api/onboarding`, `/api/paddle/checkout` | Rate-limitiert |

### Datenbank (Prisma 7 + Postgres Frankfurt)

- **ORM:** Prisma 7 mit `@prisma/adapter-pg` (Driver Adapter)
- **Hosting:** Prisma Postgres Frankfurt (DSGVO-konform, EU-Region)
- **Schema:** 13 Models, 11 Enums (Stand: 403 Zeilen)
- **Isolation:** Jedes Tenant-bezogene Model hat `tenantId` mit
  `@relation(..., onDelete: Cascade)` (Ausnahmen siehe
  docs/tech-debt.md: CampaignTemplate und Broadcast ohne FK)

### Externe Services

| Service | Zweck | Integration |
|---|---|---|
| **Anthropic Claude** | Verkaufsgespräche (Bot-Antworten) | `@anthropic-ai/sdk ^0.82.0` |
| **OpenAI GPT-4o** | Lead-Scoring (Score, Qualification) | `openai ^6.33.0` |
| **WhatsApp Cloud API v21** | Messaging-Kanal 1 | REST + HMAC-Webhook |
| **Paddle** | Billing (MoR, Checkout, Subscriptions, Webhooks) | Direkte REST-Calls, kein SDK |
| **Resend** | Transactional Emails (Lead-Alerts, Welcome) | `resend ^6.10.0` |
| **Upstash Redis** | Rate-Limiting (Sliding Window) | `@upstash/ratelimit` |
| **Notion** | Session-Notes (interne Arbeits-Doku) | `@notionhq/client ^5.16.0` |
| **HubSpot** | Lead-Push für Hot-Leads (Score > 70) | Direkte REST-Calls, API-Key verschlüsselt |
| **Vercel** | Hosting (Fluid Compute, Frankfurt-nah) | Plattform-Runtime |

---

## 3. Der Bot-Pfad (channel-agnostisch)

Seit Phase 1 (`processMessage`-Extraktion) durchlaufen **beide
Kanäle** denselben Bot-Pfad. Die Transport-Schicht ist das einzige,
was sich unterscheidet:

```
                       ┌───────────────────┐
WhatsApp-Nutzer ──────▶│  Cloud API        │──┐
                       └───────────────────┘  │
                                              ▼
                                ┌──────────────────────────┐
                                │ /api/webhook/whatsapp    │
                                │ - HMAC-Verify            │
                                │ - Dedup (ProcessedMsg)   │
                                │ - Tenant via phoneId     │
                                └────────────┬─────────────┘
                                             │
                                             ▼
                           ┌────────────────────────────────┐
                           │  processMessage()              │
                           │  src/lib/bot/processMessage.ts │
                           │                                │
                           │  1. Consent-Logik              │
                           │  2. STOP-Handling              │
                           │  3. USER-Message persistieren  │
                           │  4. History entschlüsseln      │
                           │  5. loadSystemPrompt()         │
                           │  6. Claude generateReply()     │
                           │  7. ASSISTANT persistieren     │
                           │  8. runScoringPipeline async   │
                           │  9. responses[] zurückgeben    │
                           └─────┬──────────────────┬───────┘
                                 │                  │
                                 ▼                  ▼
                       ┌──────────────────┐  ┌──────────────┐
                       │  sendMessage     │  │  DB-Persist  │
                       │  (WhatsApp       │  │  (Web-Widget │
                       │   Cloud API)     │  │   poll)      │
                       └──────────────────┘  └──────┬───────┘
                                                    │
                                 ┌──────────────────┘
                                 ▼
                                ┌───────────────────┐
Web-Besucher ◀──── iframe ◀─────│ /api/widget/poll  │
                  /embed/widget └───────────────────┘
                                        ▲
                                        │
                                ┌───────┴────────────┐
                                │ /api/widget/       │
                                │   message (POST)   │
                                │   session (POST)   │
                                │   config (GET)     │
                                └────────────────────┘
```

**Kernentscheidung (Phase 0, Entscheidung 3):** `processMessage`
persistiert **User- und Bot-Nachricht VOR Transport**. Das
garantiert:

- Symmetrie über Kanäle (Web-Polling braucht DB-Persistenz zwingend)
- Robustheit gegen WhatsApp-Transport-Ausfälle (Lead-Score bleibt korrekt)
- Debugging-Freundlichkeit (jede Bot-Antwort in DB auffindbar)

**Asynchroner Seitenast:** `runScoringPipeline()` läuft
non-blocking nach jeder Bot-Antwort. Sie ruft GPT-4o für den
Lead-Score auf, aktualisiert `Lead`, löst `notifyHighScoreLead()`
(Resend-Mail) aus und pusht bei Score > 70 an HubSpot
(fire-and-forget).

---

## 4. Multi-Tenant-Modell

Tenant-Isolation ist **die** kritische Sicherheits-Eigenschaft der
Plattform. Sie gilt auf drei Ebenen:

### Ebene 1 — Datenbank-Query

Jedes tenantspezifische Model hat `tenantId`. Pflicht-Pattern aus
CLAUDE.md (Architektur-Patterns):

```typescript
// RICHTIG: Composite Key, atomar tenant-isoliert
db.conversation.findFirst({ where: { id, tenantId } });

// FALSCH: erst by ID, dann tenantId nachträglich prüfen
const conv = await db.conversation.findUnique({ where: { id } });
if (conv.tenantId !== tenantId) throw ...;
```

### Ebene 2 — Authentifizierungs-Kontext

- **Admin** — `safeCompare()` gegen `ADMIN_SECRET`, dann
  Session-Cookie (`admin_token`)
- **Dashboard** — `getDashboardTenant()` aus
  `@/modules/auth/dashboard-auth` liest `dashboard_token` Cookie
  (Magic-Link SHA-256-Hash in `Tenant.dashboardToken`)
- **Widget** — Öffentlicher `webWidgetPublicKey` (Format
  `pub_${base64url(12 bytes)}`) löst den Tenant auf; danach
  identifiziert ein serverseitig gespeicherter
  `widgetSessionToken` die Conversation

### Ebene 3 — Channel-Identifier

- WhatsApp: Tenant via `whatsappPhoneId` (WA Business Phone Number
  ID, unique)
- Web: Tenant via `webWidgetPublicKey` (rotierbar, entkoppelt vom
  internen `slug`)

**Rotations-Fähigkeit:** Der Public Key ist bewusst öffentlich und
taucht im HTML der Kunden-Website auf. Bei Leak kann er im
Dashboard rotiert werden — aktive Sessions bekommen dann 401 und
die Kunden-Website muss das Script-Tag aktualisieren.

---

## 5. Channels

### 5.1 WhatsApp (Kanal 1, produktiv seit v1)

- **Transport:** WhatsApp Cloud API v21.0
- **Webhook:** `/api/webhook/whatsapp` mit X-Hub-Signature-256
- **Dedup:** `ProcessedMessage`-Tabelle (24h-Cron-Cleanup)
- **Tenant-Auflösung:** `phoneNumberId` → `Tenant.whatsappPhoneId`
- **Identifier:** SHA-256-Hash der Nutzer-Telefonnummer als
  `Conversation.externalId` (DSGVO: Phone-Nummer nie im Klartext)
- **Besonderheiten:** Campaign-Tracking über Deep-Link-Format
  (`qr:xxx`, `campaign:xxx`) als erste Nachricht

**Aktueller Status und Blocker:** Siehe PROJECT_STATUS.md →
Sektion "Offene Arbeit / Blocker". Das Architektur-Dokument
beschreibt den stabilen System-Aufbau, nicht den aktuellen
Entwicklungs-Status.

### 5.2 Web-Widget (Kanal 2, produktiv seit Phase 4c am 11. April 2026)

- **iframe-Route:** `/embed/widget?key=pub_xxx` — Next.js Server
  Component + Client Component (`ChatClient`)
- **4 API-Endpoints:**
  - `GET /api/widget/config?key=pub_xxx` — öffentliche
    Tenant-Config (Farben, Logo, Welcome-Message), Rate-Limit
    100/h/IP, CORS `*`, 60s In-Memory-Cache (auch für
    Null-Ergebnisse, siehe tech-debt.md)
  - `POST /api/widget/session` — erzeugt Conversation mit
    `channel: WEB`, optional `consentGiven=true` (Phase 4-pre),
    Rate-Limit 30/h/IP
  - `POST /api/widget/message` — nimmt Nutzer-Nachricht an, ruft
    `processMessage` mit `channel: WEB`, antwortet **202
    Accepted** (asynchron), Rate-Limit 60/h/Token-Hash
  - `GET /api/widget/poll` — liefert neue Bot-Nachrichten seit
    Timestamp, 2-Sekunden-Polling, Rate-Limit 3600/h/Token-Hash
- **Session = Conversation** (Phase 0, Entscheidung 2, Modell A):
  Jeder Besuch startet eine neue Conversation. Keine Browser-
  Persistierung, keine Cookies, DSGVO-freundlich
- **Tenant-Customization:** 10 Felder in `webWidgetConfig` JSON
  (`backgroundColor`, `primaryColor`, `accentColor`, `textColor`,
  `mutedTextColor`, `logoUrl`, `botName`, `botSubtitle`,
  `welcomeMessage`, `avatarInitials`) mit defensivem `parseConfig`
  in `src/lib/widget/publicKey.ts`
- **UX-Features (Phase 4b + 4c):** Consent-Modal vor Chat-Start,
  optimistic UI, Typing-Indicator, Network-Error-Handling mit
  Offline-Banner, ARIA-Accessibility, Mobile-Touch-Targets 44×44
- **Token-Hashing:** `widgetSessionToken` wird als Hash im
  Rate-Limit-Key verwendet, um Klartext-Tokens aus dem
  Upstash-Cache fernzuhalten

**Noch offen:** Phase 5 — Embed-Script (Floating-Button-Launcher
als `<script src="...">` für Kunden-Websites)

---

## 6. Datenmodell (Übersicht)

Die wichtigsten Tabellen mit kurzem "wofür". Detail-Glossar folgt
in `docs/data-model.md` (geplant).

| Model | Zweck | Schlüssel-Felder |
|---|---|---|
| **Tenant** | Mandant, zentrale Config | `slug`, `whatsappPhoneId`, `webWidgetPublicKey`, `paddlePlan`, `hubspotApiKey` (verschlüsselt) |
| **Conversation** | Chat-Session (channel-agnostisch) | `channel`, `externalId` (nullable für WEB), `widgetSessionToken`, `consentGiven/At`, `status` |
| **Message** | Einzelne Nachricht, verschlüsselt | `role`, `contentEncrypted` (AES-256-GCM) |
| **Lead** | Qualifizierter Kontakt | `score`, `qualification`, `pipelineStatus`, `campaignId`, `abTestVariant` |
| **Client** | Aus Lead gewonnener Kunde | `leadId` (1:1), `status`, `onboardingStep` |
| **Campaign** | Marketing-Kampagne | `slug`, `isActive`, Relationen zu `AbTest`, `Broadcast` |
| **CampaignTemplate** | Vorlage (System oder Tenant) | `briefing`, `openers`, `abVarianten`, `ziele` (alle JSON) |
| **AbTest** | A/B-Test pro Kampagne | `variantA/B`, `sendsA/B`, `responsesA/B`, `winnerId` |
| **Broadcast** | Massen-WhatsApp-Aussand | `message`, `segment`, `status`, `recipients[]` |
| **ProcessedMessage** | WA-Dedup-Tabelle (24h TTL) | `messageId` unique |
| **Asset**, **AssetCredit**, **TenantAssetModel** | AI Asset Studio | Bildgenerierung per Claude/Grok/Gemini/Flux |

**Enums:** `ConversationStatus`, `Channel (WHATSAPP/WEB)`,
`MessageRole`, `MessageType`, `LeadStatus`, `LeadQualification`,
`PipelineStatus (NEU/QUALIFIZIERT/TERMIN/ANGEBOT/GEWONNEN)`,
`ClientStatus`, `BroadcastStatus`, `AssetModel`, `AssetStatus`.

**Verweis:** Detail-Glossar pro Feld kommt in `docs/data-model.md`,
sobald diese Datei angelegt wird.

---

## 7. Security & DSGVO

| Schicht | Mechanismus |
|---|---|
| **CSP** | Nonce-basiert mit `'strict-dynamic'` (Phase 4-pre, Middleware generiert 128-bit Nonce pro Request, injiziert via `x-nonce`-Header in SSR) |
| **Frame-Ancestors** | `'none'` für alle Routen außer `/embed/*` und `/api/widget/*` (dort `*` für iframe-Embedding) |
| **Security-Header** | `X-Frame-Options: DENY` (Ausnahme Widget-Routen), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (Camera/Mic/Geo/FLoC off) |
| **Tenant-Isolation** | Composite Keys auf DB-Query-Ebene, Pflicht in CLAUDE.md |
| **Nachrichten-Verschlüsselung** | AES-256-GCM für `Message.contentEncrypted` via `encryptText()` / `decryptText()` aus `@/modules/encryption/aes` |
| **Phone-Nummern** | Nur SHA-256-Hash in `Conversation.externalId`, nie im Klartext |
| **DSGVO-Consent** | `Conversation.consentGiven/consentAt` — Modell: erste Nachricht löst Consent-Anfrage aus, zweite Nachricht = implizite Zustimmung. Web-Widget zeigt Consent-Modal zusätzlich UX-seitig (Phase 4b) |
| **STOP-Befehl** | Jede User-Nachricht `"STOP"` setzt `status: CLOSED` + Audit-Log `bot.conversation_stopped` |
| **Retention** | `Tenant.retentionDays` (Default 90), automatisch via `/api/cron/cleanup` (DSGVO-Pflicht-Löschung) |
| **Audit-Log** | `auditLog()` aus `@/modules/compliance/audit-log` für jede sensitive Operation, `SENSITIVE_FIELDS` werden automatisch gefiltert |
| **Rate-Limiting** | Upstash Redis Sliding Window, pro-Endpoint-Schemas (Webhook, Admin-Login, Widget-Config/Session/Message/Poll, Onboarding) |
| **Hosting** | Prisma Postgres Frankfurt (EU-Region, DPA verfügbar), Vercel Fluid Compute |
| **Zahlungen** | Paddle als Merchant of Record (übernimmt EU-Umsatzsteuer + PCI-Compliance) |

**Verweis:** Sicherheits-Entscheidungen sind dokumentiert in
`docs/decisions/phase-0-decisions.md` (CSP-Nonce, crypto.randomBytes,
Persistenz-Semantik).

---

## 8. Wichtige Architektur-Entscheidungen

Kurzer Recap der Phase-0-Entscheidungen
(`docs/decisions/phase-0-decisions.md`) plus später getroffene
Folgenscheidungen:

| # | Entscheidung | Begründung |
|---|---|---|
| 1 | `crypto.randomBytes` statt `nanoid` | Zero-dependency, ausreichend für Public-Key- und Session-Token-Generierung |
| 2 | Modell A: Session = Conversation | Einfach, keine Browser-Persistenz, DSGVO-freundlich, konsistent mit WhatsApp-Flow |
| 3 | Persistenz vor Transport | Symmetrie über Kanäle, Robustheit, Debugging-Freundlichkeit |
| 4 | Test-Modus nicht gefixt | `/test/[slug]` bleibt wie er ist; Dead Code in `src/lib/test-mode.ts` wird mit Widget-Launch entfernt |
| 5 | CSP-Nonce vor Phase 4 | Nonce-basierte CSP wird vor iframe-UI gebaut (Block 1), nicht danach |
| 6 | Cleanup-Cron Stufe 4 vor Pilot-Launch | `findMany`→`deleteMany`-Fix wird nach Phase 3 / vor Phase 7 gemacht |
| — | `processMessage` channel-agnostisch (Phase 1) | Kanal-Abstraktion: Bot-Logik kennt keine HTTP-Details, keine Phone Numbers, nur opaken `senderIdentifier` |
| — | Schema additive Migration (Phase 2) | Alle Widget-Felder additiv, kein Breaking Change; `channel` Default `WHATSAPP` |
| — | `externalId` nullable (Phase 3a.5) | Erlaubt WEB-Conversations ohne Phone-Hash; Lesson Learned: Konsumenten-Audit vergessen → Phase 5-Pre Hotfix |
| — | Polling statt WebSockets (Phase 3b) | 2-Sekunden-Polling reicht für Widget-UX, Vercel-Fluid-Compute-freundlich |
| — | Widget-Consent pre-accepted via Frontend-Modal (Phase 4-pre) | Spart einen Roundtrip im Web, `consentGiven=true` im Session-POST |

**Verweis:** Ausführliche Entscheidungen in `docs/decisions/`.
Re-Evaluations-Prozess (ADR-Workflow) in
`WEB_WIDGET_INTEGRATION.md` § "Änderungs-Protokoll".

---

## 9. Technologie-Stack

| Schicht | Technologie | Begründung |
|---|---|---|
| **Framework** | Next.js 15 App Router | SSR + API Routes aus einer Codebase, SSG für Marketing-Seiten, Streaming-Support |
| **UI-Runtime** | React 19 | App Router-Voraussetzung, Server Components für statische Teile |
| **Sprache** | TypeScript strict (ohne `any`) | Pflicht laut CLAUDE.md, Code-Qualitäts-Baseline |
| **ORM** | Prisma 7 mit PrismaPg Driver Adapter | Type-safe Queries, Migrations-Workflow, EU-Postgres-Support |
| **Datenbank** | Postgres (Prisma Postgres Frankfurt) | DSGVO, Row-Locking, JSON-Felder für flexible Tenant-Config |
| **Styling** | Tailwind CSS 4 | Utility-First, Tree-Shaking, `@source`-Direktive für Widget-Route |
| **Bot-LLM** | Anthropic Claude | Verkaufsqualität, deutsche Sprache, Retry-basiertes `withRetry` mit 2 Retries + 12s Timeout |
| **Scoring-LLM** | OpenAI GPT-4o | Struktur­basiertes Lead-Scoring mit JSON-Output |
| **Billing** | Paddle (MoR) | EU-konforme Umsatzsteuer, PCI-Compliance, Subscriptions + One-Time für Setup-Fees |
| **Email** | Resend | Transactional, einfache API, gute Deliverability |
| **Rate-Limit** | Upstash Redis + `@upstash/ratelimit` | Sliding Window, Multi-Region, In-Memory-Fallback lokal |
| **Verschlüsselung** | Node `crypto` (AES-256-GCM) | Message-Content, HubSpot-API-Key (im Tenant-Feld) |
| **Image-Stack** | Konva + `react-konva`, `sharp` | Asset Studio: Canvas-basierter Editor + Server-seitige Bildtransformation |
| **Validierung** | Zod 4 | Pflicht für alle POST/PATCH, `safeParse` nach `request.json()` |
| **Animationen** | framer-motion, Tailwind | Widget-Entrance, Modal-Transitions |
| **Tests** | Vitest | (Eingerichtet, noch keine Tests geschrieben — siehe `docs/quality-roadmap.md` Lücke 1) |
| **Hosting** | Vercel Fluid Compute | Frankfurt-nah, Node.js 24 Runtime, 300s Timeout Default |
| **Domain** | `ai-conversion.ai` | Produktions-Endpoint |

---

## 10. Was diese Datei NICHT ist

- **Kein Code-Walkthrough** — Details sind im Code selbst
  (TypeScript + deutsche Inline-Kommentare)
- **Keine API-Reference** — Endpoint-Verträge stehen in den
  jeweiligen Route-Handlern mit Zod-Schemas
- **Kein Onboarding für neue Entwickler** — Das hier ist ein
  Solo-Founder-Projekt, keine Team-Doku
- **Kein vollständiges Schema** — Das kommt in
  `docs/data-model.md`, sobald diese Datei angelegt wird
- **Keine Phase-Historie** — Die steht in `PROJECT_STATUS.md`
- **Keine Backlog-Liste** — Das steht in `docs/tech-debt.md` und
  `docs/quality-roadmap.md`

Diese Datei ist die **10-Minuten-Antwort** auf *"Wie funktioniert
das System grob?"*. Wenn ein Leser nach 10 Minuten die großen
Komponenten, den Bot-Pfad und die Channels verstanden hat, hat sie
ihren Zweck erfüllt.

---

## 11. Lebendes Dokument

Diese Datei wird bei jeder System-Änderung aktualisiert — das ist
**Pflicht-Regel 1** aus CLAUDE.md ("Automatische Doku-Pflicht").
Konkrete Trigger für ein Update dieser Datei:

- Neuer Channel (z.B. Instagram, Telegram, Email)
- Neues externes Service (neuer LLM-Provider, neuer Zahlungs-
  Gateway, neuer Email-Provider)
- Neue Top-Level-Komponente (z.B. Mobile-App, Customer-Portal)
- Signifikante Refactorings der großen Komponenten
  (`processMessage`, Middleware, Multi-Tenant-Modell)
- Neue Security-Schicht oder Änderung der DSGVO-Architektur
- Architektur-Entscheidung mit systemweiter Auswirkung

**Kein Update nötig bei:** Einzelnen Bug-Fixes, Schema-Änderungen
an Nebentabellen, neuen Dashboard-Features, UI-Anpassungen.
Solche Änderungen gehören in `PROJECT_STATUS.md` und ggf.
`docs/decisions/`.

**Letzte Aktualisierung:** 2026-04-12 — Erstanlage nach
CLAUDE.md-Härtung (Commit `70b18ed` + `8b2ccf1`).
