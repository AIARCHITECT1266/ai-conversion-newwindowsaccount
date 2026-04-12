# ADR Phase 6 — Dashboard-Integration fuer Web-Widget

**Datum:** 2026-04-12
**Status:** In Umsetzung (Sub-Phase 6.2 committet)
**Owner:** Project Owner + ConvArch
**Betroffene Dateien:**
- `src/app/dashboard/settings/widget/page.tsx` (neu, Settings-UI)
- `src/app/api/dashboard/widget-config/route.ts` (neu, GET + PATCH)
- `src/app/api/dashboard/widget-config/generate-key/route.ts` (neu, POST)
- `src/app/api/dashboard/widget-config/toggle/route.ts` (neu, POST)
- `src/lib/plan-limits.ts` (Erweiterung: `hasPlanFeature`)
- `src/lib/widget/publicKey.ts` (Export: `parseConfig`, `generatePublicKey`)
- `src/modules/compliance/audit-log.ts` (Erweiterung: 3 neue AuditActions)

---

## Kontext

Phase 6 schliesst den Entwicklungs-Zyklus des Web-Widgets: Tenants
sollen das Widget selbst im Dashboard aktivieren, gestalten und
einbetten koennen, ohne dass ein Admin manuell DB-Werte setzt. Die
Spec dazu (`WEB_WIDGET_INTEGRATION.md` Phase 6) skizziert vier
Kern-Aufgaben:

1. Widget-Konfigurations-Seite unter `/dashboard/settings/widget`
2. Bestehende Dashboard-Views um Channel-Filter erweitern
3. Plan-Feature-Gating (Starter: nein, Growth+: ja)
4. Live-Preview des Widgets

Dieser ADR dokumentiert die vier Architektur-Entscheidungen, die der
Project Owner vor der Implementation getroffen hat, plus eine
Abweichung von der Spec-Wortwahl (Feature-Flag-Helper-Split), die
nach Regel 5 explizit begruendet werden muss.

---

## Entscheidung 1 — Live-Preview via iframe, nicht Side-by-Side-Render

**Gewaehlt:** Die Live-Preview im Settings-Page ist ein echter
iframe mit `src="/embed/widget?key=pub_xxx"`. Dasselbe iframe,
das auch auf Pilot-Kunden-Seiten eingebettet wird.

**Alternativen erwogen:**

| Alternative | Pro | Contra |
|---|---|---|
| **A — iframe der echten Route (gewaehlt)** | Preview == Production garantiert. Null Drift-Risiko zwischen Dashboard und echtem Widget. Consistency by construction | Seitenlast etwas hoeher, weil das volle Widget-Bundle geladen wird |
| B — Side-by-Side-React-Render des ChatClient mit Config-Props | Schneller, weniger Netzwerk-Calls | Zwei Render-Pfade = zwei Stellen, an denen ein Drift entstehen kann. Klassiches Anti-Pattern, vor dem der heutige `phase-3b-rate-limit-correction.md` warnt |
| C — Statischer Screenshot-Generator | Kein JS-Bundle | Verhindert interaktive Vorschau von Hover-States, Consent-Modal-Animation, Polling-Verhalten |

**Begruendung:** Option A ist die einzige, die ausschliesst, dass
die Dashboard-Preview von der Production-Optik abweichen kann.
Nach der heute Morgen erlebten Spec-Drift-Serie (Session-Rate-Limit,
Config-Felder, Poll-Audit-Log) ist die "Preview == Production"-
Garantie der wichtigste Wert. Seitenlast ist vernachlaessigbar, weil
der Settings-Editor eine selten aufgerufene Route ist.

**Technik-Detail:** Das iframe re-ladet nach jedem erfolgreichen
Save ueber einen React-`key`-State-Wert (`previewNonce`), der bei
Save inkrementiert wird. Kein imperativer `iframeRef.contentWindow
.location.reload()` noetig — React mounted das iframe bei
`key`-Aenderung automatisch neu.

---

## Entscheidung 2 — Embed-Generator: Single-Snippet + kollapsierbare Plattform-Anleitung

**Gewaehlt:** Der Embed-Code-Generator zeigt als **primaeres
Element** einen einzeiligen Script-Tag mit grossem Copy-Button.
**Darunter** ein kollapsierbarer Bereich *"Anleitung fuer deine
Plattform"* mit vier Tabs (HTML / WordPress / Shopify / Google Tag
Manager). Die Tabs enthalten **nur Anleitungs-Texte**, **keinen
zusaetzlichen Code**.

**Alternativen erwogen:**

| Alternative | Pro | Contra |
|---|---|---|
| **A — Single-Snippet prominent, Anleitungen kollapsierbar (gewaehlt)** | Einfachster Kopier-Flow (1 Klick), Anleitungen nur bei Bedarf sichtbar, Primary-Copy-Button bleibt eine Zeile | Braucht Collapsible-State |
| B — Alle Plattformen als Code-Snippets mit eigenem Copy-Button | Kunde sieht sofort "sein" Snippet | Viermal die gleiche Zeile fuer Plattformen, die alle denselben Script-Tag wollen. Geschwaetzig, verwirrend |
| C — Nur die HTML-Zeile, ohne Plattform-Anleitung | Minimalistisch | WordPress/Shopify/GTM-User wissen nicht, **wo** sie die Zeile einfuegen — Support-Aufkommen |

**Begruendung:** Der Snippet selbst ist **bei allen Plattformen
identisch** (`<script src="..." data-key="..." async>`). Die
Plattform-spezifische Information ist: **wo** wird der Snippet
eingebaut. Das ist Anleitung, nicht Code. Option A trennt diese
zwei Dinge sauber: eine Kopier-Quelle, vier Einbau-Anleitungen.
Das entspricht dem Modell von Intercom, Crisp und HubSpot.

**Scope-Klarstellung:** Die vier Plattform-Tabs im aktuellen
Commit sind **Pure-Text-Anleitungen**. Kein Plattform-Tab enthaelt
zusaetzlichen Code jenseits der Referenz zum Primary-Snippet. Das
vermeidet, dass ein spaeterer Drift zwischen Primary-Snippet und
Tab-Snippet entsteht.

---

## Entscheidung 3 — E2E-Smoke-Test als Phase-6-Done-Kriterium

