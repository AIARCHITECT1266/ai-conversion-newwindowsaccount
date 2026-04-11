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
