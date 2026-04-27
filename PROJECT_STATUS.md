# Projekt-Status — AI Conversion Web-Widget

**Letzte Aktualisierung:** 2026-04-27
**Aktuelle Phase:** MOD-Demo-Vorbereitung (Call 29.04. Dienstag); Phase Umlaut-Consistency-Pass committed (62 String-Edits in 22 Files, ASCII-Ersatz → ä/ö/ü/ß), naechster Schritt: Production-Verifikation
**Letzter Commit:** 4619f1b (Umlaut-Consistency-Pass + .next-Cleanup) — Vercel-Deploy folgt nach Push

---

## Phase Umlaut-Consistency-Pass (27.04.2026)

Pre-Demo-Polish: User-facing Strings mit ASCII-Ersatz
(ae/oe/ue/ss) auf korrekte deutsche Umlaute (ä/ö/ü/ß)
umgestellt. Vorausgegangen: Umlaut-Audit-Phase am
selben Tag (58 Treffer in 22 Files identifiziert + 4
Audit-Luecken-Funde wahrend Implementation).

**Aenderung:** 62 punktuelle String-Edits in 22 Files
(58 spec'd + 4 Konsistenz-Edits binnen derselben Files):
- 13 Treffer in 9 Dashboard-Components
  (DashboardTopNav, KpiCards, ActionBoard, YesterdayResults,
  HottestLeads, ChannelTeaser, ConversationAnalyticsTeaser,
  TrendChart, TopSignals)
- 14 Treffer in 8 Dashboard-Pages (page, conversations,
  appointments, assets/generator, assets/ai-modul, settings,
  SettingsSidebar, settings/widget, settings/scoring)
- 18 Treffer in 11 API-Routes (widget/, widget-config/,
  admin/, settings/scoring, paddle/webhook, whatsapp/webhook)
- 3 Treffer in lib + Default-Templates (test-mode.ts,
  campaigns/templates/route.ts)
- 4 Konsistenz-Edits binnen Files
  (HottestLeads:210 "Heißeste Leads jetzt",
  ActionBoard:355 "Lade nächste Schritte ...",
  generator:48 "wähle ein KI-Modell",
  conversations:260 "Filter zurücksetzen")

**Kein Bot-System-Prompt angefasst:** Borderline-Kategorie
laut Audit (System-Prompts werden nicht direkt an User
gesendet, beeinflussen aber Claude-Output-Stil). Eigene
Pilot-Phase via TD-Pilot-Bot-Prompts-Umlaut-Cleanup.

**Inkonsistenz-Auflösung:** API-Routes hatten gemischt
"Ungültige" (mit Umlaut) und "Ungueltige" (ohne) — alle
jetzt einheitlich "Ungültige …".

**Build-Verifikation:** `npx next build` clean (zwei Builds:
einmal nach Initial-Edits, einmal nach 4 Konsistenz-Edits).

**Tenant-Isolation:** Reine String-Aenderungen. Keine Logik-
Aenderungen, keine DB-Touches, keine WHERE-Clauses.
Unveraendert.

**Tech-Debt-Aufnahme:** TD-Pilot-Bot-Prompts-Umlaut-Cleanup
als 🟡 SHOULD-FIX-IF-TRIGGERED in `docs/tech-debt.md`. Inkl.
Doku der Audit-Lueckenfunde (4 weitere Bot-Templates in
campaigns/templates/route.ts und 3 "spaeter"-Treffer in
widget-Rate-Limit-Errors), die NICHT angefasst wurden.

---

## Phase Archive-Followup-Phantom-Scripts (27.04.2026)

---

## Phase Archive-Followup-Phantom-Scripts (27.04.2026)

Phase 3 von 3 im Followup-Phantom-Cleanup-Plan. Vorausgegangen:
Cleanup-Skript-Phase (Commit 9ed3341), gefolgt von User-
ausgefuehrtem Cleanup ueber alle 5 Stages — 168 Phantom-Messages
aus 4 Tenants entfernt (MOD-B2C 63, ai-conversion-marketing 42,
internal-admin 39, MOD-B2B 3, plus 21 zusaetzliche Treffer
zwischen Inventur 27.04. morgens und Cleanup-Run am Mittag —
vermutlich Cron-Trigger 27.04. 11:00 MESZ vor Vercel-Deploy
des Cron-Disable-Commits f371b76).

**Aenderung:** Beide Diagnose-Skripte verschoben nach
`src/scripts/_archived/`:
- `inventory-followup-phantoms.ts` → `_archived/inventory-followup-phantoms.ts`
- `cleanup-followup-phantoms.ts` → `_archived/cleanup-followup-phantoms.ts`

Status-Header in beiden Skripten erweitert um `ARCHIVED 27.04.2026`-
Vermerk + Erfolgs-Note + Hinweis auf Re-Use als Referenz fuer
TD-Pilot-Followup-Mechanismus-Rewrite.

`git mv` (preserves history) statt manueller Loesch-und-Neu-Erstellung.

**Build-Hotfix wahrend der Phase:** Move brach Import-Pfade.
`import { PrismaClient } from "../generated/prisma/client"` (relativ
zu `src/scripts/`) musste auf `"../../generated/prisma/client"`
korrigiert werden (relativ zu `src/scripts/_archived/`). Beide
Skripte angepasst.

**Build-Verifikation:** `npx next build` clean.

**Tenant-Isolation:** Reine File-Move-Operation. Keine Code-Logik,
keine DB-Touches, keine API-Aenderungen. Tenant-Isolation
unveraendert.

**Tech-Debt-Status:** Keine neue Schuld.
TD-Pilot-Followup-Mechanismus-Rewrite bleibt offen — die
archivierten Skripte dienen dort als Referenz fuer
Identifizierungs-Strategie.

**Repo-Hygiene-Effekt:** `src/scripts/` ist um 2 Eintraege
schlanker. `src/scripts/_archived/` ist neu, fungiert ab jetzt
als Standard-Ablage fuer einmalige Diagnose-Skripte
(`verify-mod-tenant-isolation.ts` und `diagnose-mod-demo-leads.ts`
sind Kandidaten fuer den naechsten Archiv-Schub).

---

## Phase Followup-Phantom-Cleanup-Skript (27.04.2026)

---

## Phase Followup-Phantom-Cleanup-Skript (27.04.2026)

Phase 2 von 3 im Followup-Phantom-Cleanup-Plan. Vorausgegangen:
Inventur-Skript (Phase 1, Commit e0855fc) bestaetigt 147 Phantom-
Messages ueber 4 Tenants; Cron entfernt aus vercel.json
(Commit f371b76).

**Aenderung:** Neues Cleanup-Skript
`src/scripts/cleanup-followup-phantoms.ts` — transaction-safe
Hard-Delete mit Default-DRY-RUN, ENV-Trigger `CLEANUP_COMMIT=true`
fuer echten DELETE, optional `--tenant=<slug>` Filter fuer
staged Cleanup.

**Skript-Architektur:**
- ENV-Loading: `.env.production.local` mit `override: true`
  (analog Inventur)
- Host-Preview ohne Credentials (Regex `@([^:/?]+)`)
- CLI-Arg `--tenant=<slug>` mit Slug-Format-Validierung
  (a-z0-9-only, verhindert SQL/argv-Injection)
- Pre-Count via `$queryRaw` mit Identifizierungs-Strategie
- `$transaction` mit `Serializable`-Isolation, Timeout 60s
- ID-Snapshot innerhalb TX, dann entweder DRY_RUN_ABORT-Throw
  (sauberer Rollback) ODER `deleteMany` mit Count-Mismatch-Check
- Post-Verify ausserhalb TX (nur bei COMMIT): erneuter Count
  muss 0 sein, sonst exit 1

**Lead-Marker bewusst NICHT zurueckgesetzt:** `lead.followUpCount`
und `lead.lastFollowUpAt` bleiben unveraendert — forensische
Spur, dass diese Leads im Cron-Zeitraum 13.04.-26.04. erfasst
wurden. Pilot-Phase (TD-Pilot-Followup-Mechanismus-Rewrite)
entscheidet ueber semantische Neudefinition.

**Build-Verifikation:** `npx next build` clean.

**Tenant-Isolation:** Identifizierungs-Query joint via
`leads.tenantId`. Mit `--tenant=<slug>`-Filter: `WHERE t.slug = ...`
garantiert Single-Tenant-Scope. Ohne Filter: cleanup ueber
alle 4 betroffenen Tenants, jede Message via conversationId
einem Lead und damit einem Tenant zugeordnet — kein
Cross-Tenant-Cascade.

**Naechste Schritte (manuell durch User):**
- Stage 1: `npx tsx src/scripts/cleanup-followup-phantoms.ts
  --tenant=mod-education-demo-b2c` → erwartet "Plan: 63 (DRY-RUN)"
- Stage 2: `CLEANUP_COMMIT=true` setzen + Stage-1-Befehl wiederholen
  → erwartet "Deleted: 63" + "Post-Cleanup-Count: 0", visuelle
  Verifikation auf Amir-Conversation
- Stage 3: ohne `CLEANUP_COMMIT` und ohne `--tenant` → erwartet
  "Plan: 84 (DRY-RUN)"
- Stage 4: mit `CLEANUP_COMMIT=true` → erwartet "Deleted: 84"
- Stage 5: `npx tsx src/scripts/inventory-followup-phantoms.ts`
  → erwartet "(keine Eintraege)" und strict_count=0

**Skript-Lifecycle:** Diagnostisch, nicht wiederholbar. Nach
erfolgreicher Stage 5 zu archivieren in `src/scripts/_archived/`
(zusammen mit Inventur-Skript).

---

## Phase Followup-Phantom-Inventory (27.04.2026)

---

## Phase Followup-Phantom-Inventory (27.04.2026)

Phase 1 von 3 im Followup-Phantom-Cleanup-Plan. Vorausgegangen:
Audit am Vormittag hat Identifizierungs-Strategie etabliert
(role + followUpCount + 09:00-09:04:59 UTC + No-User-Vorlauf).

**Aenderung:** Neues read-only Diagnose-Skript
`src/scripts/inventory-followup-phantoms.ts` (analog Pattern
`src/scripts/check-db.ts`: PrismaPg + dotenv-Load). Drei Queries:
- Tenant-Aggregat (Phantom-Counts pro Tenant)
- MOD-B2C-Detail (Conversation-Liste mit Lead/Message-Counts)
- Diagnose-Sanity-Check (5min-strict vs. 30min-loose Fenster)

DSGVO-safe: nur Slugs, Counts, technische cuid-IDs und
Timestamps — keine Lead-Namen, keine Nachrichten-Inhalte
(contentEncrypted wird nicht entschluesselt).

**Build-Verifikation:** `npx next build` clean. Zwei Type-
Hotfixes wahrend Build: printTable-Generic-Constraint von
`Record<string, unknown>` auf `object` mit Cast (Prisma-
Result-Types haben keine String-Index-Signature), und
BigInt-Literal `0n` durch `Number(...)` mit Conditional
ersetzt (TS-Target unter ES2020).

**Tenant-Isolation:** Read-only Query, keine DB-Aenderungen.
Tenant-Isolation unveraendert.

**Naechster Schritt:** Skript ausfuehren via
`npx tsx src/scripts/inventory-followup-phantoms.ts`,
Output an ConvArch fuer Cleanup-Scope-Entscheidung
(Phase 2: tatsaechliches Cleanup-Skript mit Transaction).

**Env-Fix-Hotfix (gleicher Tag):** Erste Skript-Ausfuehrung
ergab 0 Treffer, weil dotenv defaultmaessig `.env.local`
laedt (Dev-DB). Skript umgestellt auf
`.env.production.local` mit `override: true`. Zusaetzlich:
Host-Preview ohne Credentials (Regex `@([^:/?]+)` extrahiert
nur den Hostname-Teil — Username + Password werden NICHT
geloggt, konform mit CLAUDE.md-Sicherheits-Regel).

**Inventur-Ergebnis (gegen Production-DB):**
- 4 Tenants betroffen (alle aktiven Tenants):
  - mod-education-demo-b2c: 29 Leads, 63 Phantoms (22.04.-26.04.)
  - ai-conversion-marketing: 14 Leads, 42 Phantoms (16.04.-25.04.)
  - internal-admin: 13 Leads, 39 Phantoms (13.04.-16.04.)
  - mod-education-demo-b2b: 1 Lead, 3 Phantoms (23.04.-25.04.)
- Gesamt: 57 Leads, 147 Phantom-Messages
- Alle Timestamps EXAKT 09:00 UTC (Cron praezise, 5min-Window
  grosszuegig genug)
- Earliest 13.04., latest 26.04. → Cron lief ~14 Tage aktiv

**Sanity-Check-Anomalie (erklaert):** strict_count=147 vs.
loose_count=57. Diff -90 ist KEIN Pathologie-Signal, sondern
Folge der `lead.lastFollowUpAt`-Ueberschreibung: pro Lead
zeigt das Feld nur den LETZTEN Cron-Trigger, daher findet
das 30min-Loose-Fenster pro Lead max. 1 Message (= 57 Leads).
Strict_count zaehlt ueber alle Stufen (Σ followUpCount = 147).
Strict-Strategie ist die richtige Loesung; die Loose-Query ist
konzeptionell limitiert wegen Marker-Ueberschreibung.

**Skript-Lifecycle:** Diagnostisch, nicht wiederholbare
Infrastruktur. Nach erfolgreichem Cleanup zu archivieren in
`src/scripts/_archived/` (analog Pattern in
verify-mod-tenant-isolation.ts:11).

---

## Phase Pre-Demo-Cron-Disable (27.04.2026)

Audit am Vormittag (27.04.) hat eine Phantom-Follow-Up-Message
auf der MOD-B2C-Test-Conversation "Amir" zurueckverfolgt zum
Vercel-Cron `/api/cron/followup`. Source: hardcoded Templates
in `src/app/api/cron/followup/route.ts:14-31`, getriggert
taeglich `0 9 * * *` UTC = 11:00 MESZ via `vercel.json`.
Templates verstossen gegen mehrere Mara-Spec-Regeln (Sie/Du-
Bruch, Emojis 👋📅🙏, Wiederholungs-Begruessung, Anti-Sales:
"unverbindliches Angebot" + "Beratungstermin", Tenant-`brandName`
in User-facing-Text). Cross-Tenant-Reichweite: WHERE-Klausel
ohne Per-Tenant-Toggle, jeder aktive Tenant betroffen.

**Aenderung:** Cron-Eintrag fuer `/api/cron/followup` aus
`vercel.json` entfernt. Verbleibender Cron `/api/cron/cleanup`
unveraendert (`0 3 * * *`). Route-File
`src/app/api/cron/followup/route.ts` bleibt erhalten fuer
Pilot-Phase-Refactor-Reuse — kein Code-Loesch.

**Tech-Debt-Aufnahme:** TD-Pilot-Followup-Mechanismus-Rewrite
als 🟡 SHOULD-FIX-IF-TRIGGERED in
`docs/tech-debt.md`. Anforderungen: Per-Tenant-Toggle,
Mara-Bot-Aufruf statt hardcoded Templates, WhatsApp Business
Policy approved Templates, DSGVO-Opt-In, Settings-UI-Schalter.

**Build-Verifikation:** `npx next build` clean.

**Tenant-Isolation:** Verbessert. Vorher: Cron iterierte
cross-tenant ohne Per-Tenant-Toggle. Jetzt: kein Cron, kein
Cross-Tenant-Touch.

**Offenes Pre-Demo-Item:** Phantom-ASSISTANT-Messages auf
der MOD-B2C-Amir-Conversation muessen manuell aus der
Production-DB geloescht werden, damit die Demo-Conversation
clean ist. Nicht Teil dieses Commits — separater Schritt
mit Production-DB-Zugriff erforderlich.

**Verifikations-Luecke (offen):** Audit konnte nicht
abschliessend klaeren, ob der Cron die ASSISTANT-Messages
tatsaechlich via WhatsApp Cloud API oder Web-Widget-Poll
an Lead-Endgeraete gepusht hat, oder ob sie nur als
DB-Phantom existierten. Aenderung nichts daran — Cron-Disable
ist in beiden Faellen die richtige Aktion. Compliance-Frage
bleibt fuer Pilot-Phase offen (vor Re-Aktivierung klaeren).

---

## Phase KPI-Label-Precision (27.04.2026)

Minimal-invasive Pre-Demo-Schaerfung. Audit am Vormittag (kein
Code-Change, nur Report) hat gezeigt: Das KPI-Card-Label
"Konversionsrate" ist semantisch irrefuehrend — die Berechnung
ist `(OPPORTUNITY + CUSTOMER aktueller Stand) / total-leads-7d`,
also eine Qualifizierungs-Quote, keine klassische Sales-Conversion-
Rate. Senior-Sales-Buyer wuerden mit hoher Wahrscheinlichkeit
"X% wovon?" fragen und die Antwort waere unsauber, weil das
Label und die tatsaechliche Berechnung divergieren.

**Aenderung:** Eine String-Aenderung in
`src/app/dashboard/_components/KpiCards.tsx:436` —
"Konversionsrate · letzte 7 Tage" →
"Lead-Qualifizierungs-Quote · letzte 7 Tage". Kein Logik-Change,
kein API-Touch, kein Schema-Touch. Code-Kommentare im selben File
unveraendert (sie beschreiben die unveraenderte Berechnung).

**Tech-Debt-Aufnahme:** TD-Post-Demo-Konversionsrate-Tooltip-und-
Customer-Quote als 🟡 SHOULD-FIX-IF-TRIGGERED. Zwei tiefere
Schwaechen bleiben (Tooltip am Card-Header, separate Customer-
Conversion-Quote), Trigger ist Pilot-Feedback oder CRM-Sync-
Verfuegbarkeit fuer CUSTOMER-Stage.

**Build-Verifikation:** `npx next build` clean.
- /dashboard: 125 kB Page-Code, 339 kB First Load JS
- Delta gegenueber Phase 2e: +1 kB Page (laengerer Label-String)

**Tenant-Isolation:** Unveraendert. Reine UI-String-Aenderung,
keine WHERE-Clauses, keine Auth-Pfade beruehrt.

---

## Phase 2e — Demo-Haertung (26.04.2026)

Build-Prompt 5a + drei Mini-Prompts auf feature/dashboard-demo-hardening,
dann Merge nach master in Sonntag-Abend-Session. Schliesst die
Pflicht-Items vor der MOD-Demo ab und persistiert die Sonntag-
Vormittag-Discovery-TDs.

**Sub-Phase 5.0 — Audit (BLOCKING):**
Conversation-Detail-Page-Audit clean (Route src/app/dashboard/
conversations/[id]/page.tsx, ID-Field `id`). Pattern-Inventur
identifizierte Settings-Sidebar Coming-Soon, KpiCards
SCORE_COLORS/QUALIFICATION_ORDER, action-board getBerlinDayWindow
als Reuse-Quellen.

**Sub-Phase 5.1 — Yesterday-Results-Section (2f2f78c):**
Neuer Endpoint `/api/dashboard/yesterday` — tenant-isoliert,
Berlin-DST-aware via getBerlinDayWindow(daysOffset=-1).
Component `_components/YesterdayResults.tsx` rendert 4 Bar-Cards
(OPPORTUNITY/SQL/MQL/UNQUAL, CUSTOMER faellt weg als
pre-Customer-Trichter), actionable-Zeile + topSignal-Zeile
konditional. Color-Mapping matched KpiCards SCORE_COLORS.
Berlin-Helper als shared util `src/lib/timezone-berlin.ts`
extrahiert (action-board nutzt jetzt Import).

**Sub-Phase 5.2 — Action-Board-Header Tagesbilanz (d426b4f):**
Header zeigt drei Counts statt aggregierter Total: "N Leads
warten · M in den letzten 24h kontaktiert · K Termine heute".
flex-wrap auf Mobile. Singular/Plural pro Count.

**Sub-Phase 5.3 — Detail-Page-Polish (entfaellt):**
Audit in 5.0 war clean — kein Polish noetig.

**Sub-Phase 5.4 — Click-in-Konversation (48db28a):**
LetzteGespraeche-Items als `<Link href="/dashboard/conversations/<id>">`.
Hover-State praegnanter (border-25%, bg-04), focus-visible-Outline
mit gold-Akzent fuer Tastatur-Accessibility.
"Alle anzeigen"-Footer-Link bleibt.

**Sub-Phase 5.5 — Termine-Tab + Coming-Soon-Page (b3373ab):**
DashboardTopNav: neuer Termine-Tab zwischen Broadcasts und Clients,
comingSoon: true (Pattern-Konsistenz mit Clients). Neue Page
`src/app/dashboard/appointments/page.tsx` — statische Server
Component, Hourglass-Header + Serif-Headline + Pilot-Hinweis +
Provider-Pills (Calendly · Cal.com · Microsoft Bookings · iCal).

**Sub-Phase 5.6 — tech-debt.md 3-Klassen-Refactor (73b16b2):**
Klassifikations-Index am Anfang: 🔴 MUST-FIX (8 Eintraege) /
🟡 SHOULD-FIX-IF-TRIGGERED (25+) / 🟢 NICE-TO-HAVE (~14) /
✅ ERLEDIGT (7). Body bleibt chronologisch (Per-Phase-Struktur),
Index oben gibt Priority-View. TD-Pre-Demo-1 + TD-Pre-Demo-2
beide ERLEDIGT-markiert.

**Mini-Prompt — Section-Reorder (53f1fc6):**
YesterdayResults-Section ueber TrendChart geschoben.
Operations-Ritual: "Was ist gestern passiert?" ist die erste
Frage im Daily-Meeting.

**Mini-Prompt — Token-Hygiene-Refactor (cabb58e + 98f2848):**
dashboard-links.txt jetzt zwei-Sektionen-Struktur:
`=== AKTUELLE TOKENS ===` (ein Block pro slug+env) +
`=== ARCHIV (alte Tokens, ungueltig) ===` (chronologisch
absteigend). Helper `src/lib/dev-tools/token-file-writer.ts`
mit atomarem Read-modify-write. Alle 4 Token-Scripts
(refresh-mod-magic-links, rotate-dashboard-token,
seed-internal-admin, seed-test-tenant-b) auf den Helper
umgestellt. Initial-Migration: gesamter alter Datei-Bestand
landet beim ersten Run im ARCHIV.

**Mini-Prompt — Sonntag-Discovery-TDs (fb6510f):**
8 neue TDs aus Sonntag-Vormittag-Whiteboard mit Philipp
persistiert: TD-Pre-Demo-3 (KPI-Vergleichszeitraum-Audit),
TD-Pilot-Lead-Source-Attribution + TD-Pilot-Channels-Reiter
(Channel-Tracking-Strang fuer MOD-Pilot),
TD-Pilot-Gestern-Channel-Hauptquelle + TD-Pilot-HottestLeads-
Channel-Badge (auf Source-Attribution gekoppelt),
TD-Post-Demo-Hottest-Leads-Threshold + TD-Pilot-Token-CLI-Tool +
TD-Post-Demo-Reports-Reiter (Polish 🟢).

**Bundle-Delta /dashboard (Final-Build vor Merge):**
- Phase 2c.4: 123 kB Page-Code, 335 kB First Load JS
- Phase 2e:   124 kB Page-Code, 338 kB First Load JS
- Delta: +1 kB Page-Code, +3 kB First Load JS
- Neu: /dashboard/appointments 283 B, /api/dashboard/yesterday 283 B

**Tech-Debt-Status:**
- Eingegangen: 8 neue Eintraege (siehe Mini-Prompt-Sonntag-Discovery)
- Abgebaut: TD-Pre-Demo-2 (3-Klassen-Refactor)
- Bereits zuvor abgebaut: TD-Pre-Demo-1 (Phase 2c.4 Clients-Tab)

**Production-Verifikations-Stand:**
- Vercel auto-deploy getriggert (4ba371f..91b6c8c)
- HTTPS-Reachability: Status 307 (Auth-Redirect, korrekt)
- UI-Verifikation pending bei Philipp mit MOD-B2C-Magic-Link
  aus dashboard-links.txt (Block am oberen Ende der Datei,
  generiert 2026-04-26 10:54)

---

## Phase 2c.4 — Polish + Merge + Production (25.04.2026)

Build-Prompt 4 auf feat/dashboard-content-2c. Letzte Polish-Items
fuer die MOD-Demo am 29.04., dann Merge nach master und
Production-Deploy. Schliesst Phase 2c als Ganzes ab.

**Sub-Phase 4.0 — Audit (BLOCKING):**
Schema-Check (kein Touch noetig — beide Items reine UI/Polish),
Pattern-Inventur (Settings-Sidebar als Coming-Soon-Pattern-Vorlage
identifiziert: gedimmt + cursor-not-allowed + title-Tooltip),
Branch-State-Check (9 Commits ahead, nur Discovery-Doc untracked
wie erwartet).

**Sub-Phase 4.1 — Clients-Tab Coming Soon (d400ef5):**
DashboardTopNav.tsx: `comingSoon: true` an Clients-Tab.
Render-Branch fuer Coming-Soon-Tabs als `<span>` (statt Link)
mit cursor-not-allowed, opacity-50, "BALD"-Badge,
title="Bald verfuegbar". Konsistenz mit SettingsSidebar.tsx
(COMING_SOON_ITEMS-Pattern). TD-Pre-Demo-1 erledigt.

**Sub-Phase 4.2 — Live-Puls-Indikator (d4e1542):**
Neue Component `_components/LivePulse.tsx`. Pulsierender
emerald-Dot (`animate-pulse`) + "Live"-Text + Sekunden-Counter
seit Mount. Mobile (<640px): Counter via `hidden sm:inline`
ausgeblendet. Integration als Page-Header (h1 "Uebersicht" +
LivePulse rechts) oberhalb der KpiCards-Section.
Bewusste Demo-Vereinfachung — TD-Post-Demo-Live-Pulse-Real
(echtes Polling) eingetragen.

**Sub-Phase 4.3 — Coming-Soon-Teaser (7eaa1b4):**
Neue Component `_components/ConversationAnalyticsTeaser.tsx`.
Card mit gestrichelter Border, Hourglass-Icon, "Bald verfuegbar"-
Header, Serif-Headline "Konversations-Analytics", zwei
Demo-Fragen, Pilot-Hinweis. Position am Ende des Dashboards
(nach HubSpotSettings) als inhaltlicher Schluss.

**Sub-Phase 4.4 — Discovery-Doc finalisiert (9a791fc):**
docs/discovery-phase-2c-content.md um Sektion 10 erweitert:
Phase-2c-Komplett-Uebersicht, alle Sub-Phasen-Commits, alle
vier API-Routes mit Beispiel-Responses, Component-Hierarchie,
Tech-Debt-Befunde, Lessons Learned (Schema-Audit-Wert,
Single-Source-of-Truth, Component-Isolation, Pattern-Reuse).

**Sub-Phase 4.5 — architecture.md erweitert (1d1a050):**
Sektion 8 ergaenzt um "Dashboard-Content Phase 2c (25.04.2026)":
API-Routes-Liste, Components-Liste, Lead↔Client-Asymmetrie
(verwaiste Clients in MOD-B2C-Prod, Konsequenz fuer Clients-
Tab Coming-Soon) — erfuellt TD-Post-Demo-Clients-3. Sektion 11
Footer mit Phase-2c-Eintrag oberhalb Phase-2b.

**Bundle-Delta /dashboard (Final-Build 25.04.):**
- Phase 2c.3: 122 kB Page-Code, 335 kB First Load JS
- Phase 2c.4: 123 kB Page-Code, 335 kB First Load JS
- Delta 2c.3 → 2c.4: +1 kB Page-Code (LivePulse +
  ConversationAnalyticsTeaser, Lucide-Icons bereits im Bundle)
- Delta Phase-2b → Phase-2c: +114 kB Page-Code
  (recharts ~95 kB + Lucide-Icons + neue Components)

**Tech-Debt-Status (eingegangen in Phase 2c gesamt):**
- TD-Post-Demo-19 (maskId-Duplikate-Migration)
- TD-Post-Demo-Timezone (Date-Range-Audit)
- TD-Post-Demo-Live-Pulse-Real (LivePulse mit echtem Polling)
- TD-Post-Demo-Clients-2 (Clients-Tab UX-Patch)
- TD-Post-Demo-Clients-3 (Lead↔Client-Datenmodell-Fix)

**Tech-Debt-Status (abgebaut in Phase 2c gesamt):**
- TD-Pre-Demo-1 (Clients-Tab Coming-Soon — erledigt in 4.1)

**Production-Verifikation:** Erfolgt in Sub-Phase 4.8 nach
Vercel-Deploy. Live-Stand wird im naechsten Commit eingetragen.

---

## Phase 2c.3 — Top-Signals + Action-Board (25.04.2026)

Build-Prompt 3 auf feat/dashboard-content-2c. Schema-Audit blockierend, dann Build in 5 Sub-Phasen.

**Sub-Phase 3.0 — Schema-Audit (BLOCKING):**
Lead-Modell auditiert. Befund: `displayName` ist kein Lead-Feld, lebt in
`Conversation.widgetVisitorMeta` (Json). LeadStatus-Enum vollstaendig.
User-Entscheidung: Option A — Display-Identifier abgeleitet via Conversation-Join,
kein Schema-Touch. Praezisierung: Single Source of Truth in
`src/lib/widget/publicKey.ts`, API-Field `displayIdentifier` (nicht `displayName`),
ActionBoard-Fallback "Unbenannter Lead".

**Sub-Phase 3.1 — API /api/dashboard/action-board:**
Drei tenant-isolierte Buckets in einer Promise.all-Query:
- `waitingForFollowUp`: status NEW/CONTACTED, kein Termin, followUpCount<3,
  lastFollowUpAt null oder >24h alt; sort by score desc, createdAt desc
- `recentlyContacted`: status CONTACTED, lastFollowUpAt in letzten 24h;
  sort by lastFollowUpAt desc
- `appointmentsToday`: appointmentAt im Berlin-Tag (DST-aware via
  Intl.DateTimeFormat longOffset); sort by appointmentAt asc
Limit 25 pro Bucket. Response inkludiert displayIdentifier, topSignal
(erstes valides scoringSignal), Counts.

**Sub-Phase 3.2 — TopSignals.tsx:**
Self-contained Client-Component, fetcht /api/dashboard/signals?limit=10.
Premium-Liste mit Count-Badges, Bar-Width proportional zu max-count.
Loading-Skeleton, Empty-State, Coverage-Anzeige (X von Y Leads, Z%).

**Sub-Phase 3.3 — ActionBoard.tsx:**
3-Spalten-Board (mobile-first stacked, lg+ nebeneinander). Lead-Karten
mit displayIdentifier, Score-Badge (4-stufige Tone-Skala), Pipeline+
Qualification-Pills, Top-Signal als Italic-Zitat. Channel-Marker (WA-Badge
oder Globe-Icon). "Als kontaktiert markieren"-Button disabled mit
"Im Pilot verfuegbar"-Tooltip — Demo-Storytelling fuer Live-Mutation
Post-Demo. Per-Tenant qualificationLabels via /api/dashboard/labels mit
Enum-Key-Fallback.

**Sub-Phase 3.4 — Integration:**
TopSignals und ActionBoard zwischen TrendChart und bestehender
Conversations+Lead-Pipeline-Sektion eingesetzt. Vertikale Komposition,
kein Layout-Bruch der bestehenden Sektionen.

**Sub-Phase 3.5 — Build:**
Bundle: /dashboard 122 kB Page-Code, 335 kB First Load JS
(vorher 120/333; +2 kB fuer beide neuen Components inkl. Lucide-Icons).
TypeScript-Check sauber, Next-Build kompiliert ohne Errors. /api/dashboard/
action-board als Dynamic Route registriert.

**Helper-Erweiterung (Single Source of Truth):**
`src/lib/widget/publicKey.ts` um `maskExternalId()` und
`resolveLeadDisplayIdentifier()` erweitert. Lokale `maskId()`-Duplikate
in dashboard/page.tsx, crm/page.tsx und conversations/[id]/page.tsx
bleiben unangetastet (Scope-Disziplin) — Migration als TD-Post-Demo-19.

---

## Phase 2b — Dashboard Layout-Refactor (25.04.2026)

Komplettiert in einer Session (10:00-12:30) ueber 11 Commits
auf feat/dashboard-layout-refactor.

**Sub-Phasen:**
- 2b.1: Design-Tokens nach globals.css (additiv, dfc5a40)
- 2b.2: /dashboard/layout.tsx + DashboardTopNav-
  Subcomponent (3ca6cb1)
- 2b.3: page.tsx Inline-Header entfernt (45795b7)
- 2b.4-Hotfix: TopNav-Encoding-Fix nach Anzeige-Artefakt-
  Diagnose (2abd7e4)
- 2b.4a.1-6: Sub-Page-Cleanups (clients, broadcasts,
  conversations, campaigns, crm, settings/prompt+scoring+
  widget) (737e286, b18c5c6, 8c8db0f, 714e8af, 2b2339c,
  7c0662e)
- 2b.5.1: react.cache()-Wrap fuer getDashboardTenant() (a34cf09)
- 2b.5.2: architecture.md-Update (1d7f4bf)
- 2b.5.3: PROJECT_STATUS.md-Update

**Verifikation:** alle 11 Routes auf Localhost durchgeklickt
(internal-admin-Tenant), Top-Nav rendert auf allen Routes,
Active-State korrekt (inkl. Praefix-Match auf Detail-Pages),
Settings-Sidebar funktioniert, kein doppelter Header mehr,
Detail-Pages-Back-Mechanik (router.back()) bleibt erhalten.

**Tech-Debt-Stand:**
- Abgebaut: Discovery-R-1 (Token-Drift), R-2 (Header-
  Duplikation)
- Aufgenommen: TD-Post-Demo-11 (Sub-Page-Inline-Token-
  Migration), TD-Post-Demo-12 (Sub-Page-Chrome-Konsistenz),
  TD-Post-Demo-16 (Tab-Label-Umlaute), TD-Post-Demo-17
  (SSL-Mode-Update bei Prisma 9), TD-Post-Demo-18 (Web-
  Widget Plan-Gating umkehren)

**Bereit fuer Phase 2c-Start.**

---

## 24.04.2026 — TD-Pilot-08: Admin-Magic-Link-Generator

Neuer Endpoint POST /api/admin/tenants/[id]/magic-link erzeugt
1h-TTL Magic-Links fuer Preview-URL-Login im Admin-Dashboard.
Loest Cookie-Domain-Scope-Problem zwischen ai-conversion.ai und
Vercel-Preview-Subdomain.

- Neue Datei: src/app/api/admin/tenants/[id]/magic-link/route.ts
- UI-Erweiterung: src/app/admin/page.tsx (Dropdown-Eintrag
  "Preview-Login-Link generieren" + MagicLinkModal mit
  Zieldomain-Input, Copy-Button, Oeffnen-Button)
- Bonus: AuditLog-Aufruf in bestehender
  POST /api/admin/tenants/[id] nachgetragen (admin.token_regenerated
  war im Enum deklariert, wurde aber nie befeuert — jetzt geschlossen)
- Neue AuditAction: admin.magic_link_regenerated
- Discovery: docs/discovery-td-pilot-08-admin-magic-link.md
- Branch: feat/admin-magic-link-generator
- Kein Schema-Change, rein additive Erweiterung

**Status (Update 24.04. Abend):** Merged zu master,
Production-Deploy getriggert. Branch
feat/admin-magic-link-generator bleibt lokal+remote bis
Produktions-Verifikation durch Philipp.

---

## 24.04.2026 — Phase 2a: Label-Drift-Fix (stats endpoint)

Der Stats-Endpoint hardcoded Qualification-Labels mit
CUSTOMER→"Verloren" (semantisch falsch) und ignorierte
ADR-002 Tenant-Labels. Fix lädt jetzt tenant.qualificationLabels
primär, Fallback auf DEFAULT_QUALIFICATION_LABELS.

- Datei: src/app/api/dashboard/stats/route.ts
- Branch: fix/label-drift
- Kein API-Shape-Change, rein semantischer Wert-Fix

**Status (Update 24.04. Abend):** Merged zu master. Push
getriggert Production-Deploy. Branch fix/label-drift bleibt
lokal+remote bis Produktions-Verifikation.

---

## 24.04.2026 — Discovery fuer Dashboard-Redesign abgeschlossen

Vorbereitung fuer den Komplett-Umbau der `/dashboard`-Uebersicht zum
Stripe-stil Daily-Insights-Dashboard fuer den MOD-Demo-Call 29.04.
Pure Inspektion, keine Code-Aenderungen.

- Vollstaendiger Discovery-Report: `docs/discovery-dashboard-redesign.md`
- 8 Sektionen: Tech-Stack, Design-System, Dashboard-Struktur,
  Daten-Layer, Multi-Tenant-Kontext, Aggregations-Logik, Conventions,
  Risiken + offene Fragen
- Kernbefunde:
  - Next.js 15, React 19, Tailwind v4 (CSS-first, kein tailwind.config)
  - Keine shadcn/ui, keine Chart-Library installiert
  - Inline-Design-Tokens werden in jeder Dashboard-Page redefiniert
    (Drift-Risiko)
  - Kein `/dashboard/layout.tsx` — Top-Nav liegt inline in `page.tsx`
  - Koexistierende Datenlade-Patterns: Server Component + Prisma
    (Conversations) vs. Client-Fetch + 30s-Poll (Uebersicht)
  - Label-Drift zwischen `api/dashboard/stats` (hartcodiert, teils
    falsch), Conversation-Detail (Defaults) und ADR-002 Tenant-Labels

---

## Scoring-Refactor 23.04.2026 — Scoring pro Tenant + Signals + Mara-Temperature-Fix

**Timestamp:** 2026-04-23, spaeter Nachmittag
**Scope:** ADR-002 (docs/decisions/adr-002-scoring-per-tenant.md).
**Migration:** `20260423115051_scoring_per_tenant_and_signals` (deployed).
**Commit:** `0c86baa` — feat(scoring): scoring per tenant + signals +
mara temperature fix (ADR-002). Gepusht auf `origin/master`.
**Vercel-Deploy:** automatisch ausgeloest, Status `Building` zum Zeitpunkt
des Status-Updates (Production-Environment, vercel ls zeigt 13s alt).
**Fix vor Commit:** TD-Post-Demo-06 (Enum-Naming-Review) in
docs/tech-debt.md ergaenzt. Audit-Log-Call
`dashboard.scoring_updated` war bereits in der Settings-Route
vorhanden (Zeile 104) — keine Nachlieferung noetig.

### 23.04.2026 — Migration-Drift zwischen Dev-DB und Prod-DB

Nach dem Refactor-Push stellte sich heraus, dass der Seed-Script-
Aufruf gegen Production mit 500 fehlschlug
(`PATCH /api/admin/tenants/cmo8yte6d000004jlergkg37w`). Root-Cause-
Diagnose:

- Lokale `.env.local` und Vercel-Production-Env nutzen **zwei separate
  Prisma-Postgres-Datenbanken** auf demselben Host (`db.prisma.io`).
  Identische URL-Struktur (Path, Port, Query-Keys, Userlaenge), aber
  andere Credentials → andere DB.
- Zusaetzlich: Prisma CLI (`migrate deploy`, `migrate status`,
  `migrate diff`, `db execute`) spricht einen anderen Layer an als
  der `PrismaPg`-Runtime-Adapter, obwohl beide dieselbe DATABASE_URL
  bekommen. CLI meldete "Database schema is up to date", die App-DB
  hatte aber nur 6 statt 7 Migrationen und keine der drei
  scoringPrompt/qualificationLabels/scoringSignals-Spalten.

**Fix** ausgefuehrt am 23.04. Nachmittag:

1. `vercel env pull .env.vercel.production --environment=production --yes`
2. `.gitignore` um `.env.vercel.*` erweitert (defensive Absicherung).
3. `npx dotenv-cli -e .env.vercel.production -- npx prisma migrate deploy`
   → "No pending migrations" (CLI-Layer-Mismatch).
4. Fallback: ALTER TABLE via `PrismaPg`-Adapter mit IF NOT EXISTS:
   - `tenants.scoringPrompt TEXT`
   - `tenants.qualificationLabels JSONB`
   - `leads.scoringSignals JSONB`
5. `_prisma_migrations`-Eintrag manuell synchronisiert via
   `$executeRaw` INSERT (checksum = "manual-apply-via-prismapg-2026-04-23").
6. Direkte Verifikation: `tenant.findUnique` liefert B2C-Tenant mit
   `scoringPrompt: null, qualificationLabels: null` → Runtime-DB hat
   die Spalten jetzt.
7. `.env.vercel.production` geloescht (nicht im Repo, durch
   `.gitignore` geschuetzt).

**Neue Tech-Debt:** TD-Post-Demo-07 (Prisma-Config-Klarheit + Dev-vs-
Prod-DB-Doku). Blockiert jede kuenftige Migration bis zur Klaerung.

**Neue Doku:** `docs/migration-workflow.md` erweitert um Abschnitt
"Migrationen auf Prod deployen (Prisma Postgres)" mit dem 23.04.-
Ablauf — inklusive Fallback-Pfad fuer den Fall dass `migrate deploy`
"No pending" luegt.

**Seed-Re-Run:** bereit. Philipp kann jetzt
`SEED_TARGET_URL=https://ai-conversion.ai ADMIN_SECRET=... npx tsx
src/scripts/seed-mod-education-prompts.ts` ausfuehren. Die Prod-DB
akzeptiert den PATCH.

### Gefixte Risiken (aus Architektur-Scan 23.04. Vormittag)
- **R-1 (HOCH) Scoring-Prompt-Mismatch:** gefixt. Scoring-Prompt ist jetzt
  tenant-konfigurierbar (`Tenant.scoringPrompt`). MOD-B2C- und MOD-B2B-
  Nischen-Prompts in `src/modules/bot/scoring/mod-b2c.ts` +
  `mod-b2b.ts`. Seed setzt sie fuer die beiden Demo-Tenants.
- **R-4 Keine Signale-Rueckgabe:** gefixt. GPT-Scoring gibt jetzt
  `signals: string[]` zurueck (2-6 Eintraege, Zod-validiert), persistiert
  in `Lead.scoringSignals`. Dashboard rendert Bullet-List in der
  Conversation-Detail-Seitenleiste.
- **R-6 Keine Temperature-Kontrolle:** gefixt (partiell). Mara laeuft jetzt
  mit `temperature: 0.3` hartcodiert (`src/modules/bot/claude.ts`). Pro-
  Tenant-Override bleibt als TD-Post-Demo-03.

### Schema-Aenderungen
- `Tenant.scoringPrompt: String? @db.Text` (nullable, Default = null)
- `Tenant.qualificationLabels: Json?` (nullable, Default = null)
- `Lead.scoringSignals: Json?` (nullable, Default = null)
- Enum `LeadQualification` bleibt UNVERAENDERT (5 Stufen).

### Neue Module / Routen
- `src/modules/bot/scoring/` — index.ts (loader + Zod-Schema), defaults.ts,
  mod-b2c.ts, mod-b2b.ts.
- `src/app/api/dashboard/settings/scoring/route.ts` — GET/PATCH.
- `src/app/dashboard/settings/scoring/page.tsx` — Editor fuer
  scoringPrompt + qualificationLabels.
- `tests/scoring-per-tenant.test.ts` — 21 neue Tests, alle gruen.

### Geaenderte Dateien
- `prisma/schema.prisma` — 3 neue Felder
- `src/modules/bot/gpt.ts` — Scoring-Prompt-Param + Zod-Parse + signals
- `src/modules/bot/claude.ts` — temperature: 0.3 + TD-Post-Demo-03
- `src/modules/bot/handler.ts` — scoringPrompt durchreichen, signals
  persistieren (Konsumenten-Audit: WhatsApp-Pfad)
- `src/lib/bot/processMessage.ts` — analog (Web-Widget-Pfad)
- `src/modules/compliance/audit-log.ts` — neue Action `dashboard.scoring_updated`
- `src/app/api/admin/tenants/[id]/route.ts` — scoringPrompt +
  qualificationLabels im Admin-Zod-Schema
- `src/app/api/dashboard/conversations/[id]/route.ts` — API liefert
  qualificationLabels + scoringSignals
- `src/app/dashboard/conversations/[id]/page.tsx` — Labels-Mapping via
  API-Response, neue "Signale"-InfoCard
- `src/app/dashboard/settings/SettingsSidebar.tsx` — "Scoring"-Eintrag
- `src/scripts/seed-mod-education-prompts.ts` — setzt MOD-B2C-/B2B-
  Scoring-Prompts + Labels

### Verifikation
- Migration: `prisma migrate deploy` sauber, 7 Migrations applied.
- Typecheck: `tsc --noEmit` — 0 Fehler in meinem Scope (8 pre-existing
  Fehler in `tests/auth.test.ts`, Promise-vs-string, nicht durch diesen
  Refactor verursacht).
- Build: `npm run build` gruen.
- Tests: 21 neue Tests gruen. 5 pre-existing auth-Tests schlagen fehl
  (gleicher Grund — pre-existing).
- Grep-Check `reasoning` im Scoring-Pfad: 0 Treffer.
- Grep-Check `SCORING_SYSTEM_PROMPT`: 0 Treffer.
- Admin-PATCH-Schema akzeptiert jetzt scoringPrompt + qualificationLabels
  (Prisma.DbNull-Handling fuer "Default nutzen").

### Offene Post-Demo-Tech-Debts
TD-Post-Demo-01 bis -05 in `docs/tech-debt.md` dokumentiert:
- TD-Post-Demo-01: Scoring-Debouncing
- TD-Post-Demo-02: Claude-Modell pro Tenant
- TD-Post-Demo-03: Temperature pro Tenant (Kommentar in claude.ts)
- TD-Post-Demo-04: Rate-Limit-Bypass fuer Admin-Testing
- TD-Post-Demo-05: Signal-Kategorisierung mit Icon-System

### Abweichung vom User-Prompt (bewusst)
Der Prompt benutzt im Output-Schema und Labels-Schema die Kurzformen
"MQL" und "SQL". Das `LeadQualification`-Enum heisst aber in der DB
`MARKETING_QUALIFIED` und `SALES_QUALIFIED` — diese Namen wurden durchgaengig
verwendet (Zod-Schema, Labels-Keys, Scoring-Prompts), weil der User-Prompt
explizit "Enum LeadQualification bleibt unveraendert" vorschreibt. MQL/SQL
wurden nur als Default-UI-Label verwendet, nicht als Enum-Key. Siehe
Hand-Off, Abschnitt 6.

---

## Mara-Tuning Session 23.04.2026 — Architektur-Scan (Read-Only)

**Timestamp:** 2026-04-23, Nachmittag
**Ziel:** Landkarte der Mara-Prompt-Architektur und des Scoring-Flows
vor dem Tuning der 10 Test-Szenarien fuer den MOD-Demo-Call 29.04.
**Status:** Keine Code-Aenderung. Nur Befund-Dokumentation.

### Kernbefunde

1. **Mara-System-Prompt** liegt in der DB als Feld `Tenant.systemPrompt`
   (`prisma/schema.prisma:22`, `@db.Text`). Nicht im Code. Ein eigener
   Prompt pro Tenant (B2C: `mod-education-demo-b2c` → Mara,
   B2B: `mod-education-demo-b2b` → Nora). Fallback in
   `src/modules/bot/system-prompts/` nur wenn `systemPrompt` leer ist
   (`loadSystemPrompt()` in `system-prompts/index.ts:224-243`). Gesetzt
   wurde der Mara-Prompt initial via Seed-Script
   `src/scripts/seed-mod-education-prompts.ts` (POST an Admin-API).

2. **Editier-Pfade fuer Philipp:**
   - **Tenant-Dashboard (empfohlen fuer Tuning):**
     Login als MOD-B2C-Tenant → `/dashboard/settings/prompt` →
     System-Prompt editieren → Speichern. API-Backend:
     `POST /api/dashboard/settings/prompt` — Zod-Limit **20.000 Zeichen**
     (`src/app/api/dashboard/settings/prompt/route.ts:36`).
   - **Admin-Panel (Fallback):** `/admin` → Tenants → PATCH via
     `/api/admin/tenants/[id]` — Zod-Limit **30.000 Zeichen**
     (`src/app/api/admin/tenants/[id]/route.ts:52`).
   - **Script-Seed (Bulk):**
     `SEED_TARGET_URL=... ADMIN_SECRET=... npx tsx
     src/scripts/seed-mod-education-prompts.ts`

3. **Scoring-Flow (WICHTIGSTE Erkenntnis):**
   - **Typ:** Separater zweiter LLM-Call (OpenAI GPT-4o,
     `src/modules/bot/gpt.ts:82`).
   - **Trigger:** `runScoringPipeline()` laeuft asynchron (fire-and-forget)
     NACH JEDER Bot-Antwort — nicht erst am Gespraechsende
     (`src/lib/bot/processMessage.ts:475-487`). Bei 10 Nachrichten =
     10 Scoring-Calls = 10x GPT-4o-Kosten.
   - **Scoring-Prompt** ist hartcodiert in `gpt.ts:36-53`
     (`SCORING_SYSTEM_PROMPT`) und auf **DACH-B2B-Vertrieb** geeicht
     (Budget, Dringlichkeit, Terminbereitschaft). Fuer MOD-B2C
     (Arbeitssuchende, Bildungsgutschein) passt das
     Bewertungsraster nicht 1:1 — Risiko fuer Demo-Call am 29.04.
   - **Kein Signale-Array, keine Top-3-Signale.** Rueckgabe ist nur
     `{score: 0-100, qualification: UNQUALIFIED/MQL/SQL/OPPORTUNITY/
     CUSTOMER, reasoning: string}`. Reasoning wird gespeichert in
     `Lead.aiSummary`? Nein — es wird NICHT persistiert, nur geloggt
     (`gpt.ts:130-135`, `processMessage.ts:230-243`). Persistiert
     wird nur `score` + `qualification` auf `Lead`.
   - **Status-Hochstufung:** Score >= 76 → `LeadStatus.CONTACTED`,
     sonst `NEW` (`processMessage.ts:183`). Score > 70 loest
     E-Mail-Benachrichtigung (Resend) + optionalen HubSpot-Push aus.

4. **Dashboard-Output:** `/dashboard/conversations/[id]` zeigt in der
   Seitenleiste nur `Score /100`, `Qualification-Badge (Neu/MQL/SQL/
   Opportunity/Customer)`, `Pipeline-Status`, `Deal-Wert`,
   `Quelle`, `Termin`. **Kein `top_signals`, kein `Einschaetzung`,
   kein `Conversion-Trigger`-Feld.** Quelle: `src/app/dashboard/
   conversations/[id]/page.tsx:270-320`.

5. **LLM-Konfiguration Mara (Claude):**
   - Modell: `claude-sonnet-4-20250514` hartcodiert
     (`src/modules/bot/claude.ts:106`) — nicht aus ENV/DB.
   - `max_tokens: 1024`, **KEIN temperature**, **KEIN top_p** (Anthropic-
     Defaults greifen, Temperature = 1.0).
   - Kein Tenant-Override moeglich.

6. **Widget-Test-Zugriff fuer Philipp:**
   - **Schnellster Weg:** Dashboard-Login als MOD-B2C-Tenant →
     `/dashboard/settings/widget` → rechter iframe `Vorschau` zeigt
     `/embed/widget?key=<publicKey>` direkt live
     (`src/app/dashboard/settings/widget/page.tsx:448-456`).
     Kein externer Embed noetig.
   - **Alternativ direkte URL:**
     `https://ai-conversion.ai/embed/widget?key=pub_NjEW32lw7XossvAG`.
   - **Legacy-Test-Route:** `/test/[slug]` existiert fuer den
     Demo-Modus ohne Public-Key (`src/app/test/[slug]/page.tsx`).

7. **Konversations-Persistierung:**
   - Prisma-Models: `Conversation` (`channel: WHATSAPP|WEB`,
     `status: ACTIVE|PAUSED|CLOSED|ARCHIVED`, `widgetSessionToken`,
     `widgetVisitorMeta`, `consentGiven`), `Message`
     (`contentEncrypted @db.Text`, AES-256-GCM), `Lead` (1:1 zur
     Conversation via `conversationId @unique`).
   - **Abschluss-Trigger:** Conversation wird **NICHT automatisch**
     bei Mara-Abschluss-Satz geschlossen. Einziger Close-Pfad ist
     STOP-Befehl durch den User (`processMessage.ts:360-363`) oder
     Cleanup-Cron nach Retention-Frist. Scoring ist davon unabhaengig.

### Identifizierte Risiken / Inkonsistenzen

- **R-1 Scoring-Prompt-Mismatch (HOCH):** `SCORING_SYSTEM_PROMPT`
  in `gpt.ts` ist auf B2B-Vertrieb geeicht (Budget, Entscheider,
  Termin). MOD-B2C-Leads (Arbeitssuchende, Bildungsgutschein-Kandidaten)
  werden damit strukturell niedrig gescored. Vor Demo-Call anpassen
  oder Risiko kommunizieren.
- **R-2 Zeichen-Limit-Drift (MITTEL):** Dashboard-API erlaubt 20.000
  Zeichen, Admin-API 30.000, Seed-Script prueft 30.000. Prompt-
  Wachstum >20k Zeichen zwingt Philipp ins Admin-Panel. Kein
  Kommentar dokumentiert, warum die Limits divergieren — potentielle
  Regel-5-Verletzung (Spec-Bezug in Kommentaren).
- **R-3 Scoring-Overhead (MITTEL):** Scoring laeuft nach JEDER
  User-Nachricht. Bei 10-Nachrichten-Gespraech → 10 GPT-4o-Calls.
  Kein Debounce, kein "erst scoren wenn X Nachrichten". Kostenrelevant
  ab Pilot-Skalierung; fuer Demo-Call noch egal.
- **R-4 Keine Signale-Rueckgabe (MITTEL):** Dashboard zeigt Score,
  kein `top_signals`, keine `Einschaetzung`. Falls die MOD-Demo genau
  diese Felder zeigen soll (wie vom User in der Aufgabe erwaehnt),
  muss das Scoring erweitert werden (neues Feld im Lead-Model oder
  Reasoning-Feld persistieren).
- **R-5 Model-Hardcoding (NIEDRIG):** `claude-sonnet-4-20250514`
  hartcodiert. Kein Tenant-Override, kein ENV-Flag. Modell-Wechsel
  erfordert Deploy.
- **R-6 Missing Temperature (NIEDRIG):** Claude-Call ohne explizite
  Temperature — Anthropic-Default greift (1.0). Fuer konsistente
  Mara-Antworten im Tuning waere 0.3-0.5 besser steuerbar.
- **R-7 Rate-Limit beim Tuning (OPERATIV):** Widget-Session-Endpoint
  limitiert **10 Sessions/IP/Stunde**
  (`src/app/api/widget/session/route.ts:84`). Bei >10 Test-Chats aus
  derselben IP innerhalb einer Stunde: 429. Philipp muss bestehende
  Session weiter nutzen oder 1h warten.
- **R-8 Kein Hot-Reload fuer Prompt-Aenderungen:** `loadSystemPrompt()`
  liest `tenant.systemPrompt` bei jeder Message frisch aus der DB
  (`processMessage.ts:396-404`). Damit ist der Tuning-Loop
  **save → neuer Chat → sofortiges Resultat**, kein Deploy noetig.
  Positiv — aber: der iframe-Preview-Cache im Dashboard bleibt per
  `previewNonce` kontrolliert, kein Auto-Refresh. Fuer Tuning-Speed:
  neue Session im Widget starten, nicht bestehende weiterfuehren.

### Empfohlener Tuning-Workflow (Hand-Off an ConvArch)

1. Prompt editieren: `/dashboard/settings/prompt` (eingeloggt als
   MOD-B2C-Tenant) → Speichern.
2. Widget-Test neben dran: `/dashboard/settings/widget` → iframe-
   Preview rechts → "Neue Session" durch Reload des iframes
   (`previewNonce++`) oder das echte Widget unter
   `https://ai-conversion.ai/embed/widget?key=pub_NjEW32lw7XossvAG`.
3. Nach jeder Szenario-Runde Lead-Score im Dashboard checken unter
   `/dashboard/conversations/[id]`.
4. **Entscheidung fuer 29.04.-Demo:** Wenn Scoring-Output mit DACH-B2B-
   Heuristik fuer MOD-B2C unpassend ist — entweder Scoring-Prompt
   (`gpt.ts:36-53`) MOD-spezifisch anpassen (separater ADR), oder
   die Scoring-Darstellung fuer den Demo-Call bewusst ausblenden.

---

## 23.04.2026 — Datenschutzerklaerung komplett auf IT-Recht-Kanzlei-Stand ersetzt

Nach Rueckmeldung der Kanzlei Keller (23.04.) wurde die Haupt-
Datenschutzerklaerung komplett durch den neuen Konfigurator-Output
ersetzt.

### Aenderungen
- `content/legal/datenschutz.md` komplett neu geschrieben (kompletter
  Austausch inkl. der heute Morgen manuell eingefuegten Art. 27-Klausel,
  die jetzt im neuen Dokument als regulaerer Abschnitt 1.3 integriert ist)
- **Neu dokumentierte Dienste:** Sentry (Abschnitt 7) — Keller-Punkt 2
- **Entfernt:** Google-Fonts-Klausel aus Hauptdokument — Keller-Punkt 3
  (Google Fonts im Konfigurator deaktiviert, Self-Host-Implementierung
  steht aus, TD-Compliance-16)
- **Praezisiert:** Cookie-Abschnitt (4) — nur technisch notwendige
  Cookies, kein Consent-Banner noetig (TTDSG § 25 Abs. 2 Nr. 2)
- **EU-Vertreter:** Art. 27-Klausel wandert von eigenem Abschnitt 2
  zu Unter-Abschnitt 1.3 — Keller-Wortlaut kuerzer als Prighter-
  Snippet vom Morgen
- **Sentry-Duplikat aus Ergaenzung entfernt:** `content/legal/
  datenschutz-ergaenzung.md` Abschnitt "Fehler-Monitoring mit Sentry"
  geloescht, da jetzt im Hauptdokument. Ergaenzung behaelt Resend-,
  Chat-Widget- und Google-Fonts-Interim-Klauseln, bis Keller-Zweit-
  Mail eintrifft (TD-Compliance-17)

### Konsistenz-Check Impressum
Firmenname + Adresse der Prighter-Klausel in `content/legal/impressum.md`
inhaltlich identisch zu Datenschutz 1.3. Nur Adress-Formatierung leicht
unterschiedlich (1-zeilig vs. mehrzeilig) — beide Varianten rechtlich
korrekt, nicht angefasst.

### Extern verifizierter Live-Status (23.04.)
- Vercel: DPF-zertifiziert ✅
- Calendly: DPF-zertifiziert ✅
- Cookie-Situation: 0 Cookies auf Homepage, nur technisch notwendig im
  Login-Bereich → kein Consent-Banner erforderlich

### Neue Tech-Debt
- **TD-Compliance-16:** Google Fonts self-hosten (Kanzlei-Konfigurator-
  Deaktivierung erfolgt, Code-Implementierung steht aus)
- **TD-Compliance-17:** Resend- und Chat-Widget-Klauseln aus Ergaenzung
  ins Hauptdokument verschieben, sobald Keller-Zweit-Mail eintrifft
- **TD-Compliance-18:** AVV-Check aller Auftragsverarbeiter (Matrix mit
  ✅/⚠️-Status fuer 10 Anbieter, Stand 23.04.)

Anmerkung: User-Prompt schlug TD-Compliance-06/07/08/09 vor — alle
belegt bis TD-Compliance-15. Neue Eintraege nutzen die naechsten freien
Nummern. Der vorgeschlagene TD-Compliance-09 "Verarbeitungsverzeichnis"
ist bereits durch den heute Morgen angelegten TD-Compliance-14
abgedeckt — kein zweiter Eintrag noetig, Hinweis im TD-Compliance-18-
Eintrag zur Abgrenzung.

---

## 23.04.2026 — DSGVO-Hotfix: Art. 27-Klausel (Prighter) in Datenschutzerklaerung

Impressum enthielt den EU-Vertreter-Hinweis bereits. Datenschutzerklaerung
fehlte die Klausel — Pflichtverletzung nach Art. 27 Abs. 2 DSGVO.
Hotfix heute nachgereicht:

- `content/legal/datenschutz.md`: Neuer Abschnitt `## 2) Vertreter in
  der Europaeischen Union (Art. 27 DSGVO)` direkt nach
  `1) Einleitung und Kontaktdaten des Verantwortlichen`, mit vollstaendiger
  Prighter-Adresse (iuro Rechtsanwaelte GmbH t/a Prighter, Schellinggasse 3,
  1010 Wien), Portal-Link (https://app.prighter.com/portal/16103587069)
  und offiziellem Prighter-Snippet-Wording
- Folge-Abschnitte 2-9 zu 3-10 renummeriert (incl. Subsection-Nummern
  `### 5.x` → `### 6.x`, `**8.x**` → `**9.x**`)
- Identische Schreibweise/Adresse wie im Impressum

### Bestehender Markdown-Bug nicht gefixt
Die Datenschutzerklaerung hatte vor dem Hotfix bereits eine doppelte
Subsection-Nummer (`### 5.2 OpenAI` + `### 5.2 Calendly`). Nach der
Renummerierung bleibt die Dopplung als `### 6.2 OpenAI` + `### 6.2
Calendly` bestehen. Bewusst nicht gefixt (Scope-eng, kein User-Auftrag).
Separater Fix-Commit empfohlen.

### Neue Tech-Debt
- **TD-Compliance-13:** Prighter-LOA-Approval-Status woechentlich
  pruefen (aktuell "Waiting for LOA approval" seit 22.04.)
- **TD-Compliance-14:** Verarbeitungsverzeichnis nach Art. 30 DSGVO
  erstellen (Pflicht, separater Arbeitsblock diese Woche)
- **TD-Compliance-15:** Bei US-LLC-Aktivierung (POWER FORGE AI LLC)
  Impressum + Datenschutz um US-Sitz erweitern, Prighter bleibt

Nummerierungs-Hinweis: User-Prompt schlug TD-Compliance-01/02/05
vor — alle drei sind bereits belegt (Sentry-Themen, ERLEDIGT am
13./15.04.). Neue Eintraege nutzen die naechsten freien Nummern.

---

---

## 22.04.2026 — HOTFIX Positionierung: "Bildungstraeger" statt "Weiterbildung & Inbound-Teams"

Nach dem Positionierungs-Commit `1fea923` (Abend) wurde per Hotfix die
Nischen-Formulierung gespitzt, damit die Website 1:1 zur bereits
versendeten MOD-Outreach-Mail passt.

### Ersetzt
- Hero-H1 (`src/app/page-v2.tsx`): "KI-Lead-Qualifizierung fuer
  Weiterbildung & Inbound-Teams" → "KI-Lead-Qualifizierung fuer
  Bildungstraeger"
- Meta-Title + Description (`src/app/layout.tsx` + `src/app/page.tsx`
  + `src/app/pricing/page.tsx` + `src/app/faq/page.tsx`)
- OG-Tags + Twitter-Tags + og:image:alt (`src/app/layout.tsx`)
- Keywords: "Weiterbildung KI" + "Inbound-Qualifizierung" raus,
  "Bildungstraeger" + "Lead-Scoring Bildung" +
  "Weiterbildung Lead-Qualifizierung" rein
- FAQ Q8 Antwort: "Ihrer Weiterbildung oder Ihres Inbound-Teams" →
  "Ihres Bildungstraegers"

### Nicht angefasst (bewusst)
- Auskommentierter Branchen-Sektions-Code (`page-v2.tsx:420-436`) —
  bleibt als Ausgangspunkt fuer TD-Marketing-04
- Demo-Leads-Chatverlaufs-Inhalte (`demo-leads.data.ts`) — "Weiterbildung"
  dort ist legitime Konversations-Terminologie
- Keyword "Weiterbildung Lead-Qualifizierung" (bleibt als SEO-Treiber)

### Grep-Verifikation
- "Inbound-Teams" in `src/`: 0 Treffer
- "Weiterbildungsanbieter" in `src/`: 0 Treffer
- "Weiterbildung &" in `src/`: 0 Treffer

---

## 22.04.2026 — Pricing-Strategie auf Preis-Lock v2 umgestellt

### Erledigt
- **Pricing-Seite auf Founding-Partner-Pilot v2 aktualisiert** (5 Plaetze, Preis-Lock statt Lifetime-Rabatt, Starter als regulaeres Angebot)
  - `src/app/pricing/PricingClient.tsx`: Plan-Interface um `pilot: boolean` erweitert, `foundingPrice`-Feld entfernt, Hero-P + Disclaimer + Bottom-CTA auf "12 Monate Preis-Lock"-Framing umgestellt, durchgestrichene Preise komplett weg, Pilot-Bullets nur auf Growth + Professional
  - `src/app/page-v2.tsx`: Homepage-Pricing-Block und Founding-Partner-Detail-Sektion identisch umgestellt (Description + Disclaimer + 3 Cards + 7-Punkte-Bullets)
  - `src/components/FoundingPartnerBanner.tsx`: "33% Rabatt + 10 Plaetze" → "5 Plaetze · 30 Tage kostenlos · 12 Monate Preis-Lock"
- **Branchen-Sektion auf Homepage angepasst** (Commit `63c889b`):
  - Reihenfolge: Bildung & Weiterbildung (neu an Position 1), Steuerberater (neu mit Calculator-Icon), Immobilien, Coaching & Beratung
  - Entfernt: Handwerk, Agentur
  - Grid von 5 auf 4 Spalten reduziert fuer sauberere Symmetrie

### Neue Tech-Debt
- **TD-Marketing-02:** Pricing-Plans-Datenstruktur zentralisieren — aktuell in PricingClient.tsx und page-v2.tsx dupliziert, Drift-Risiko bei kuenftigen Aenderungen

### Konsistenz-Check (Grep nach "33%", "lebenslang", "233", "467", "869", "10 Plaetze")
- Marketing-Frontend clean
- FAQ, Rechtstexte, Admin/Dashboard unberuehrt (kein Pricing-Bezug)

### Positionierung + WhatsApp-Cleanup + Branchen-Fokus (22.04.2026, Abend)
- **Website auf Weiterbildungs-Positionierung umgestellt:** Hero,
  Meta-Title, Meta-Description, Keywords, OG-Tags, Twitter-Tags
  konsistent auf "KI-Lead-Qualifizierung fuer Weiterbildung &
  Inbound-Teams" (Nische 1 nach Pivot vom 21.04.). Betrifft
  `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/page-v2.tsx`,
  `src/app/pricing/page.tsx`, `src/app/faq/page.tsx`.
- **WhatsApp als Feature zurueckgestuft auf Roadmap (Q3 2026):**
  WhatsApp aus Pricing-Labels ("1/3/10 KI-Bots (Web-Widget)" statt
  "WhatsApp Bots"), Sales-Agent-Feature-Description, Vergleichs-
  Sektion ("Web-Widget statt HubSpot + Intercom + Calendly +
  Mailchimp") und FAQ entfernt. Einziger sichtbarer WhatsApp-Bezug:
  Integrations-Chip "WhatsApp Cloud API (Q3 2026)" + neuer FAQ-
  Eintrag zum WhatsApp-Roadmap-Status. Grund: Meta-Business-
  Verifizierung nicht durch, nicht lieferfaehig. Siehe TD-Marketing-03.
- **Branchen-Sektion aus Haupt-Landing-Page entfernt:** Sektion
  "Fuer diese Branchen besonders geeignet" widersprach der Nischen-
  Positionierung. Code auskommentiert erhalten fuer spaetere
  `/steuerberater`-Landing-Page-Reaktivierung (TD-Marketing-04),
  ungenutzte Icon-Imports aus Haupt-Block entfernt.
- **"Routes"-Label durch "Automationen" ersetzt** im Live-Dashboard-
  Block der Homepage (User-Vokabular statt Dev-Vokabular).
- **FAQ-Content aktualisiert:** Vier WhatsApp-spezifische Fragen
  durch Web-Widget-Perspektive ersetzt (Einbindung, DSGVO,
  Roadmap-Status).

### Neue Tech-Debt
- **TD-Marketing-03:** WhatsApp-Integration reaktivieren sobald
  Meta-Business-Verifizierung durch ist — Pricing-Labels, Sales-
  Agent-Description, Vergleichs-Sektion und FAQ muessen zurueck-
  getauscht werden (2-3h Copy + Design-Runde zur kombinierten
  Positionierung)
- **TD-Marketing-04:** Branchen-Sektion als dedizierte
  Landing-Pages reaktivieren — statt Haupt-Seite-Sektion separate
  `/steuerberater`-, `/weiterbildung`-Routes bauen ab Juni 2026

### Pilot-Cleanup (22.04.2026, spaeter Nachmittag)
- **Add-on-Sektion bereinigt** (`src/app/pricing/PricingClient.tsx`):
  Marketing Booster (+299 EUR) + White-Label (+500 EUR) entfernt —
  beide nicht pilotreif. HubSpot Sync (+199) und Weekly Report (+99)
  behalten, beide mit "In Pilotphase aktiviert"-Badge (amber, konsistent
  zu "FOUNDING PARTNER"-Label). Grid von 4-col auf zentriertes
  2-col-Layout (max-w-3xl) umgestellt. Untertitel erweitert um
  Pilot-Aktivierungs-Hinweis.
- **Founding-Partner-Sektion (`src/app/page-v2.tsx`):** "60 Tage"-
  Widerspruch zum 30-Tage-Banner aufgeloest. Text neu: "waehrend
  der Pilotphase ... mit ehrlichem Feedback, woechentlichen
  Strategie-Calls und Testimonial im Erfolgsfall". Keine anderen
  "60 Tage"-Fundstellen im gesamten src/-Baum.

---

## 21.04.2026 — Pilot-Modell-Entscheidung (5 Slots, 30+30)

### Erledigt
- Neuer ADR `docs/decisions/pilot-model-5-slots-30-30.md`
  dokumentiert Produkt-/GTM-Entscheidung: **5 Pilot-Slots**
  statt unbegrenzt, **30+30 Tage** statt 60 straight.
- Phase 1 (30 Tage kostenlos) → Review-Punkt mit 3 Optionen
  (direkt Vollpreis 467 EUR / Extended 30 Tage 233 EUR /
  Trennung) → Phase 2 (optional) → Founding-Growth-Vollpreis.
- Begruendung schriftlich: Solo-Founder-Kapazitaet
  (3-5 h/Pilot/Woche), Knappheits-Signal, niedrigere
  Commitment-Huerde, klarer Zwischen-Entscheidungs-Moment.
- Review-Zeitpunkt: nach ersten 3 abgeschlossenen Piloten
  (voraussichtlich Juli/August 2026).

### Konsequenzen / Folge-Tasks (ausserhalb dieser Session)
- **Banner-Wortlaut:** Website-Banner sagt aktuell
  *"Die ersten 10 Pilotkunden ..."* (siehe
  `docs/decisions/website-pre-mod-update.md` §2.3) — muss
  auf **5 Slots** angepasst werden.
- Pilot-Vereinbarung, E-Mail-Templates, Demo-Material auf
  2-Phasen-Struktur umstellen.
- Pilot-Status-Tracking (Phase 1 / Phase 2 / Voll-Konvertiert /
  Abgebrochen) — Implementierungs-Ort offen (Tenant-Feld
  vs. externes CRM).
- Kein Code-Impact in dieser Session.

### Kein Tech-Debt-Eintrag
Bewusst kein TD-Pilot-06, weil es eine strategische
Produkt-Entscheidung ist, keine aufgeschobene Schuld.
ADR ist der richtige Ort.

---

## 21.04.2026 — MOD Education Demo-Tenant-Setup

### Erledigt (Phase 1 + 2)

**Phase 1 — Prompts + Widget-Config (Commit `4f159e3`):**
- Mara-B2C-Bildungsberaterin: systemPrompt (9262 Zeichen) + Welcome-Message + Branding ueber neu gebautes Seed-Script
- Nora-B2B-Weiterbildungsberaterin: systemPrompt (8064 Zeichen) + Welcome-Message + Branding
- Admin-API Zod-Schema erweitert: webWidgetConfig akzeptiert jetzt botName, botSubtitle, avatarInitials, leadType
- Dashboard-Widget-Config-Schema gespiegelt (leadType optional, backward-compatible)
- Seed-Script: HTTP-Client gegen Admin-API, Production-DB-Credentials bleiben ausschliesslich in Vercel Env

**Phase 2 — Dashboard-Erweiterung + Demo-Leads (Commits `abe9c49` + `a3a1f90`):**
- aiSummary-JSON erweitert um `topSignals: string[]` (max 3) und `einschaetzung: string` — additiv + backward-compatible
- Claude-Analyse-Prompt in `/api/dashboard/leads/[id]/summary/route.ts` passt die neuen Felder mit an
- `parseLeadType()` als separater Helper in `src/lib/widget/publicKey.ts` (leadType lebt NICHT im Widget-public ResolvedTenantConfig — gehoert in Dashboard-Kontext)
- `/api/dashboard/me` liefert `leadType` (B2C/B2B/null) ans Frontend
- CRM-Detail-Modal zeigt B2C/B2B-Badge neben Qualification + zwei neue Sektionen (Top-Signale, Einschaetzung)
- Neuer Admin-Endpoint `POST /api/admin/demo-seed/mod-education` seedet 8 Demo-Leads in `mod-education-demo-b2c` (idempotent via externalId-Marker `demo-seed-*`)
- 8 fiktive B2C-Demo-Leads seeded mit vollstaendiger Chat-Historie (verschluesselt), vorgesetztem Score, aiSummary + predictiveScore

### MOD-Demo-Tenants

| Slug | Bot | Plan | Widget enabled | Public Key |
|---|---|---|---|---|
| `mod-education-demo-b2c` | Mara (B2C) | Growth | ✓ | `pub_NjEW32lw7XossvAG` |
| `mod-education-demo-b2b` | Nora (B2B) | Growth | ✓ | `pub_Q85UCr55bp7MRsAm` |

**Widget-Test-URLs** (direkt embed-fähig):
- B2C: `https://ai-conversion.ai/embed/widget?key=pub_NjEW32lw7XossvAG`
- B2B: `https://ai-conversion.ai/embed/widget?key=pub_Q85UCr55bp7MRsAm`

**Dashboard-Zugang:** Magic-Link pro Tenant in `dashboard-links.txt` (lokal, gitignored). Bei Bedarf neu generieren via `npx tsx src/scripts/rotate-dashboard-token.ts <tenant-id>`.

### Demo-Leads-Verteilung (alle im B2C-Tenant Mara)

| Name | Score | Qualification | Status |
|------|------:|---------------|--------|
| Anna M., 34 | 88 | OPPORTUNITY | A-Lead |
| Stefan K., 42 | 84 | OPPORTUNITY | A-Lead |
| Yasemin D., 28 | 68 | SALES_QUALIFIED | Borderline A/B |
| Thomas R., 51 | 58 | SALES_QUALIFIED | Borderline A/B |
| Birgit H., 38 | 44 | MARKETING_QUALIFIED | B-Lead |
| Marco S., 29 | 36 | MARKETING_QUALIFIED | B-Lead |
| Ahmad K., 45 | 22 | UNQUALIFIED | C-Lead |
| Jennifer B., 32 | 12 | UNQUALIFIED | C-Lead |

### Bekannte Limitationen / Caveats

- **Scoring-Prompt bleibt tenant-agnostisch** (siehe TD-Pilot-03). Live-Nora-Testgespraeche bekommen generischen DACH-B2B-Score, der nicht bildungsbranchen-optimiert ist. Nicht blockierend fuer Demo-Call, aber relevant vor erstem echten MOD-Pilot.
- **Bot-Prompt-Sales-Effizienz noch nicht optimiert** (siehe TD-Pilot-05). Maras Validierungs-Dichte und Noras Multi-Frage-Messages sind fuer echten Pilot zu stark ausgepraegt. Nice-to-Fix vor erstem Warm-Contact.
- **Widget-Preview im Admin-Panel fehlt** (siehe TD-Pilot-04). Philipp muss aktuell ueber die Embed-URLs (oben) oder Dashboard-Preview testen.
- **Pre-existing Admin-UI-Bugs:** WhatsApp Phone ID ist weiterhin Pflichtfeld bei Tenant-Anlage (TD-Pilot-01), Web-Widget default OFF (TD-Pilot-02) — Workarounds vorhanden.

### Demo-Call-Status

**GRUEN** — Demo-Bereit. Alle geplanten Phase-1- und Phase-2-Ziele erreicht.

---

## 21.04.2026 — Pre-Pilot Fix-Session

- 3 Quick-Wins erledigt: auditLog in prompt/route.ts, Dashboard-Token 30d→7d,
  11 tote Komponenten geloescht (Footer, HeroSection, HowItWorks, PilotSection,
  Pricing, FloatingChat, NeuralGrid, LogoCloud, CalendarSection, ProblemSolution, Features)
- Zod-Validation fuer admin/login + asset-studio/generate (die beiden POST-Routes
  mit echtem Request-Body ohne Zod). Restliche 4 Audit-Findings waren Body-less
  POST-Routes (nur URL-Params) — kein Zod noetig.
- Default-Take fuer ~16 findMany-Queries (OOM-Praevention): 200 fuer Dashboard-
  Listings, 1000 fuer Cron/Export, 100 fuer Messages, 500 fuer Tenants
- Smoke-Tests: verschoben auf separate Session (Aufwand 4-6h, nicht pilot-blockierend)
- Pilot-Launch-Status: GELB → GRUEN (kein bekannter Blocker)

Audit-Report: docs/audits/pre-pilot-audit-2026-04-21.md

---

## 20.04.2026 — Rechtstexte live

- Alle 4 Rechtstexte (Impressum, Datenschutz, AGB, Widerrufsbelehrung) von IT-Recht-Kanzlei live auf ai-conversion.ai
- Datenschutz-Ergaenzungen (Sentry, Resend, Chat-Widget, Google-Fonts-Hinweis) als separater Abschnitt unter Kanzlei-Text
- EU-Vertreter Prighter bereits im Impressum enthalten (iuro Rechtsanwaelte GmbH t/a Prighter, Wien)
- IT-Recht-Kanzlei-Abmahnschutz aktiviert
- Erledigt: TD-Compliance-07 (EU-Vertreter), TD-Compliance-09 (Telefonnummer im Impressum)
- Neue Route /widerrufsbelehrung angelegt, Footer-Links auf allen Seiten ergaenzt
- Markdown-basierte Legal-Pages mit remark + @tailwindcss/typography (prose prose-invert)
- Pending: Kanzlei-Review der Ergaenzungstexte (Antwort erwartet 1-3 Werktage)

---

## Tages-Zusammenfassung 16.04.2026

### Erledigt
1. **Website-Relaunch pre-MOD-Outreach:**
   - Headline neu: "KI-Vertrieb fuer DACH-KMU"
   - Fake-Testimonials entfernt, Founding-Partner-Ersatz-Sektion
   - Vergleichstabelle → 3 Karten (Eine Plattform, KI-Verkaeufer, Made in Germany)
   - Branchen: E-Commerce raus, Bildung & Weiterbildung rein (nur Marketing, Produkt unveraendert)
   - ROI-Disclaimer ueber Rechner, Footer-Hinweis zur Pilotphase
2. **Pricing komplett umgebaut (Homepage + /pricing):**
   - Listenpreise 349/699/1.299, Founding 233/467/869 (33% Rabatt, lebenslang solange Vertrag ungekuendigt)
   - 30 Tage kostenlos als Founding-Vorteil
   - Setup-Fee: "0 EUR in Pilotphase" ausgewiesen
   - Yearly-Toggle komplett entfernt (nur Monthly in Pilotphase)
   - Enterprise: "Auf Anfrage" statt konkretem Preis
   - Value-Banner: generisches Statement statt Gehalts-Vergleich
3. **Paddle-Checkout deaktiviert:**
   - Application abgelehnt 07.04.2026 (AI Chatbots + Marketing Software ausserhalb AUP)
   - POST /api/paddle/checkout gibt 503 mit Calendly-Verweis zurueck
   - Webhook-Route unangetastet (fuer historische Events)
   - Backend-Code (paddle.ts) bleibt fuer spaetere Wiedernutzung
4. **CTAs auf Calendly umgebogen:**
   - Alle "Jetzt starten" / mailto-CTAs → "Demo-Call buchen (30 Min)" mit Calendly-Link
   - Nur 3 CTA-Typen erlaubt: Demo-Call, Founding-Partner-Programm, ROI-Rechner
5. **Founding-Partner-Banner (dismissible):**
   - Neue Komponente FoundingPartnerBanner.tsx
   - LocalStorage-Key `ai-conversion-banner-dismissed`
   - Path-Gate: nur auf /, /pricing, /features, /faq, /multi-ai
6. **Founding-Partner-Detail-Sektion mit Anchor #founding-partner**
7. **Garantie-Versprechen entfernt** ("100 qualifizierte Leads in 30 Tagen — oder Geld zurueck")
8. **Doku:** 4 neue Tech-Debt-Eintraege (TD-Billing-01/02, TD-Marketing-01, TD-Admin-01), architecture.md Paddle-Status aktualisiert
9. **Umlaute-Fix:** ue/oe/ae → ü/ö/ä in page-v2.tsx (26), PricingClient.tsx (22), FoundingPartnerBanner.tsx (2). Nur User-facing Text, keine Code-Kommentare
10. **AGB-Preistabelle aktualisiert (TD-Marketing-01):** Neue Listenpreise 349/699/1.299, Paddle-Paragraph durch SEPA ersetzt, Founding-Partner-Sonderkonditionen-Klausel eingefuegt (§4 Abs. 7), Onboarding-Schritt "Paddle" → "SEPA"
11. **Verifikations-Audit A.1-A.12:** Alle 12 Checks bestanden (Paddle deaktiviert, Calendly 9 Nutzungen, 0 alte CTAs, 0 Fake-Testimonials, 0 Garantie-Versprechen, Footer-Hinweis 2x, Meta-Tags korrekt, keine /onboarding-Links auf Marketing)

### Paddle-Status
Application abgelehnt 07.04.2026 (Kategorien AI Chatbots + Marketing Software
ausserhalb AUP). User-facing Checkout komplett deaktiviert, Backend-Code bleibt.

### Founding-Partner-Phase
Laeuft komplett ohne automatisierten Checkout:
- Prospect bucht Demo-Call via Calendly (30 Min)
- Im Call: Qualifizierung + Vertragsbesprechung
- Nach Call: PDF-Vertrag + PDF-Rechnung per Mail
- Kunde zahlt per SEPA-Ueberweisung
- Tenant wird manuell aktiviert (Admin-UI paddlePlan-Selector)

### Offen (Rest-DSGVO + neue Tech-Debt)
- **TD-Compliance-07 (pilot-blockierend):** EU-Vertreter nach Art. 27 DSGVO
- **TD-Compliance-09 (pilot-blockierend):** Telefonnummer im Impressum
- **TD-Billing-01 (pilot-skalierungsrelevant):** Payment-Provider-Ersatz
- **TD-Marketing-01:** AGB-Preistabelle anpassen
- **TD-Admin-01:** Admin-UI fuer manuelle Tenant-Aktivierung nach SEPA

---

## Tages-Zusammenfassung 15.04.2026

### Erledigt
1. **DSGVO-Luecke 1 — AVV-Subprozessor-Liste:** Anthropic, PBC als
   Subprozessor in `public/dpa.md` §5 ergaenzt (USA/SCCs, Zero Data
   Retention via API, Anthropic DPA-Link). Neuer §5.1 mit Details.
   AVV-Version auf 1.1 erhoeht.
2. **DSGVO-Luecke 2 — Widget-Consent-Transparenz:** `ChatClient.tsx`
   ConsentModal zeigt jetzt Provider-Liste (Anthropic, OpenAI),
   Speicherdauer (90 Tage), LOESCHEN-Hinweis und absolute Links zu
   Datenschutzerklaerung + AVV (iframe-kompatibel via NEXT_PUBLIC_APP_URL).
   Modal scrollbar auf Mobile (`max-h-[90vh] overflow-y-auto`).
3. TD-Compliance-03 als erledigt in `docs/tech-debt.md` dokumentiert.
4. **Folge-Iteration Consent-Modal:** Text auf Layered-Notice-Pattern
   gekuerzt (3 Saetze + 2 Links). Provider-Liste und LOESCHEN-Hinweis
   entfernt — Conversion-Optimierung, rechtlich via Layered Notice
   ausreichend (Details in Datenschutzerklaerung/AVV verlinkt).
5. **xAI-Klarstellung (TD-Compliance-04):** `/datenschutz` §6.3 auf
   Anthropic (primaer) + OpenAI (Lead-Scoring) reduziert. Neuer §6.4
   "Asset-Studio" mit xAI/Gemini/Flux — explizit klargestellt dass
   diese Provider keine Chat/Lead-Daten erhalten.
6. **Sentry in Datenschutz + AVV (TD-Compliance-05):** `/datenschutz`
   §6.5 mit Sentry-Details (SCCs, EU-Region, `sendDefaultPii: false`,
   30d Retention, Art. 6 Abs. 1 lit. f). `public/dpa.md` §5:
   "Functional Software, Inc. dba Sentry" ergaenzt. AVV-Version 1.2.
   TD-Compliance-02 abgeschlossen.
7. **AVV-Akzeptanz-Verifikation (TD-Compliance-06):** Befund Fall A —
   Timestamp wird bereits persistiert. `src/app/api/onboarding/route.ts`
   Z.19-21 erzwingt `dpaAccepted: true` (Zod-Literal), Z.93 schreibt
   `dpaAcceptedAt: new Date()`, Z.99 `auditLog("gdpr.dpa_accepted")`.
   `prisma/schema.prisma:28` enthaelt Feld. Keine Code-Aenderung noetig.
8. **Sentry-Compliance-Verifikation in Sentry-UI (User-Action 13.04.2026,
   dokumentiert 15.04.2026):**
   - Data Processing Amendment v5.1.0 unterzeichnet 13.04.2026
   - Privacy Policy + Terms of Service akzeptiert
   - EU-Region Frankfurt aktiv
   - Aggregated Identifying Data deaktiviert
   - TD-Compliance-01 als ERLEDIGT markiert.
9. **Doku-Sync:** PROJECT_STATUS, tech-debt, architecture konsistent auf
   Stand 15.04.2026 gebracht.

### Offen (Rest-DSGVO vor Pilot-Start)
- **TD-Compliance-07 (pilot-blockierend):** EU-Vertreter nach Art. 27 DSGVO
  — vor erstem Pilot-Vertragsabschluss erforderlich (Firmensitz Georgien).
  Optionen: Service-Anbieter (200-600 €/Jahr) oder EU-Bekannter mit AVV.
- **TD-Compliance-08:** Sentry SOC 2 Bridge Letter — ERLEDIGT 15.04.2026
  (User-Action im Sentry-Portal).
- **TD-Compliance-09 (pilot-blockierend):** Telefonnummer in Impressum +
  Datenschutz nachtragen (User liefert Nummer nach, § 5 TMG).
- DPO-Pflicht: vermutlich nicht pflichtig, Klaerung offen.

### Strategie-Dokument (Stand 14.04.2026)
- `/mnt/user-data/outputs/PROSPECT_DEMO_PLATFORM_PLAN.md` — Konzept,
  nicht implementiert. Voraussetzung fuer Bau: alle Pilot-Blocker (inkl.
  TD-Compliance-07/09) erledigt + manueller MOD-Test mit AG.

---

## Tages-Zusammenfassung 13.–14.04.2026

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
15. Admin-UI: Widget-Aktivierung via Toggle im Edit-Modal ergaenzt.
    Plan-Gate: nur Growth+ kann Widget aktivieren. Backend generiert
    Public-Key automatisch bei Erstaktivierung. Detail-Modal zeigt
    Widget-Status + Public-Key mit Copy-Button.
16. Eigen-Marketing-Widget auf ai-conversion.ai eingebunden:
    - Tenant `ai-conversion-marketing` (Growth-Plan)
    - Client-Komponente `MarketingWidget` mit `usePathname`-Gate
    - Widget erscheint auf /, /pricing, /faq, /datenschutz etc.
    - Ausgeschlossen: /admin, /dashboard, /embed, /api, /onboarding
    - Keine CSP-Aenderung noetig (same-origin, default-src 'self' deckt ab)
17. Admin-UI aufgeraeumt + Welcome-Message-Feld:
    - TenantDetailModal: Prompt-Editor + Vorlage-Buttons + Branchen-Dropdown
      entfernt; zeigt jetzt nur noch Read-Only-Prompt-Vorschau
    - EditTenantModal: neues Welcome-Message-Feld (max 500 Zeichen),
      sichtbar nur wenn Widget aktiv
    - PATCH-Endpoint: `webWidgetConfig` partielles Merge-Update
      (bestehende Felder wie primaryColor/logoUrl bleiben erhalten)
    - TENANT_PUBLIC_SELECT um `webWidgetConfig` erweitert
18. System-Prompt-Limit auf 30.000 Zeichen erhoeht (POST + PATCH Zod-Schemas).
    Vorher: 10.000 Zeichen — Sentry hatte 5 "Too big"-Events fuer legitime
    Prompts (Cassandra-Vorlage + tenant-spezifische Additions). Jetzt
    ausreichend Platz fuer branchen-spezifische Prompts.
19. Mara (ai-conversion-marketing-Bot) konfiguriert + iterativ kalibriert:
    - Sie-Form durchgehend (B2B-SaaS-Ton)
    - Kein Doppel-Einstieg (Welcome-Message + Bot-Begruessung nicht
      beide mit "Hi")
    - Anti-Redundanz-Regeln im System-Prompt (keine erneute
      Firmennennung, keine Wiederholung der User-Nachricht)
    - Praesens statt Konjunktiv (weniger ausweichend, klarer)
    - Harter CTA-Trigger nach 3-4 qualifizierenden Fragen
      (Demo-Termin / Call-Booking-Link)
20. Widget-Input-Focus-Bug gefixt (zweistufig):
    - Root-Cause 1: `disabled={isSending}` auf Textarea → Browser entfernt
      Fokus automatisch bei Disable, `focus()` auf disabled Element ist
      No-Op. Textarea bleibt jetzt enabled, nur SendButton disabled.
    - Root-Cause 2: `matchMedia("(max-width: 767px)")` im iframe triggerte
      Mobile-Path falsch (iframe-Breite 380-420px). Check entfernt.
    - Zusaetzlich: `requestAnimationFrame`-Wrap fuer focus()-Call nach
      Re-Render (robust gegen setState-Reihenfolge).
21. Admin-UI Status-Toggle-Styling angeglichen an Widget-Toggle
    (Label "Status" drueber, konsistente Struktur).
22. Admin-UI Anlage/Bearbeiten konsolidiert (ueber alle 13.-14.04.-Iterationen):
    - Plan-Selector in Anlage + Bearbeiten (Starter/Growth/Professional)
    - Widget-Toggle mit Plan-Gate (nur Growth+) und Auto-Key-Generierung
    - Welcome-Message-Feld (conditional bei Widget aktiv)
    - Saubere Trennung: Detail-Modal = read-only, Edit-Modal = einziger
      Edit-Surface (kein doppelter Prompt-Editor mehr)

### Naechste Schritte (priorisiert fuer 15.04.2026)

1. **Pilot-Blocker #4 — Datenschutzerklaerung Web-Widget** (2-3h, pilot-blockierend!)
   - VOR erstem Pilot-Kunden zwingend erforderlich
   - Sentry-Verarbeitung erwaehnen (TD-Compliance-02)
   - Widget-Cookie-/IP-Verhalten dokumentieren
2. **Pilot-Blocker #5 — Wix-Menuepfade verifizieren** (45 Min)
   - Integration-Guide pruefen gegen aktuellen Wix-UI-Stand
   - Screenshots im docs/integration-guide.md aktualisieren
3. **Pilot-Blocker #6 — AVV-Template nach Art. 28 DSGVO** (3-6h, Anwalt-Check empfohlen)
   - Template-Entwurf aus bestehenden Bausteinen
   - Anwalts-Review vor Versand an Pilot-Kunden

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
- ~~#2 Sentry / Error-Tracking~~ — erledigt 13.-14.04. (Server + Browser
  production-verified, alle Sentry-Configs in src/, CSP angepasst)
- ~~#3 DB-Dev/Prod-Split~~ — erledigt 13.04.
- #4 Datenschutzerklaerung Web-Widget — offen (Prio 1 fuer 15.04.)
- #5 Wix-Menuepfade verifizieren — offen (Prio 2 fuer 15.04.)
- #6 AVV-Template nach Art. 28 DSGVO — offen (Prio 3 fuer 15.04.)

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