**Gewaehlt:** Phase 6 ist erst **nach einem manuell vom Project
Owner durchgefuehrten End-to-End-Smoke-Test** abgeschlossen, nicht
nach dem Commit der UI.

**Was der Test umfasst** (Details siehe Sub-Phase 6.4):

1. Dashboard-Login
2. `/dashboard/settings/widget` aufrufen
3. Widget aktivieren (Toggle → Auto-Key-Generierung)
4. Config aendern + speichern → Preview-Iframe zeigt neuen Stand
5. Embed-Snippet kopieren
6. `public/widget-demo.html` lokal mit dem echten Key patchen
   (**nicht committen**)
7. Demo-Seite im Browser oeffnen, Bubble klicken
8. Kompletter Qualifizierungs-Flow mit mindestens 3-4 Bot-Antworten
9. Im Dashboard → Conversations-View: neue Web-Conversation
   sichtbar mit `channel: 'WEB'`-Marker
10. CRM-View: Lead mit WEB-Herkunft sichtbar

**Begruendung:** Die Spec (`WEB_WIDGET_INTEGRATION.md` Phase 7)
platziert "Testing & Hardening" als eigene Phase **nach** Phase 6.
Wir ziehen den E2E-Smoke-Test nach vorne, weil:

- Die heutige Drift-Serie hat gezeigt, dass Spec-Konformitaet ohne
  E2E-Verifikation illusorisch ist
- Phase 6 ist die **erste** Phase, in der der komplette User-Flow
  tatsaechlich durchspielbar ist (vorher fehlte das Dashboard-
  Toggle, der Key wurde per CLI-Skript generiert)
- Ein auf Phase 7 verschobener E2E-Test hiesse, dass Phase 6 als
  "fertig" markiert wird, obwohl niemand verifiziert hat, dass
  die UI tatsaechlich zu einer erfolgreichen Konversation fuehrt
- "Commit zuerst, Testen spaeter" ist genau das Muster, das die
  Drift-Serie ermoeglicht hat

**Konsequenz:** Sub-Phase 6.2 und 6.3 werden committet, aber Phase
6 als Ganzes bleibt offen, bis der E2E-Test in Sub-Phase 6.4 durch
ist. Der finale Phase-6-Abschluss-Commit dokumentiert den
Test-Befund.

---

## Entscheidung 4 — Feature-Flag-Helper-Split (`hasPlanFeature` statt `checkLimit(..., 'web_widget')`)

**Spec-Wortlaut** (`WEB_WIDGET_INTEGRATION.md` Phase 6):

> **Plan-Feature-Gating:**
> ```typescript
> await checkLimit(tenantId, paddlePlan, 'web_widget');
> ```
> Bei Starter-Plan: deaktiviert mit Upgrade-Prompt. Growth und Pro:
> inkludiert.

**Code-Realitaet vor Phase 6:**

`src/lib/plan-limits.ts` exportiert `checkLimit(tenantId,
paddlePlan, resource)` mit Resource-Union
`"campaigns" | "broadcasts" | "leads"`. Die Funktion zaehlt DB-
Entities (`db.campaign.count`, `db.broadcast.count`,
`db.lead.count`) gegen eine numerische Obergrenze aus
`PLAN_LIMITS[plan][config.limitKey]`. Sie ist **Count-basiert**
(Quota), nicht **Feature-Flag-basiert**.

Web-Widget ist semantisch das Gegenteil: ein binaerer Feature-Flag
(`STARTER: nein, GROWTH/PROFESSIONAL/ENTERPRISE: ja`), kein
zaehlbarer Ressourcen-Verbrauch.

**Zwei Optionen:**

| Option | Ansatz | Verdict |
|---|---|---|
| **A** — `checkLimit` erweitern | Resource-Union um `"web_widget"` ergaenzen, intern Sonderbehandlung (skip count, return boolean) | Verwaessert die Count-Semantik, macht `checkLimit` polymorph. Return-Shape `{ allowed, current, limit }` ist fuer Feature-Flags bedeutungslos (`current=0, limit=0`). Klassisches semantisches Anti-Pattern |
| **B — Neuer `hasPlanFeature`** (gewaehlt) | Eigener Helper in `plan-limits.ts`, synchron, kein DB-Call, reine Feature-Check-Funktion | Saubere Trennung Quota vs Feature-Flag. Erweiterbar fuer kuenftige Features (`asset_studio`, `ab_testing`, `multi_user`). Testbar ohne DB-Mock |

**Begruendung:** Option A haette genau das Muster reproduziert, vor
dem der heutige `phase-3b-rate-limit-correction.md`-ADR warnt:
plausibel klingend, aber semantisch gemischt. `checkLimit` wuerde
zwei fundamental verschiedene Dinge tun, die Funktions-Doku
haette einen Conditional-Block gebraucht, und der Return-Shape
waere fuer Feature-Flags sinnlos belastet.

Option B ist die saubere Investition fuer die naechsten 5-10
Feature-Flags. `hasPlanFeature` hat eine eindeutige Semantik:
*"enthaelt das Paket dieses Features ja/nein"*. Keine Quoten,
keine Counts, keine DB-Hits.

**Spec-Konformitaet via Regel 5:** Die Abweichung von der
Spec-Wortwahl (`checkLimit` vs `hasPlanFeature`) ist an der
einzigen Aufruf-Stelle im Widget-Config-Route-Handler mit
spec-referenziertem Code-Kommentar versehen:

```typescript
// Plan-Gating via hasPlanFeature() statt checkLimit(..., 'web_widget'):
// Spec WEB_WIDGET_INTEGRATION.md Phase 6 schrieb checkLimit vor, aber
// checkLimit ist Count-basiert (Quota), nicht Feature-Flag-basiert.
// hasPlanFeature ist die semantisch korrekte Trennung. Begruendung im
// ADR: docs/decisions/phase-6-dashboard-widget.md Sektion
// "Feature-Flag-Helper-Split".
```

Damit ist die Abweichung im Code selbst explizit, spec-referenziert
und ADR-verlinkt — exakt das Muster, das CLAUDE.md Regel 5
vorschreibt.

**Plan-Mapping** (implementiert in `src/lib/plan-limits.ts`):

| Plan | `web_widget`-Feature? | Logik |
|---|---|---|
| `STARTER` | ❌ nein | `plan === "STARTER"` → false |
| `GROWTH` | ✅ ja | `plan !== "STARTER"` → true |
| `PROFESSIONAL` | ✅ ja | `plan !== "STARTER"` → true |
| `ENTERPRISE` | ✅ ja | `plan !== "STARTER"` → true |

Die echten Plan-Konstanten sind `STARTER`, `GROWTH`, `PROFESSIONAL`,
`ENTERPRISE` (nicht "PRO" wie in der Briefing-Formulierung). Das
wurde vor der Implementation in `src/lib/plan-limits.ts` verifiziert.

---

## Technische Umsetzungs-Details (Sub-Phase 6.2 Commit)

### API-Endpoints

**`GET /api/dashboard/widget-config`** liefert:

```json
{
  "enabled": boolean,
  "publicKey": "pub_..." | null,
  "config": ResolvedTenantConfig,
  "defaults": DEFAULT_CONFIG,
  "plan": "STARTER" | "GROWTH" | "PROFESSIONAL" | "ENTERPRISE",
  "featureAvailable": true
}
```

Bei Starter → **HTTP 403** mit `code: "plan_upgrade_required"`.
Das Dashboard-UI zeigt dann statt der Settings den Upgrade-Prompt.

**`PATCH /api/dashboard/widget-config`** akzeptiert partielle
Updates aller 10 editierbaren Felder. Merge-Semantik: neue Werte
ueberschreiben alte Werte Feld fuer Feld, nicht gesetzte Felder
bleiben unveraendert. Zod-Schema validiert Hex-Farben und
String-Laengen analog zu `parseConfig()` in `publicKey.ts`.
`bubbleIconUrl` ist **bewusst nicht editierbar** in Phase 6.2
(Tenant-Override fuer Fortgeschrittene, ggf. in Phase 7 ergaenzt).

**`POST /api/dashboard/widget-config/generate-key`** ist
idempotent: wenn der Tenant bereits einen Key hat, wird dieser
zurueckgegeben (kein Rotate). Bei Kollision (@unique-Violation)
wird bis zu 3× neu generiert.

**`POST /api/dashboard/widget-config/toggle`** mit `{ enabled:
boolean }` im Body. Beim Aktivieren ohne bestehenden Key wird
**automatisch** ein Key generiert, damit der User mit einem
einzigen Klick loslegen kann. Audit-Log zweimal: `widget.toggled`
+ `widget.public_key_generated` (bei Auto-Gen).

### Audit-Log-Erweiterungen

Drei neue `AuditAction`-Werte in `src/modules/compliance/audit-log.ts`:

- `widget.config_updated` — PATCH der Config, Details: Liste der
  geaenderten Feld-Namen (keine Werte, keine Public-Key-Referenzen)
- `widget.public_key_generated` — neuer Key erzeugt, Details: leer
  (Public-Key-Wert bleibt aus dem Log)
- `widget.toggled` — Enable/Disable, Details: `{ enabled, keyGenerated }`

Alle drei mit `ip: hashIp(getClientIp(req))` wie die existierenden
Widget-Events.

### Config-Editor: 10 editierbare Felder

| Feld | Typ | Control |
|---|---|---|
| `backgroundColor` | Hex | Color-Picker + Hex-Input |
| `primaryColor` | Hex | Color-Picker + Hex-Input |
| `accentColor` | Hex | Color-Picker + Hex-Input |
| `textColor` | Hex | Color-Picker + Hex-Input |
| `mutedTextColor` | Hex | Color-Picker + Hex-Input |
| `botName` | String (1-50) | Text-Input |
| `botSubtitle` | String (0-100) | Text-Input |
| `welcomeMessage` | String (1-500) | Textarea (3 Zeilen) |
| `avatarInitials` | String (1-3) | Text-Input |
| `logoUrl` | URL nullable | Text-Input |

Nicht editierbar in Phase 6.2:
- `bubbleIconUrl` (Phase 5 Embed-Loader Tenant-Override, Advanced Setting)

### Plan-Gating-Flow

Das UI unterscheidet drei States:

1. **Loading** → Spinner
2. **Starter** → `UpgradePrompt`-Component (Banner mit Upgrade-Link)
3. **Growth+** → Toggle + (bei `enabled` zusaetzlich Snippet, Config-Editor, Preview)

Der Upgrade-Prompt wird angezeigt, wenn der Config-Fetch **HTTP 403**
liefert. Das Frontend kennt damit die Plan-Abhaengigkeit nur
indirekt (ueber das API-Response) und braucht kein eigenes
Plan-Mapping.

---

## Reversibilitaet

| Aspekt | Reversibilitaet |
|---|---|
| `hasPlanFeature` als separater Helper | **Two-Way** — trivial entfernbar, Aufrufer koennten auf `checkLimit`-Erweiterung umgestellt werden |
| iframe-basierte Live-Preview | **Two-Way** — Component ist isoliert, Ersatz durch Side-by-Side-Render moeglich |
| Single-Snippet + kollapsierbare Plattform-Tabs | **Two-Way** — Tabs sind Pure-Text, Austausch trivial |
| E2E-Smoke-Test als Done-Kriterium | **Process-Entscheidung**, keine Code-Kopplung |
| Auto-Key-Generierung beim Toggle | **Two-Way** — Logik sitzt an einer Stelle (`toggle/route.ts`), Rueckbau auf "separaten Klick" ist 10 LOC |

Keine One-Way-Doors.

---

## Offene Punkte fuer Sub-Phase 6.3

- Channel-Filter in Conversations-View einbauen. Entscheidung E2
  vom User: **Ansatz Y** (neue dedizierte List-View unter
  `/dashboard/conversations`, nicht die bestehenden verstreuten
  Displays erweitern). Wird im separaten 6.3-Commit umgesetzt.
- KPI-Kacheln (falls vorhanden) summieren WhatsApp + Web — zu
  verifizieren in 6.3.
- CRM-View zeigt Channel-Herkunft pro Lead — 6.3.

## Offene Punkte fuer Sub-Phase 6.4

- E2E-Smoke-Test durch Project Owner.
- Dokumentation des Test-Befundes in diesem ADR oder als Ergaenzung.
- Phase-6-Abschluss-Commit.

---

## Sub-Phase 6.3 — Conversations-List-View + Channel-Filter (Ansatz Y)

**Status:** Umgesetzt im Commit dieser Sub-Phase.

### Kontext

Die urspruengliche Spec (`WEB_WIDGET_INTEGRATION.md` Phase 6)
verlangte: *"Channel-Filter in Conversations-View (Alle /
WhatsApp / Web)"*. Bei der Pre-Analyse in Sub-Phase 6.1 stellte
sich heraus, dass **keine dedizierte Conversations-List-View
existierte** — Conversations wurden verstreut im Haupt-Dashboard
(`dashboard/page.tsx` Top-5-Block), in der CRM-Kanban und in
der Detail-View gezeigt, ohne zentralen Listen-Einstiegspunkt.

Entscheidung E2 aus dem 6.1-Briefing: **Ansatz Y gewaehlt** —
eine neue dedizierte List-View unter `/dashboard/conversations`
bauen, statt den Channel-Filter in die drei bestehenden
verstreuten Displays zu injizieren.

### Begruendung Ansatz Y

| Kriterium | Ansatz X (verteilt) | Ansatz Y (dediziert) |
|---|---|---|
| Filter-Logik | 3x dupliziert | 1x an einem Ort |
| Deeplink-Faehigkeit | Schwierig (mehrere Routen) | Natuerlich (`?channel=X` in einer Route) |
| UX-Erwartung "Conversations Tab" | Fehlt | Vorhanden |
| Aufwand Phase 6.3 | ~4h verteilte Edits | ~5h fuer neue Seite + 3 Mini-Edits |
| Aufwand kuenftige Filter-Erweiterungen | Exponentiell | Linear |
| E2E-Smoke-Test (Phase 6.4) | Mehrere Eingangspunkte zu pruefen | Ein Eingangspunkt |

Ansatz Y zahlt sich beim ersten Pilot-Kunden aus, der eine
"Zeige mir alle Web-Chats der letzten Woche"-Frage hat — das
ist in Ansatz Y ein Link, in Ansatz X ein Bug-Report.

### Architektur-Entscheidungen innerhalb 6.3

**(a) Server Component + Prisma-Direct-Load**

Die neue `src/app/dashboard/conversations/page.tsx` ist eine
reine Server Component und laedt Daten direkt ueber Prisma,
nicht ueber die parallele API-Route
`/api/dashboard/conversations`. Begruendung:

- Identisches Pattern zu `dashboard/page.tsx` und
  `dashboard/crm/page.tsx` — beide laden ihre Server-Side-
  Daten ebenfalls direkt
- Null Netzwerk-Roundtrip zwischen SSR und API-Layer
- Tenant-Isolation und Decryption bleiben serverseitig,
  kein Client kann die entschluesselten Nachrichten ueber
  den Frontend-State leaken
- Der parallele API-Endpoint
  `/api/dashboard/conversations?channel=X` bleibt erhalten
  und wurde im selben Commit ebenfalls um den Channel-Filter
  erweitert — fuer kuenftige SPA- oder External-API-
  Konsumenten (Mobile-App, Zapier, etc.)

**(b) URL-Query-Parameter fuer Filter-State**

Der Channel-Filter wird als `?channel=WHATSAPP|WEB` in die
URL geschrieben, die Paginierung als `?page=N`. Begruendung:

- Deeplink-Faehigkeit: jeder Filter-Zustand ist per Link
  teilbar
- Browser-Back funktioniert natuerlich
- Server Component kann den State serverseitig lesen ohne
  Cookie-oder-Session-State
- `ConversationsFilter` Client-Component nutzt `useRouter`
  plus `useTransition` fuer optimistisches UI-Feedback
  waehrend die Server-Component-Remount-Request laeuft

**(c) Kein `auditLog` auf den Read-Endpoints**

`/api/dashboard/conversations` (Liste) und
`/api/dashboard/conversations/[id]` (Detail) sind Read-only
und loggen **nicht** via `auditLog`. Begruendung folgt exakt
der in `docs/decisions/phase-3b-spec-reconciliation.md` Drift 2
etablierten Praezedenz fuer den Poll-Endpoint: Read-only-
Listen-/Detail-Abfragen sind semantisch keine "Aktionen" im
Spec-Sinne, und ein auditLog pro Dashboard-Page-Refresh wuerde
das Log-Volumen ohne Compliance-Gewinn aufblaehen.

**(d) ChannelBadge als extrahierte Komponente**

Der ChannelBadge wird in **drei** Views verwendet:

1. `src/app/dashboard/conversations/page.tsx` (neue List-View)
2. `src/app/dashboard/conversations/[id]/page.tsx` (bestehende Detail-View)
3. `src/app/dashboard/crm/page.tsx` (LeadCard im Kanban)

Statt den Badge-Markup in drei Dateien inline zu duplizieren,
wurde er in `src/app/dashboard/conversations/ChannelBadge.tsx`
extrahiert. Eine einzige Quelle fuer Markup und Farb-Logik,
Drift zwischen den drei Views ist technisch unmoeglich. Wenn
in Phase 7+ ein dritter Kanal dazukommt (z.B. Instagram-DM),
ist die Aenderung an **einer** Datei zu machen.

**(e) Bewusste Briefing-Abweichung: Channel-Badge-Farbwahl**

Das 6.3-Briefing schrieb *"primary-Color fuer WhatsApp,
accent-Color fuer Web — das CSS fuer die Badges kann simpel
sein"*. Die tatsaechliche Umsetzung verwendet **Emerald**
(WhatsApp-Brand-Gruen) und **Sky** (Web-Browser-Semantik),
**nicht** die Dashboard-Primary-Gold und Dashboard-Accent-
Purple.

Begruendung:

- Dashboard-Gold `#c9a84c` ist bereits fuer Status **PAUSED**
  in den Status-Pills vergeben
- Dashboard-Purple `#8b5cf6` ist bereits fuer Status **ACTIVE**
  in den Status-Pills vergeben
- Status-Pills und Channel-Badges stehen im selben flex-Row
  (gleiche Zeile, gleiche Shape, gleiche Groesse) im
  List-View-LeadCard, im CRM-LeadCard und im Detail-View-
  Header
- Eine wortlaut-treue Umsetzung haette die Status-Information
  visuell ueberschrieben und Nutzer in 50% der Faelle
  falsch interpretieren lassen

Emerald + Sky ist die **kollisionsfreie Lesart**, die plus
den semantisch vertrauten Brand-/Medium-Cue fuer WhatsApp
(Green) und Web (Blue) mitbringt.

**Spec-Bezug (CLAUDE.md Regel 5):** Die Abweichung ist in
`src/app/dashboard/conversations/ChannelBadge.tsx` mit einem
expliziten Kommentar-Block versehen, der die Spec-Stelle
zitiert (*"primary-Color fuer WhatsApp, accent-Color fuer Web"*)
und die Begruendung (*"Dashboard-Gold = PAUSED, Dashboard-
Purple = ACTIVE, Kollision unvermeidbar"*) wortlaut-genau
ausformuliert. Die Regel ist erfuellt: der Leser der
`ChannelBadge.tsx` sieht **beide** — den Spec-Wortlaut und
die Begruendung fuer die Abweichung — ohne diesen ADR
oeffnen zu muessen.

### Umfang Sub-Phase 6.3

Insgesamt 11 Dateien betroffen:

**Neu (3):**
- `src/app/dashboard/conversations/page.tsx` — Server Component List-View
- `src/app/dashboard/conversations/ConversationsFilter.tsx` — Client Filter-Tabs
- `src/app/dashboard/conversations/ChannelBadge.tsx` — Wiederverwendbare Badge-Komponente

**Modifiziert (8):**
- `src/app/api/dashboard/conversations/route.ts` — channel-Filter + channel im Response
- `src/app/api/dashboard/conversations/[id]/route.ts` — channel im Response
- `src/app/api/dashboard/leads/route.ts` — nested channel im Select
- `src/app/dashboard/page.tsx` — "Alle anzeigen →"-Link im "Letzte Gespraeche"-Block
- `src/app/dashboard/conversations/[id]/page.tsx` — ConversationDetail-Interface + ChannelBadge-Import + Render im Header
- `src/app/dashboard/crm/page.tsx` — CrmLead-Interface + ChannelBadge-Import + Render in LeadCard
- `docs/decisions/phase-6-dashboard-widget.md` — dieser Eintrag
- `PROJECT_STATUS.md` — Phase-6.3-Historie

Plus: `docs/tech-debt.md` war bereits dirty mit dem
Phase-6.1-Hydration-Failure-Eintrag aus dem Debug-Vorfall
vor 6.2 — wurde im selben 6.3-Commit mitgenommen.

### Verifikation der KPI "Aktive Gespraeche"

Das 6.3-Briefing verlangte eine Verifikation, dass die
KPI-Kachel "AKTIVE GESPRÄCHE" auf dem Haupt-Dashboard
WhatsApp **und** Web summiert. Ergebnis der Pruefung in
`src/app/api/dashboard/stats/route.ts` Z. 35-37:

```typescript
db.conversation.count({
  where: { tenantId, status: "ACTIVE" },
}),
```

Der Query filtert **ausschliesslich auf `tenantId` und
`status`**, **nicht** auf `channel`. Damit zaehlt die KPI
**automatisch beide Kanaele** — seit Phase 2 (Schema-Migration
mit `channel`-Enum-Default WHATSAPP) und seit Phase 3
(processMessage mit `channel: "WEB"` fuer das Widget). **Kein
Fix noetig.** Der Query ist seit Phase 2 kanal-agnostisch.

### Reversibilitaet

Alle sechs Aenderungen sind Two-Way-Door:

- Neue `/dashboard/conversations`-Route loeschen = zurueck zu
  verteilten Displays
- ChannelBadge-Extraktion rueckgaengig = inline in drei Files
- URL-Query-Parameter → Cookie/State moeglich ohne
  Frontend-Breakage
- Prisma-Direct-Load → API-Fetch moeglich ohne
  Schema-Aenderung
- Channel-Filter in der API rueckgaengig = das optionale
  Parameter wird einfach ignoriert

Keine One-Way-Doors.

---

## Sub-Phase 6.4 — E2E-Smoke-Test-Ergebnis

**Datum:** 2026-04-12
**Tester:** Project Owner (manueller Browser-Durchlauf)
**Befund:** Alle 7 End-to-End-Kriterien verifiziert, Phase 6
als abgeschlossen markiert.

### Test-Setup

- **Dev-Server:** Port 3000, `.next/` wurde vor dem Test frisch
  neu kompiliert (`rm -rf .next && npx next dev`) — Phase-6.1-
  Lesson-Learned angewandt, dass Multi-File-Commits im laufenden
  Dev-Server Tailwind-4-Hot-Reload-Korruption ausloesen koennen
- **Tenant:** internal-admin (`cmnpufc400000poldrd72wdu5`)
- **Plan-Override:** `paddlePlan` temporaer auf `"growth_monthly"`
  gesetzt via `src/scripts/upgrade-test-tenant.ts`. Idempotent,
  nicht-destruktiv, aktualisiert ausschliesslich das `paddlePlan`-
  Feld. Dadurch `hasPlanFeature(..., "web_widget") = true`, und
  die Widget-Settings-Page zeigt die vollstaendige UI statt des
  `UpgradePrompt`-Banners
- **Login:** ueber `dashboard-links.txt`-Magic-Link nach
  Token-Rotation via `src/scripts/rotate-dashboard-token.ts`
- **Widget-Demo:** `public/widget-demo.html` als Mockup einer
  Kunden-Webseite (Atelier Hoffmann), von Phase 5 uebernommen

### Die 7 verifizierten Punkte

1. **Widget-Loader laedt auf Host-Seite.** Der Floating-Bubble-
   Button erscheint unten rechts auf der Demo-Seite, der
   Phase-5-Embed-Script-Flow funktioniert. DSGVO-Consent-Modal
   oeffnet sich beim ersten Klick. Nach Consent laeuft die
   Konversation mit echtem Bot-Response-Pfad (kein Mock).

2. **Conversation-Persistenz mit Channel-Marker.** Die neue
   Web-Session wird in der DB als `Conversation` mit
   `channel: "WEB"` angelegt. Dies bestaetigt den Phase-2-
   Schema-Enum und den Phase-1-processMessage-Aufruf mit
   `channel: "WEB"` im Widget-Message-Handler.

3. **Dashboard-List-View zeigt neue Session.**
   `/dashboard/conversations` zeigt die neue Conversation mit
   dem **ChannelBadge "Web" (Sky-Blau)**, Status `Aktiv`, und
   Lead-Score 30. Die Sub-Phase-6.3-UI-Arbeit funktioniert
   end-to-end.

4. **Detail-View mit entschluesselten Messages + Channel-Badge.**
   Klick auf die Conversation oeffnet
   `/dashboard/conversations/[id]`. Der komplette Chat-Verlauf
   ist sichtbar, alle Messages sind **korrekt AES-256-GCM-
   entschluesselt** (Phase-1-Verschluesselungs-Pipeline via
   `decryptText()`), der Channel-Badge ist im Header neben der
   maskierten ID sichtbar (Sub-Phase-6.3-Integration).

5. **Lead-Scoring-Pipeline auto-triggered.** Ein Lead wird
   mit Score 30/100, Qualification MQL, Pipeline NEU automatisch
   angelegt. Das bestaetigt die Phase-1-`runScoringPipeline`-
   Async-Pipeline (GPT-4o-basiertes Scoring), die jetzt auch
   fuer Web-Channel-Conversations laeuft — kanal-agnostisch
   wie in Phase 1 designed.

6. **Sprach-Erkennung DE.** Die Conversation hat
   `language: "de"` im DB-Record, was dem Default-Wert aus
   Phase 2 entspricht. Das Phase-2-Schema-Migration-Default
   (`language String @default("de")`) funktioniert fuer Web-
   Sessions unveraendert.

7. **Kanal-agnostische Bot-Logik bestaetigt.** Der Bot-Response-
   Pfad (System-Prompt-Loading via `loadSystemPrompt`,
   Claude-Call via `generateReply`, Lead-Scoring via
   `scoreLeadFromConversation`) ist identisch mit dem
   WhatsApp-Pfad. Phase 1 hat den Kern korrekt extrahiert —
   das Web-Widget ist damit technisch das **zweite konsumierende
   Transport-Layer** einer unveraenderten Business-Logik.

### Klarstellung: "Bot antwortet auf Möbel-Frage ueber AI Conversion"

Waehrend des Tests ergab sich eine Beobachtung, die auf den
ersten Blick wie ein Bug aussieht: Der User stellte eine
Frage ueber Moebel (passend zur "Atelier Hoffmann"-Demo-Seite),
und der Bot antwortete **mit Informationen ueber AI Conversion**
(die SaaS-Plattform selbst), nicht ueber Moebel.

**Das ist KEIN Bug, sondern die erwartete Konfiguration des
Test-Setups.** Begruendung:

- **Demo-Seite ist ein Mockup:** `public/widget-demo.html`
  ist ein **Template** fuer die Visualisierung eines
  hypothetischen Pilot-Kunden "Atelier Hoffmann" (Moebel-
  Werkstatt). Es ist **keine echte Kunden-Website**. Das
  Widget laedt nur die Demo-Page-Grafik — den Bot-
  System-Prompt liefert der Tenant, nicht die Host-Seite.
- **Tenant ist internal-admin:** Der eingebettete `data-key`
  zeigt auf den internal-admin-Tenant der AI Conversion
  Plattform selbst. Dessen `systemPrompt`-Feld ist leer
  (aus `seed-internal-admin.ts:59` `systemPrompt: ""`),
  sodass der Default-System-Prompt aus
  `src/modules/bot/system-prompts/` genutzt wird. Dieser
  Default-Prompt ist auf die Qualifizierung von Leads fuer
  **AI Conversion selbst** kalibriert (das Produkt, das wir
  hier bauen) — nicht auf Moebelberatung
- **Erwartungs-Semantik:** Ein echter Pilot-Kunde "Moebel-
  Werkstatt Hoffmann" wuerde einen **eigenen Tenant** haben,
  dessen `systemPrompt` auf Moebel-Beratung und
  Moebel-Lead-Qualifizierung konfiguriert ist. Dessen
  `webWidgetPublicKey` wuerde in das `data-key`-Attribut
  eingebettet, nicht der internal-admin-Key

Die Beobachtung ist also ein **Artefakt der Test-Setup-
Verkettung**, kein Verhaltensfehler. Aus Sicht der Phase-6-
Kriterien (Dashboard-Integration funktioniert, Widget laedt,
Bot antwortet, Lead wird angelegt, Channel-Tracking greift)
**ist alles erfuellt** — die inhaltliche Passung des
System-Prompts zum Mockup-Branding der Demo-Seite ist
ausserhalb des Test-Scopes.

Fuer Phase 7 relevant: falls ein Pilot-Kunde sich wuenscht,
**sein** Widget auf einer Test-Seite auszuprobieren, braucht
er einen eigenen Tenant + eigenen System-Prompt + eigenen
Public-Key. Das Onboarding-Dashboard-Skelett (`/onboarding`)
existiert bereits.

### Test-Setup-Cleanup nach 6.4

- `src/scripts/upgrade-test-tenant.ts`: liegt nach 6.4 als
  untracked im Working Tree. Entscheidung ueber Aufbewahrung
  (eigener `chore(scripts)`-Commit) oder Loeschung ist separat
  zu treffen, kein Teil des Phase-6-Abschluss-Commits
- `internal-admin.paddlePlan`: weiterhin auf `"growth_monthly"`
  gesetzt (lokale DB, nicht in Git getrackt). Das DB-Rollback
  auf `null` ist nicht noetig, weil die lokale Entwicklungs-DB
  nicht in Production abgebildet ist
- `public/widget-demo.html`: kann lokal mit echtem Public-Key
  belassen oder wieder auf den Placeholder zurueckgesetzt
  werden. Sub-Phase-6.2-Commit hat die Placeholder-Variante
  persistiert; jede lokale Anpassung fuer Tests bleibt
  gitignored-aehnlich durch bewusste User-Entscheidung

### Phase-6-Status

**Alle 4 Sub-Phasen abgeschlossen:**

| Sub-Phase | Scope | Status |
|---|---|---|
| 6.1 | Pre-Analyse + Verifikation | ✅ |
| 6.2 | Widget-Settings-Page + API + Helper | ✅ (Commit `029f2a1`) |
| 6.3 | Channel-Filter in neuer Conversations-List-View | ✅ (Commit `018a9cb`) |
| 6.4 | E2E-Smoke-Test | ✅ (dieser Commit) |

**Naechster Schritt:** Phase 7 — Hardening.
- 10 Test-Szenarien aus `WEB_WIDGET_INTEGRATION.md` § "Phase 7:
  Testing & Hardening"
- Pilot-Kunden-Integration-Guide (siehe `docs/tech-debt.md`
  "Phase 5 — Pilot-Kunden-Integration-Guide fehlt")
- Security-Checkliste final durchgehen (siehe
  `WEB_WIDGET_INTEGRATION.md` § "Sicherheits-Checkliste")
- Falls `/widget-demo*` in Phase 7 dynamisch wird: Option E
  aus `phase-5-embed-script.md` pruefen (Migration zu
  `src/app/widget-demo/page.tsx` + Server-Component-Nonce-
  Injection, Demo-Route-CSP-Lockerung rueckbauen)

---

## Sub-Phase 6.5 — Settings-Navigation (Sidebar-Pattern)

**Status:** Umgesetzt im Commit dieser Sub-Phase.

### Kontext

Phase 6.2 hat die Widget-Settings-Page erstellt, Phase 4-pre
hatte schon die Bot-Prompt-Settings. Beide sassen bis dahin als
isolierte Einzel-Seiten unter `/dashboard/settings/*` ohne
Einstiegspunkt vom Haupt-Dashboard — der User musste die URLs
direkt kennen oder via Browser-History zurueckfinden. Zusaetzlich
gab es keinen visuellen Anhaltspunkt, welche Einstellungen
ueberhaupt existieren und welche noch kommen.

Sub-Phase 6.5 macht die Einstellungen zu einem **dedizierten
Bereich** mit eigener Navigation — konsistent mit dem Pattern
von Notion, Linear und Stripe.

### Drei Architektur-Entscheidungen

**(a) Sidebar statt Tab/Dropdown im Header**

Gewaehlt: dedizierte linke Sidebar unter `/dashboard/settings`.
Verworfen: ein Einzel-Dropdown im Haupt-Header oder ein Tab-
Submenue.

Begruendung:
- Sidebar skaliert sauber auf N Einstellungs-Bereiche (wir
  haben heute 2, planen 6+). Tab-Bars werden ab ca. 5 Tabs
  visuell ueberfrachtet
- Notion/Linear/Stripe-Pattern ist der heute akzeptierte
  Industry-Standard fuer Settings-Bereiche in SaaS-Dashboards.
  User erwarten diese Struktur
- Konsistente Permanent-Navigation innerhalb Settings, kein
  Ruecksprung-Zwang auf eine Uebersicht
- Ermoeglicht "Bald verfuegbar"-Placeholder als sichtbares,
  aber deaktiviertes Nav-Item

**(b) Coming-Soon-Items sichtbar, aber disabled**

Gewaehlt: die 4 noch nicht existierenden Settings-Bereiche
(*Profil & Account*, *Plan & Billing*, *HubSpot Integration*,
*Team & Mitglieder*) erscheinen in der Sidebar unter einem
"Bald verfuegbar"-Heading, mit reduziertem Kontrast,
`cursor-not-allowed`-Style und `aria-disabled="true"`-
Attribut.

Begruendung:
- Signalisiert dem Pilot-Kunden sofort *"da kommt mehr"* —
  Produkt-Reife wird wahrnehmbar gemacht, ohne Features zu
  versprechen, die noch nicht laufen
- Vermeidet den "toter Bereich"-Eindruck, den ein Kunde haette,
  wenn die Sidebar nur zwei Items zeigte
- Macht die Settings-Roadmap fuer den Kunden sichtbar, ohne
  einen separaten Changelog/Roadmap-Link
- Risiko-Bewertung: sollte Product-Management sich spaeter
  gegen ein angekuendigtes Feature entscheiden, waere das ein
  "broken promise". Fuer die 4 geplanten Features ist die
  Entscheidung aber bereits gefallen (HubSpot-Feature existiert
  bereits rudimentaer in `HubSpotSettings`-Component in
  `dashboard/page.tsx`, wird nur noch nicht in eine eigene
  Settings-Seite extrahiert)

**(c) Mobile-Hamburger direkt mitbauen**

Gewaehlt: responsive Sidebar mit Hamburger-Menue fuer
Viewports unter 640px (Tailwind `sm:`-Breakpoint). Verworfen:
*"Mobile-Support in einer spaeteren Phase nachruesten"*.

Begruendung:
- Der Dashboard-Zugang wird aus Pilot-Kunden-Feedback heraus
  auch mobil genutzt (QR-Code-Scan vor Ort, schneller Check
  der Leads auf dem Smartphone). Eine permanent sichtbare
  Sidebar ist auf Mobile unbenutzbar
- Nachruesten-Aufwand haette sich durch eine spaetere Phase
  doppelt: erst die Sidebar bauen ohne Mobile, dann spaeter
  den kompletten Responsive-Refactor hinterherziehen. Mit
  Tailwind ist der Mobile-Support praktisch kein Zusatzaufwand
  (ein paar `sm:`-Klassen mehr)
- Hamburger-Pattern ist standard mobile UX, User erwarten es

### Umsetzung (3 neue + 1 modifizierte Datei)

**Neu:**

- `src/app/dashboard/settings/layout.tsx` — Server Component,
  wrappt alle Settings-Routen in einen flex-Container mit
  linker Sidebar und `<main className="min-w-0 flex-1">`. Liefert
  das `bg-[#07070d] min-h-screen` auf Layout-Ebene.
- `src/app/dashboard/settings/SettingsSidebar.tsx` — Client
  Component mit `useState` fuer das Mobile-Hamburger-Open-State
  und `usePathname()` fuer den Active-State auf den aktiven
  Nav-Items. Enthaelt Hamburger-Button, Backdrop und die
  Sidebar selbst in **einer** Komponente. Auf `sm:` wird aus
  `fixed -translate-x-full` ein `static translate-x-0`.
- `src/app/dashboard/settings/page.tsx` — Server Component,
  neue Uebersichts-Landing-Page unter `/dashboard/settings`.
  Zeigt 2 aktive Settings-Cards + 4 Coming-Soon-Cards, plus
  Zurueck-Link zum Haupt-Dashboard.

**Modifiziert:**

- `src/app/dashboard/page.tsx` — neuer Tab-Eintrag
  *"Einstellungen"* in der Haupt-Nav des Dashboards (nach
  *Clients*, vor dem AI-Studio-Dropdown). `active`-State ist
  hardcoded `false` bzw. weggelassen, mit Kommentar der
  erklaert warum ein dynamischer `usePathname()`-Check hier
  immer `false` zurueckgeben wuerde (die Tab-Bar ist in
  `dashboard/page.tsx` eingebettet und rendert nur im Kontext
  von `/dashboard`). Ein echter, uebergreifender Active-State
  braeuchte ein `src/app/dashboard/layout.tsx`, das existiert
  heute nicht und ist Phase-7-oder-spaeter-Scope.

### Nicht angefasst

- `src/app/dashboard/settings/widget/page.tsx` (Phase 6.2) —
  unveraendert. Die existierenden `<div min-h-screen bg-[#07070d]>`-
  Wrapper werden durch das neue Layout doppelt gesetzt, sind
  aber visuell harmlos (gleiche Farbe, gleiche Semantik).
  Ein Refactor zur Layout-Integration ist Phase-7-Scope.
- `src/app/dashboard/settings/prompt/page.tsx` — dito.
- Keine existierende Dashboard-Top-Level-Page (crm, campaigns,
  broadcasts, clients) wurde angefasst. Diese sehen den neuen
  Settings-Tab erst, wenn sie sich selbst ein gemeinsames
  Dashboard-Layout teilen — das ist explizit nicht Teil von
  Phase 6.5

### Reversibilitaet

Alle Aenderungen sind Two-Way-Door:

- Sidebar loeschen = zurueck zu freistehenden Settings-Pages
- Layout.tsx loeschen = Pages funktionieren weiter (ihre
  eigenen Wrapper uebernehmen wieder)
- "Einstellungen"-Tab aus `dashboard/page.tsx` entfernen = eine
  Zeile weg
- Coming-Soon-Items zu realen Nav-Items upgraden = Array-Move
  vom `COMING_SOON_ITEMS` zum `ACTIVE_ITEMS` in
  `SettingsSidebar.tsx`, plus neue Settings-Page schreiben

Keine One-Way-Doors.

### Browser-Verifikation + Polish-Phase (2026-04-12)

**Tester:** Project Owner (manueller Browser-Durchlauf aller
12 Smoke-Test-Schritte, alle gruen)

Beim manuellen Durchlauf der Sub-Phase 6.5 im Browser wurden
**3 visuelle Bugs** identifiziert und in 2 Fix-Commits behoben:

**Bug 1 — Toggle-Handle unsichtbar + asymmetrisch**

- **Symptom:** Der Widget-Enable/Disable-Toggle auf der
  Settings-Page hatte einen unsichtbaren Handle (gleiche Farbe
  wie der Track-Hintergrund) und sprang beim Aktivieren
  asymmetrisch nach rechts
- **Root-Cause:** Handle war `bg-gray-300` auf einem aehnlich
  hellen Track, und `translate-x-5` (20px) stimmte nicht mit
  der Track-Breite ueberein
- **Fix (Commit 4cc1db0):** Handle auf `bg-white` gesetzt,
  translate-x-[22px] fuer symmetrische Position im 48px-Track

**Bug 2 — Embed-Code-Snippet Overflow**

- **Symptom:** Das Embed-Code-Snippet auf der Widget-Settings-
  Page lief horizontal ueber den Container hinaus, mit
  sichtbarer Phantom-Scrollbar
- **Root-Cause:** Kein `padding-right` fuer den
  absolut-positionierten Copy-Button, und eine globale
  `scrollbar-width: thin`-Regel in `globals.css` (Klasse
  `.navy-700-scrollbar`) erzeugte eine sichtbare Scrollbar
  auf dem `<pre>`-Element
- **Fix (Commit 4cc1db0):** `pr-20` auf dem Snippet-Container
  fuer Button-Platz, plus `scrollbar-hide`-Utility-Klasse in
  `globals.css` (`scrollbar-width: none` +
  `::-webkit-scrollbar { display: none }`)

**Bug 3 — Copy-Button auf Mobile nicht erreichbar**

- **Symptom:** Der Copy-Button lag als absolut-positioniertes
  Overlay ueber dem Snippet und war auf schmalen Viewports
  vom Snippet-Text ueberdeckt bzw. nicht als eigenstaendiges
  Touch-Target erkennbar
- **Root-Cause:** `absolute top-2 right-2`-Positionierung
  funktioniert auf Desktop, aber auf Mobile fehlt der visuelle
  Kontext eines separaten Buttons
- **Fix (Commit 94bf6d6):** Responsive Loesung — auf Desktop
  (`sm:`) bleibt der Button absolut positioniert, auf Mobile
  wird er als eigenstaendiger Full-Width-Button unter dem
  Snippet gerendert

### Lessons Learned aus der Polish-Phase

**Diagnose vor Fix hat uns bei Bug 1 und Bug 2 vor falschen
Fixes bewahrt:**

- Bei Bug 1 sah das Symptom nach einem asymmetrischen Translate
  aus, tatsaechlich war das primaere Problem die unsichtbare
  Handle-Farbe (fehlendes `bg-white` statt `bg-gray-300`). Der
  Translate-Fix allein haette das Handle weiterhin unsichtbar
  gelassen
- Bei Bug 2 sah das Symptom nach einer fehlenden Scrollbar-
  Unterdrueckung aus, tatsaechlich war der Trigger eine globale
  `.navy-700-scrollbar`-Klasse in `globals.css`, die das
  `<pre>`-Element unerwartet beeinflusste. Ein naiver
  `overflow-hidden`-Fix haette den Horizontal-Scroll komplett
  unterdrueckt statt die Phantom-Scrollbar gezielt zu verstecken

CLAUDE.md Regel 3 (Diagnose vor Code-Change) hat sich damit
erneut als wertvolle Heuristik bestaetigt — auch bei
"offensichtlich kleinen" UI-Bugs.
