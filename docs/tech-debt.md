## Phase 1 — processMessage Extraktion

### Doppelter Tenant-Load in processMessage
- Status: bewusst akzeptiert in Phase 1a
- Problem: processMessage lädt den Tenant intern nochmal, obwohl der
  Caller ihn bereits geladen hat. Eine zusätzliche DB-Query pro
  Nachricht.
- Warum akzeptiert: Phase 1 ist semantikgleiche Extraktion. Interface-
  Änderung (tenant als Parameter) vermischt zwei Refactorings und
  erhöht Risiko.
- Wann fixen: In Phase 3, wenn ohnehin am Widget-Interface gearbeitet
  wird, oder früher falls Performance-Messungen es rechtfertigen.
- Aufwand: ca. 30 Minuten (Signatur erweitern, Caller anpassen,
  interne findUnique entfernen).

### Audit-Log enthält zusätzliches "channel"-Feld im neuen Pfad
- Status: bewusst akzeptiert, additive Erweiterung
- Problem: processMessage loggt channel in auditLog-Details, der alte
  Pfad nicht. Kein Breaking Change, aber streng genommen keine
  1:1-Semantik.
- Warum akzeptiert: Additive Audit-Erweiterungen sind rückwärts-
  kompatibel und helfen bei späterem Debugging.
- Wann fixen: Nicht fixen. Wird in Phase 2+ ohnehin Standard sein,
  wenn Web-Kanal produktiv läuft.

## Phase 2 — Schema-Migration

### Daten-Migration generate-widget-keys.ts nicht erstellt
- Status: bewusst verschoben auf Phase 3
- Grund: Das Skript wird erst benötigt, wenn der Widget-API-Endpoint
  tatsächlich den webWidgetPublicKey zur Tenant-Auflösung nutzt.
  Derzeit ist nur das Schema-Feld vorhanden, kein Code liest es.
- Wann erstellen: In Phase 3, zusammen mit der ersten Verwendung.

## Phase 2e.2 — Paddle Webhook doppeltes ts=-Parsing

### Status
Bewusst nicht behoben in der Replay-Attack-Commit.

### Problem
Das ts=-Timestamp wird jetzt an zwei Stellen geparst:
1. Im POST-Handler direkt (für Replay-Attack-Check)
2. In der verifySignature()-Helper-Funktion (für HMAC-Validierung)

Beide Parses lesen dasselbe Feld aus demselben Header.

### Warum akzeptiert
- Die Replay-Protection ist Security-relevant und dringender als
  die Performance-Optimierung.
- Ein Refactoring auf einen gemeinsamen Parse würde die
  verifySignature-Signatur ändern und ist ein eigenes Ticket wert.

### Wann fixen
In einer eigenen Refactoring-Session, nach Phase 3 oder wenn eine
dritte Paddle-Änderung anfällt. Kein Blocker für Phasen 3-7.

## Phase 2e.2 — System-Prompt Platzhalter-Refactoring

### Status
Halbfertiger Versuch aus früherer Session wurde verworfen.

### Idee (gut, aber sauber nachzuholen)
Hardcodierte Beispiel-Strings in den System-Prompts (starter.ts,
growth.ts, professional.ts) sollen durch [EINSTIEG], [EINWAND_BUDGET],
[EINWAND_NACHDENKEN], [TERMIN_BRIDGE]-Platzhalter ersetzt werden,
die über fillTemplate() pro Tenant gefüllt werden.

### Warum der erste Versuch verworfen wurde
- "// Fallback:"-Kommentare standen innerhalb von Template-Literal-
  Strings und wären als Teil des Prompts an Claude gegangen. Bug.
- Keine Fallback-Strategie wenn Platzhalter im Tenant-Config leer
  ist: der Bot würde dann leere Klammern ausgeben.
- Vermischung mit der geplanten Kanal-Abstraktion (Phase X).

### Wann richtig machen
Als eigene Phase NACH Phase 6 (Dashboard-Integration), zusammen
mit der Kanal-Abstraktion für Web-Widget. Dann kennen wir den
vollständigen Platzhalter-Bedarf und können beide Refactorings
konsolidiert umsetzen.

### Aufwand
Ca. 2-3 Stunden: Platzhalter definieren, fillTemplate erweitern,
Fallbacks bauen, Tests.

## Phase 3a — resolvePublicKey cached null-Ergebnisse

### Status
Bewusste Design-Entscheidung, kein Bug.

### Verhalten
Der In-Memory-Cache in src/lib/widget/publicKey.ts speichert auch
null-Ergebnisse 60 Sekunden lang. Konsequenz: Wenn ein Tenant via
Dashboard auf webWidgetEnabled=true gesetzt wird, kann es bis zu
60 Sekunden dauern, bis das Widget antwortet.

### Warum so
- Schutz vor Public-Key-Bruteforce: ohne null-Caching könnte ein
  Angreifer mit 100 Requests/h die DB mit Existenz-Probes belasten
- 60-Sekunden-Verzögerung nach einer Aktivierung ist akzeptabel,
  weil Tenant-Aktivierung kein Echtzeit-Vorgang ist
- Cache-Invalidierung wäre möglich, aber teurer als der gewonnene
  UX-Vorteil

### Wann fixen
Erst wenn ein Pilot-Kunde sich beschwert oder wir Cache-Invalidierung
für andere Zwecke (Tenant-Update, Config-Change) ohnehin einbauen.

## Phase 3a — Fehlende FK-Constraints auf tenantId

### Status
Strukturelle Lücke seit ursprünglichem Schema-Design.
Bisher folgenlos, weil noch kein echter Tenant-Delete mit Daten lief.

### Problem
Zwei Models haben tenantId als String-Feld OHNE Prisma @relation
und damit OHNE Datenbank-Foreign-Key:
- CampaignTemplate.tenantId (String?, Schema Zeile 184)
- Broadcast.tenantId (String, Schema Zeile 246)

Bei einem Tenant-Delete entstehen Records mit toter tenantId
("Waisen-Records"), die zwar logisch verloren sind, aber physisch
in der DB bleiben.

### Beim Phase-3a-Cleanup nicht akut
Beide Tabellen waren für die drei gelöschten Test-Tenants leer
(count=0). Inventur vor dem Delete bestätigt.

### Wann fixen
VOR dem ersten Pilot-Kunden, der CampaignTemplates oder Broadcasts
nutzt. Eigene Schema-Migration "add_missing_tenant_cascades":
1. CampaignTemplate.tenantId → mit Tenant @relation(onDelete: Cascade)
2. Broadcast.tenantId → mit Tenant @relation(onDelete: Cascade)
3. Migrationsskript prüft vorher auf existierende Waisen und
   bricht ab falls welche existieren

### Aufwand
Ca. 30-45 Minuten: Schema-Edit, migrate dev (interaktiv durch Mensch
wegen migration-workflow.md), Build-Test, Commit.

## Phase 3b.5 — Widget-Consent-UX-Entscheidung offen

### Status
Frage für Phase 4 (Widget-UI) markiert.

### Frage
Soll /api/widget/session ein optionales consentGiven: true aus dem
Request-Body akzeptieren, wenn das Widget-Frontend den Consent-
Dialog UX-seitig vor dem Chat-Start anzeigt?

### Optionen
- (a) Server-Consent-Dance behalten: erster Turn ist immer
  Consent-Anfrage. Frontend behandelt sie als normale Bot-Message.
  Vorteil: einheitlich mit WhatsApp.
- (b) Frontend zeigt Consent-Modal vor Session-Start. /session
  bekommt consentGiven=true und legt Conversation mit
  consentGiven=true an. Vorteil: ein Roundtrip weniger,
  natürlichere UX im Web.

### Entscheidung wann
In Phase 4, sobald das Widget-UI-Konzept steht.

## Phase 4-pre — Inline-Styles in Components nicht refaktoriert

### Status
Bewusst aufgeschoben. style-src 'unsafe-inline' und
style-src-attr 'unsafe-inline' bleiben in der CSP.

### Hintergrund
14 Inline-<style>-Tags in Components plus ~222 style={{}}-Props
in 24 Dateien. Refactoring würde 4-6 Stunden dauern und hohes
Bruchrisiko in Bestandsseiten haben. Nonce-basierte Lösung für
style-src funktioniert außerdem nicht für style="..."-Attribute
(die fallen unter style-src-attr, wo Nonces wirkungslos sind).

### Risiko-Bewertung
Niedrig. Inline-Styles sind kein realistischer XSS-Vektor
(keine Code-Execution). Der gesamte Sicherheitsgewinn von
CSP-Härtung liegt zu ~95% bei script-src, das jetzt vollständig
nonce-basiert mit 'strict-dynamic' läuft.

### Wann fixen
Phase 7 oder später, evtl. zusammen mit Migration auf
next/font und einer Tailwind-only-Style-Strategie.

## Phase 4-pre — Google Fonts hardcoded auf 4 Stellen

### Status
Bewusst belassen. CSP erlaubt fonts.googleapis.com und
fonts.gstatic.com als style-src- bzw. font-src-Quellen.

### Stellen
- src/middleware.ts:192 (Admin-Login-HTML, <link>-Tag)
- src/app/admin/page.tsx:207 (@import url(...))
- src/app/dashboard/conversations/[id]/page.tsx:133 (@import url(...))
- src/app/dashboard/login/route.ts:92 (Dashboard-Login-Error-HTML, <link>-Tag)

### Wann fixen
Wenn ohnehin ein Refactor in den jeweiligen Files passiert.
Migration auf next/font/google bringt Self-Hosting +
bessere Performance und erlaubt die beiden externen CSP-
Quellen wieder zu entfernen.

## Phase 4-pre — vercel.json X-Frame-Options Ausnahme für Widget-Routen

### Status
Erledigt mit Block 1.

### Hintergrund
Vercel setzt X-Frame-Options: DENY via vercel.json header config.
Dieser Header wird VOR der Next.js-Middleware angewendet und kann
nicht von der Middleware via response.headers.delete() entfernt
werden. Für Widget-iframe-Embedding muss der Header auf
Widget-Routen abwesend sein.

### Lösung
vercel.json header-Block geteilt in globalen Block (mit
X-Frame-Options DENY via Negative-Lookahead source
/((?!api/widget/|embed/).*)) und Widget-/Embed-spezifische
Blöcke ohne X-Frame-Options.

### Verifikation in Production
Nach erstem Vercel-Deploy mit Block 1: prüfen via
  curl -i https://<deployment-url>/api/widget/config?key=foo
  curl -i https://<deployment-url>/dashboard
Erwartung: Widget-URL hat KEIN X-Frame-Options Header,
Dashboard-URL hat X-Frame-Options: DENY.

## Phase 4b — unsafe-eval in Dev-Mode CSP

### Status
Erledigt mit Commit 9e134e4. Bewusste Trennung Dev/Prod.

### Hintergrund
Next.js React-Refresh-Runtime nutzt in Dev-Mode eval() für
Hot Module Reload. Strikte CSP aus Block 1 ohne unsafe-eval
hat das blockiert, ChatClient konnte nicht hydrated werden.

### Lösung
buildCspHeader prüft NODE_ENV. Development bekommt 'unsafe-eval',
Production bleibt strikt.

### Production-Verifikation
Nach erstem Vercel-Deploy von Phase 4b: prüfen via
  curl -i https://<deployment-url>/embed/widget?key=foo
  | grep -i content-security
Erwartung: KEIN 'unsafe-eval' im script-src.

### Risiko
Niedrig. Dev-Mode läuft nur lokal, nicht in Production.
Standard-Next.js-Empfehlung.

## Phase 4c — Tailwind 4 enabled: Variant unzuverlässig

### Status
Workaround mit React-State + Inline-Styles, keine offene
Aktion nötig.

### Hintergrund
In Phase 4c versuchten wir, den Send-Button-Hover-Effekt mit
Tailwinds enabled:hover:scale-110 etc. umzusetzen. Nach zwei
Iterationen hat der Effekt visuell nicht gegriffen, obwohl der
Code-Stack syntaktisch korrekt war. Vermutete Ursache: Tailwind 4
hat die enabled:-Variant noch als experimentell, oder die
Specificity-Auflösung gegen inline-styles ist nicht stabil.

### Lösung
SendButton-Komponente nutzt jetzt useState + onMouseEnter/Leave/
Down/Up + Inline-Styles für Transform/Brightness. Vollständig
kontrolliert, garantiert funktional, ~30 Zeilen statt ~10
Tailwind-Klassen. Akzeptierter Trade-off.

### Konsequenzen für andere Buttons
Falls in Zukunft weitere Buttons Hover-Effekte brauchen
(Phase 6 Dashboard z.B.), entscheiden wir pro Fall:
- Wenn nur einfacher Hover (Brightness/Color): Pure CSS reicht
- Wenn Transform oder komplexes Verhalten: React-State-Pattern

## Phase 5-Pre — Lessons Learned: externalId-Nullability-Regression

### Status
Erledigt mit Hotfix-Commit (Hash folgt).

### Was passiert ist
Phase 3a.5 hat Conversation.externalId von NOT NULL auf nullable
migriert, um WEB-Channel-Conversations zu unterstützen. Die
Schema-Migration und die Conversation-Erzeugung wurden korrekt
angepasst. Aber drei Dashboard-Dateien (dashboard/page.tsx,
crm/page.tsx, conversations/[id]/page.tsx) hatten lokale
maskId()-Helper, die externalId.length und externalId.slice()
ohne Null-Check aufriefen. TypeScript fing den Bug nicht, weil
die Interfaces fälschlich externalId: string statt string | null
deklarierten.

Beim Web-Widget-Testing am 11. April erzeugten wir 10 WEB-
Conversations. Eine landete in der "Top-5 zuletzt aktualisiert"-
Liste der Dashboard-Stats-API, und das Dashboard crashte mit
"Cannot read properties of null (reading 'length')". Beim Cleanup
verschwand der Bug "von selbst", weil keine WEB-Conversations
mehr in der Top-5 waren.

### Lessons Learned
Bei jeder zukünftigen Schema-Migration MUSS ein "Konsument*innen-
Audit" durchgeführt werden:
1. grep nach allen Verwendungen des geänderten Felds
2. Alle TypeScript-Interfaces aktualisieren
3. Alle Dereference-Stellen prüfen, ob sie null-safe sind
4. Optional: Alle gemeinsamen Helper (wie maskId) zentralisieren
   statt 3-fach kopieren

### Konkrete Aktion für die Zukunft
Bei der nächsten Schema-Migration: Schritt 4 in der
Migration-Workflow-Doku ergänzen: "Konsument*innen-Audit für
nullable-gewordene Felder durchführen, bevor Migration applied
wird."

### Code-Hygiene-Hinweis
maskId() existiert dreifach kopiert in drei Dateien. Sollte
in src/lib/utils/maskId.ts zentralisiert werden, mit ts-strict
Signatur (string | null). Phase 7 (Hardening) kann das
zusammenfassen.

## Phase 5 — Pilot-Kunden-Integration-Guide fehlt

### Status
Offen. Trigger: vor dem ersten Pilot-Kunden.

### Problem
Das Phase-5-Embed-Script (`public/widget.js`) wird von
Pilot-Kunden per `<script src="https://ai-conversion.ai/widget.js"
data-key="pub_xxx" async>` eingebunden. Kunden-Webseiten mit
striktem CSP (insbesondere solche mit `script-src 'self'` oder
Nonce-basierten Policies) werden den Loader blockieren.

Wichtig zur Abgrenzung: Das ist NICHT dasselbe Problem wie der
CSP-Hotfix Option D (der nur unsere lokale Demo-Seite betrifft).
Pilot-Kunden-Seiten liegen auf Kunden-Servern und unterliegen
Kunden-CSPs — unsere Middleware ist fuer diese Seiten
irrelevant. Wir koennen das NICHT server-seitig fixen, nur
dokumentieren.

### Was der Integration-Guide enthalten muss
- Das empfohlene Snippet inklusive aller Varianten:
  - Simple (keine CSP): `<script src=".../widget.js" data-key=...>`
  - Strict CSP mit Nonce: Snippet zeigt den Nonce-Platzhalter,
    Kunde muss ihn in seiner SSR-Pipeline einsetzen
  - CSP-Allowlist-Variante: Kunde muss `https://ai-conversion.ai`
    in seinen `script-src` eintragen
- Welche `connect-src`-Erweiterung gebraucht wird
  (fuer `/api/widget/config` + `/api/widget/session|message|poll`)
- Welche `frame-src`-Erweiterung gebraucht wird
  (fuer `/embed/widget`)
- Troubleshooting-Sektion fuer die haeufigsten CSP-Fehler
- Copy-Paste-faehige Konfigurationen fuer Next.js, Rails,
  Django, plain HTML

### Wann fixen
VOR dem ersten echten Pilot-Kunden, nicht davor. Kein Blocker
fuer weitere Phasen. Kann als eigener Doku-Commit oder Bestandteil
von Phase 6 (Dashboard) umgesetzt werden — im Dashboard koennte
der Embed-Code-Generator die Snippet-Variante direkt anhand der
Kunden-CSP-Situation ausspielen.

### Aufwand
Ca. 1-2 Stunden Doku (`docs/integration-guide.md`), plus
optional 2-3 Stunden fuer Dashboard-Integration.

## Phase 5 — Demo-Route-CSP-Lockerung (Option D Nachsorge)

### Status
Akzeptierter Trade-off, kein aktueller Bug. Trigger: wenn
`/widget-demo*` jemals dynamische Inhalte bekommt.

### Hintergrund
Der Phase-5-CSP-Hotfix (Option D) entfernt `'strict-dynamic'`
aus dem `script-src` fuer Routen, die mit `/widget-demo`
beginnen. Dadurch kann `public/widget-demo.html` den
`widget.js`-Loader ueber `'self'` laden.

Die Demo-Seite enthaelt heute **keine dynamischen Inhalte,
keine User-Daten, keine Auth und keinen sensitiven Endpoint** —
das Lockern ist risiko-minimal. Siehe ADR
`docs/decisions/phase-5-embed-script.md` -> "CSP-Hotfix".

### Wann fixen
Wenn die Demo-Seite jemals eines der folgenden bekommt:
- Dynamische Inhalte (Live-Config-Preview, A/B-Vorschau)
- User-Eingabefelder, die Payload an unseren Server senden
- Auth oder Sessions
- Verlinkung zu internen Dashboard-Bereichen

Dann greift Option E aus dem ADR: `/widget-demo*` als
Next.js Server Component migrieren, Nonce per `headers()
.get('x-nonce')` auf den Script-Tag injizieren, Route-Override
im `buildCspHeader` wieder entfernen.

### Aufwand
Ca. 2-3 Stunden: JSX-Port der HTML-Struktur, Route-Group mit
eigener `layout.tsx` fuer das Atelier-Hoffmann-Branding,
Middleware-Override zurueckbauen, Curl-Regression.

## Sub-Phase 6.5 — Webpack-Chunk-Mismatch nach Dashboard-Page-Fixes (Next.js 15.5.14)

### Status
Bekanntes Upstream-Problem, Workaround empirisch verifiziert.

### Datum
2026-04-12 (Sub-Phase 6.5 Polish-Phase)

### Häufigkeit
3× reproduziert (Phase 6.1, Phase 6.3, Sub-Phase 6.5)

### Symptom
Runtime Error "Cannot find module './NNNN.js'" nach fix-Commits
die bestehende Dashboard-Pages anfassen. Webpack-Runtime sucht
alte Chunk-IDs die in der neu kompilierten Version nicht mehr
existieren.

### Root-Cause (vermutet)
Next.js 15.5.14 Hot-Reload vergibt nach Multi-File-Änderungen
oder Fix-Commits Chunk-IDs neu, der laufende Dev-Server
referenziert aber noch die alten IDs im webpack-runtime.js.

### Workaround (empirisch verifiziert)
1. Dev-Server stoppen (separates PowerShell, nicht über
   Claude-Code-Shell-Wrapper — der hängt bei
   taskkill //F //IM node.exe)
2. Remove-Item -Recurse -Force .next
3. npx next dev neu starten
4. Browser Hard-Reload (Strg+Shift+R)

### Präventions-Regel für Phase 7+
Nach jedem fix()-Commit der bestehende Dashboard-Pages anfasst,
Dev-Server proaktiv neu starten statt auf Hot-Reload zu
vertrauen. 30 Sekunden Reset spart 5-10 Minuten Diagnose.

### Nicht zu fixen (Upstream)
Das ist ein Next.js-Dev-Server-Bug, kein Projekt-Code-Problem.
Produktions-Builds (npx next build) sind nicht betroffen.

## Phase 4-pre — prompt/route.ts ohne auditLog()

### Status
Pre-existing Drift, in Phase 6.1 Pattern-Referenz-Lesung
entdeckt. Nicht in Phase 6 gefixt.

### Problem
`src/app/api/dashboard/settings/prompt/route.ts` aendert via
POST den `systemPrompt` eines Tenants (`db.tenant.update` auf
Z. 51-54), ohne einen `auditLog()`-Aufruf auszuloesen. Laut
Spec-Regel "`auditLog()` fuer mutierende Aktionen mit IP-Hash"
ist das eine Luecke — und aus Compliance-Sicht relevant, weil
der System-Prompt das Bot-Verhalten signifikant aendern kann
(inkl. moeglichem Missbrauch).

Die Phase-6.2-Widget-Config-Routes (neuer `widget-config/route.ts`,
`generate-key/route.ts`, `toggle/route.ts`) loggen alle korrekt
via `auditLog()` mit IP-Hash — der Drift beschraenkt sich auf
die aeltere Prompt-Route und wird dort nicht vererbt.

### Warum nicht jetzt fixen
Phase 6.2 hat einen klar abgegrenzten Scope (Widget-Dashboard).
Ein Fix an einer unrelated Route waere Scope-Kreepp gegen die
"Don't add features beyond what was asked"-Regel. Der Fix selbst
ist trivial (5-10 Minuten: `auditLog("dashboard.prompt_updated",
{ tenantId, ip: hashIp(getClientIp(req)), details: { length:
systemPrompt.length } })` im POST-Handler ergaenzen, plus die
`AuditAction`-Union um `"dashboard.prompt_updated"` erweitern),
aber er gehoert in einen eigenen Commit.

### Wann fixen
VOR dem ersten echten Pilot-Kunden, der das Prompt-Feature
produktiv nutzt. Bis dahin ist der System-Prompt nur vom
internal-admin-Tenant erreichbar, Compliance-Risiko ist Null.

### Aufwand
5-10 Minuten. Ein `auditLog`-Aufruf, eine `AuditAction`-Union-
Erweiterung, ein Build-Check, ein Commit.

## Phase 6.1 — Hydration-Failure nach Middleware-Aenderung

### Status
Aufgetreten 2026-04-12 waehrend Sub-Phase 6.2 Browser-Test.
Geloest durch `rm -rf .next` plus Dev-Server-Neustart. Keine
Code-Aenderung noetig, kein Commit zum Fix.

### Symptom
`/dashboard` lieferte HTTP 200 (SSR-Initial-HTML), aber die
Client-Side-Hydration scheiterte komplett — React-Bundle lud
nicht, keine `useEffect`-Hooks feuerten, API-Routen
`/api/dashboard/me` und `/api/dashboard/stats` wurden nie
aufgerufen (deshalb tauchten sie nicht im Dev-Server-Compile-Log
auf). Ergebnis: weisse Seite nach Login.

Im Log sichtbar: vier aufeinanderfolgende `ENOENT: no such
file or directory, open '.next/server/app/dashboard/login/
route.js'` Errors, obwohl die Source-Datei
`src/app/dashboard/login/route.ts` existiert.

### Vermutete Ursache (nicht empirisch isoliert)
Korrupter `.next/`-Incremental-Compile-Cache nach mehreren
Middleware-Aenderungen im laufenden Dev-Server. Next.js 15
Hot-Reload hat bekannte Edge-Cases bei `src/middleware.ts`-
Aenderungen, bei denen neue Middleware-Logik aktiv ist aber
alte SSR-Artefakte weiter referenziert werden. Zwischen der
letzten Middleware-Aenderung (Phase-5-CSP-Hotfix Commit
`865843b`) und dem Auftritt des Bugs lagen mehrere
zwischenzeitliche Commits mit Incremental-Kompilierungen —
die Wahrscheinlichkeit einer Cache-Inkonsistenz war hoch.

**Ob ein reiner Prozess-Restart ohne `.next/`-Reset gereicht
haette, ist nicht experimentell belegbar — wir haben beide
Schritte gleichzeitig ausgefuehrt.** Die Evidenz der vier
ENOENT-Errors ueber vier Requests spricht gegen
Self-Recovery eines purenen Restarts.

### Trigger fuer Wiederholung (Praevention)
Nach jeder Aenderung an `src/middleware.ts` im laufenden
Dev-Server:

1. Dev-Server stoppen (`Strg+C` oder Background-Task killen)
2. `rm -rf .next`
3. `npx next dev` neu starten

**Hot-Reload alleine reicht bei Middleware-Aenderungen nicht
zuverlaessig.** Der Cache-Reset ist billig (Next.js kompiliert
in ~1.5s neu) und schliesst diese Drift-Klasse garantiert aus.

Aufwand der Praevention: 30 Sekunden pro Middleware-Aenderung.
Aufwand des Debuggings wenn nicht praeventiert: ~90 Minuten
(dieser Fall, inklusive Log-Analyse, Hypothesen-Bildung,
alternative Ursachen-Pruefungen).

### Latente, nicht-handelnde Hypothese
Waehrend des Debuggings wurde zusaetzlich vermutet, dass
`src/app/layout.tsx` einen `await headers()`-Aufruf braucht,
um Next.js 15 die Nonce-Injection-Pipeline fuer SSR-Scripts
zu aktivieren. Diese Hypothese wurde **nicht verifiziert** —
das Problem loeste sich durch den Cache-Reset, bevor ein
Browser-Console-Check der CSP-Violations stattfinden konnte.

**Kein Layout-Fix aktuell umgesetzt.** Falls dieselbe weisse-
Seite-nach-Login jemals wieder ohne Middleware-Aenderung
auftritt, ist diese Hypothese der erste Verdacht — dann
Browser-DevTools-Console oeffnen, nach CSP-Violations suchen,
im SSR-HTML-Output pruefen ob `<script>`-Tags `nonce="..."`-
Attribute tragen.

## Phase 7 — Rate-Limiter In-Memory-ephemeral-Cache im Dev-Server

### Status
Bekanntes Verhalten, kein Bug. Dokumentiert als Dev-Workflow-Hinweis.

### Datum
2026-04-12 (Phase 7, Test-Gruppe A, Szenario 4)

### Problem
Der Upstash-Rate-Limiter verwendet einen In-Memory-Cache
(ephemeral) im Dev-Server-Prozess. Ein `DEL`-Befehl gegen den
Upstash-Redis-Key resettet nur den serverseitigen Counter in
Redis, aber der In-Memory-Cache im laufenden Dev-Server-Prozess
bleibt bestehen und blockt weiterhin.

### Konsequenz fuer Development
Bei Rate-Limit-Tests waehrend der Entwicklung reicht ein Redis-DEL
nicht aus. Der Dev-Server muss neu gestartet werden, um den
In-Memory-Cache zu resetten.

### Production-Relevanz
Keine. Vercel Fluid Compute recycled Function-Instanzen regelmaessig,
der In-Memory-Cache hat dort eine natuerlich begrenzte Lebensdauer.
Deployments resetten den Cache komplett.

### Wann fixen
Nicht fixen. Das Verhalten ist korrekt und performance-optimal.
Fuer Entwickler-DX waere ein `?reset-rate-limit`-Debug-Endpoint
denkbar, aber nur wenn Tests haeufiger scheitern.

## Phase 7 — Mobile-Tastatur-Keyboard-Avoidance (Chromium-Default)

### Status
ERLEDIGT am 18.04.2026.

### Datum
Ersterfassung 2026-04-12 (Phase 7). Fix 2026-04-18.

### Symptom (vor Fix)
Beim aktiven Tippen ins Chat-Input-Feld scrollte die Welcome-Message
aus dem sichtbaren Viewport. Input-Leiste verschwand beim Hochscrollen.
Root-Cause: `h-screen` (100vh) auf iOS inkludiert den Bereich hinter
der Tastatur.

### Loesung (18.04.2026)
- `useVisualViewportHeight()` Hook: setzt CSS Custom Property `--vh`
  auf `window.visualViewport.height` bei jedem resize/scroll-Event
- Container-Hoehe: `height: var(--vh, 100dvh)` statt `h-screen`
  (Fallback-Kette: --vh → 100dvh → implizit 100vh)
- `overscroll-contain` auf Messages-Container (verhindert Scroll-Leak)
- `min-h-0` auf Messages-Container (Flexbox-Overflow-Fix)
- Auto-Scroll-Guard (100px threshold) entfernt — scrollt jetzt immer
  zur letzten Nachricht
- Neuer Input-Focus-Listener: scrollToBottom mit 150ms Delay nach
  Focus (Tastatur-Animation abwarten)
- Alle 3 Views (Chat, ConsentModal, RejectedScreen) auf --vh umgestellt

### Iteration 2 (18.04.2026 — nach Android-Chrome-User-Test)
Erster Fix (visualViewport im iframe-Inneren) war unzureichend:
Der iframe-Host-Container (.frame-wrap in widget.js) blieb auf voller
Hoehe, Android Chrome schob die Page nach oben → Header und fruehe
Messages unerreichbar.

Korrektur: visualViewport-Listener in widget.js (dem Host-Script)
statt im iframe-Inneren. .frame-wrap.height und .top werden dynamisch
auf visualViewport.height/offsetTop gesetzt. Innerer ChatClient
nutzt jetzt einfach height:100%. Nur auf Mobile (<=767px) aktiv.

### Frueherer Fehlversuch (dokumentiert fuer Kontext)
`100dvh` allein war wirkungslos, weil der iframe in einem
`position:fixed; inset:0` Container sitzt. visualViewport im
iframe-Inneren (--vh Custom Property) half teilweise auf iOS,
aber NICHT auf Android Chrome wo der Browser die Page statt
den Viewport verschiebt.

## DB-Umgebung: Dev/Prod-Split (erledigt 13.04.2026)

### Status
Erledigt. Zwei separate Prisma-Postgres-Instanzen auf `db.prisma.io`.

### Datum
2026-04-13

### Loesung (Option C umgesetzt)
Zwei separate Prisma-Postgres-Instanzen auf `db.prisma.io:5432`:
- **Dev-DB:** `.env.local` → `DATABASE_URL` mit eigenen Credentials.
  Schema via `prisma migrate deploy` aufgesetzt (6 Migrationen).
  Keine Produktionsdaten, sicher fuer lokale Experimente.
- **Prod-DB:** Ausschliesslich in Vercel Environment Variables
  (Production-Scope) hinterlegt. Enthaelt echte Tenant-Daten
  (`internal-admin`, 43 Conversations, 55 Messages, 13 Leads).
  Nicht in `.env.local` vorhanden.

### Verifikations-Pflicht
Vercel Production `DATABASE_URL` muss manuell verifiziert werden:
Vercel Dashboard → Settings → Environment Variables → Production.
Die Prod-Credentials duerfen NIEMALS in `.env.local` oder im
Repo landen. Bei `vercel env pull` darauf achten, dass nur
Development/Preview-Scope gezogen wird, nicht Production.

### Restrisiko
Beide Instanzen laufen auf `db.prisma.io` (Prisma Postgres).
Ein versehentliches `vercel env pull --environment production`
wuerde die Prod-URL wieder in `.env.local` schreiben. Dagegen
schuetzt nur Disziplin + dieser Dokumentations-Eintrag.

## Logo-Asset-404 auf Production

### Status
Akzeptiert — wird beim Rebranding behoben.

### Datum
2026-04-12

### Problem
Code referenziert noch `/logo1.jpg` und `/logo.png` in Metadata
(OG-Image, Twitter-Card), aber die Dateien wurden am 12.04. aus
`public/` entfernt bzw. umbenannt. Resultat: 404 auf
`_next/image?url=%2Flogo1.png` in Browser-Console.

### Einschlag
- Kein Rendering-Problem (Rest der Seite rendert normal)
- Nur Console-404, OG-Image/Twitter-Card-Preview fehlt
- Kein User-sichtbarer Effekt auf der Seite selbst

### Rueckzahlung
Beim geplanten Rebranding. Neues Logo wird mit neuem Code-Pfad
eingefuehrt, alte Referenzen in `src/app/layout.tsx` Metadata
automatisch ersetzt.

## Dev-Workflow & Local-Setup (offene Punkte vom 12.04.2026)

### TD-Dev-01: `taskkill /F /IM node.exe` killt alle Node-Prozesse
- Problem: killt auch Cross-Origin-Test-Server auf Port 3001
- Loesung: PID-spezifisch via
  `Get-NetTCPConnection -LocalPort X → Stop-Process -Id`
- Status: dokumentiert, nicht eskaliert

### TD-Dev-02: Next.js Dev-Server braucht `--hostname 0.0.0.0` fuer LAN-Zugriff
- Ohne Flag: Next.js bindet nur auf localhost, Smartphone im WLAN
  kommt nicht dran
- Korrekter Dev-Befehl: `npx next dev --hostname 0.0.0.0`

### TD-Dev-03: Webpack-Chunk-Mismatch nach `npx next build` mit laufendem Dev-Server
- Symptom: ENOENT auf /embed/widget/page.js
- Trigger: Production-Build parallel zum laufenden Dev-Server
- Rezept: `Strg+C → rm -rf .next → npx next dev --hostname 0.0.0.0`

### TD-Dev-04: Cross-Origin-Test-Setup existiert
- Pfad: `C:\Users\accou\cross-origin-test\index.html`
- Zweck: Widget-Embedding auf fremder Test-Domain (localhost:3001)
- Nicht im Repo, bei naechster Nutzung Setup nicht neu aufbauen

### TD-Dev-05: DSGVO-Cleanup-Cron Retention-Period unverifiziert
- Aktueller `retentionDays`-Wert unverifiziert
- Risiko: koennte Production-Daten frueher loeschen als gedacht
- To-Do: Wert pruefen und explizit dokumentieren

### TD-Dev-06: Race-Simulation M5 ausstehend
- Kontext: Medium M5 (Toggle Race-Condition) wurde via Code-Review
  verifiziert
- Race-Simulation (Dev-DB nullt Production-Key) wurde bewusst
  uebersprungen wegen Single-Instance-DB
- To-Do: nach Dev/Prod-DB-Split aktive Verifikation durchfuehren

## Audit-Follow-Up (Low-Befunde)

### Audit vom 12.04.2026: 11 Low-Befunde offen
Vollstaendige Liste mit Details in
`docs/audit-web-widget-2026-04-12.md`.
Zusammenfassung:
- L1: Magic Numbers in Rate-Limits (alle 4 Widget-Routes)
- L2: CORS-Helper 4x dupliziert
- L3: publicKey-Cache ohne Size-Limit
- L4: decryptText-Fehler im Poll nicht gefangen
- L5: Textarea focus:outline-none ohne Ersatz
- L6: mergeMessages re-sortiert bei jedem Poll
- L7: MessageBubble ohne React.memo
- L8: Feedback-Banner ohne aria-live
- L9: Platform-Tabs ohne ARIA-Tab-Pattern
- L10: Preview-iframe feste Breite 400px
- L12: widget.js innerHTML fuer SVG

Prioritaet: keiner pilot-blockierend, buendeln zu 1-2 Cleanup-
Commits in naechsten Tagen.

## Diagnose-Aufgaben (ungeklaerter Status)

### Diag-01: Dashboard-Magic-Link-Invalidierung bei Session-Wechsel
- Beobachtung 12.04.2026: internal-admin-Link war gueltig, dann
  test-b-Link verwendet, internal-admin-Link ungueltig
- Vermutung: neuer Token invalidiert alten
- Unverifiziert — echter Bug oder by design?

### Diag-02: Rate-Limit pro Tenant vs. pro IP
- Aktuell unklar, wie Rate-Limits im Multi-Tenant-Kontext scoped sind
- Test-Setup zwischen internal-admin und test-b nicht explizit
  verifiziert
- To-Do: gezielt testen, Dokumentation ergaenzen

## TD-Monitoring-01: Better Stack deckt DB-abhaengige Endpoints nicht ab (13.04.2026)

### Status
Offen.

### Kategorie
Monitoring/Observability.

### Pilot-blockierend
Nein, aber Pilot-Risiko.

### Kontext
Production war seit 08.04.2026 fuer /dashboard/login und alle
DB-abhaengigen Endpoints defekt durch korrumpierte DATABASE_URL
(Prisma P1001: "Can't reach database server at base"). Better Stack
hat 5 Tage lang keinen Alarm geschlagen, weil die 3 konfigurierten
Monitore (/, /widget.js, /api/widget/config) nicht DB-abhaengig sind.

### Loesung
Mindestens 1 Better-Stack-Monitor auf einen DB-abhaengigen Endpoint.
Beispiel: `GET /api/widget/config?key=invalid` → erwarte 4xx (nicht 5xx).
Bei 5xx → DB-Problem → Alarm. Alternative: Sentry (Pilot-Blocker #2)
faengt Runtime-Exceptions in Echtzeit und haette den P1001-Fehler
innerhalb von Sekunden gemeldet.

### Aufwand
15-30 Min (Better Stack). Wird durch Sentry-Setup groesstenteils obsolet.

## TD-Infra-01: Preview/Development DATABASE_URL bewusst nicht konfiguriert (13.04.2026)

### Status
Akzeptierte Architektur-Entscheidung.

### Kategorie
Infrastruktur.

### Pilot-blockierend
Nein.

### Kontext
Vercel Project hat NUR DATABASE_URL fuer Production gesetzt (zeigt
auf teal-battery). Preview und Development haben KEINE DATABASE_URL —
Builds scheitern absichtlich. Lokale Entwicklung laeuft ueber
.env.local (zeigt auf red-mirror, separate Instanz). red-mirror
existiert in Vercel Account-Storage, ist aber NICHT mit dem Projekt
verknuepft.

### Begruendung
- Preview-Deploys werden aktuell nicht aktiv genutzt
- Verhindert versehentliche Schreibvorgaenge auf Production-DB
  durch Preview-Branches
- Verhindert ungeklaerte Datenfluesse durch undefinierte Dev-Vercel-DB

### Bei kuenftigem Bedarf fuer Preview-Deploys
1. Vercel Storage → red-mirror → "Connect Project" → ai-conversion
2. NUR Preview + Development anhaken, Production NICHT
3. Custom Prefix komplett LEEREN (damit DATABASE_URL erzeugt wird)
4. Vercel legt automatisch korrekte Env-Vars an
5. Aufwand: 10-15 Min, eigene Session mit Smoke-Test

### ADR
`docs/decisions/vercel-storage-minimal-config.md`

## TD-Monitoring-02: Sentry Source-Maps-Upload deaktiviert (13.04.2026)

### Status
Akzeptierte Architektur-Entscheidung.

### Pilot-blockierend
Nein.

### Kontext
`hideSourceMaps: true` in `next.config.ts` (withSentryConfig).
Stack-Traces in Sentry zeigen minified Code statt Original-TS.
Vorteil: Free-Tier-Storage gespart, keine versehentliche
Code-Exposure via Source-Maps.
Nachteil: Debugging schwerer.

### Trigger fuer Aktivierung
Erste echte Production-Errors die schwer zu lesen sind
ODER Upgrade auf bezahlten Sentry-Plan.

## TD-Compliance-01: Sentry-AVV unterzeichnen (13.04.2026)

### Status
ERLEDIGT am 13.04.2026 (verifiziert am 15.04.2026 in Sentry-UI).

### Pilot-blockierend
War ja.

### Aufwand
5 Min.

### Vorgehen (erledigt)
Sentry-Settings → Legal & Compliance → Data Processing Amendment v5.1.0
unterzeichnet. Privacy Policy + Terms of Service akzeptiert. EU-Region
Frankfurt aktiv. Aggregated Identifying Data deaktiviert.

### Rest-Punkte (separat als Tech-Debt erfasst)
- SOC 2 Bridge Letter noch nicht akzeptiert → TD-Compliance-08
- EU-Vertreter Art. 27 DSGVO (Georgien-Sitz) → TD-Compliance-07
- DPO-Pflicht: vermutlich nicht pflichtig (Klaerung offen)

## TD-Compliance-02: Sentry in Datenschutzerklaerung aufnehmen (13.04.2026)

### Status
Erledigt am 15.04.2026 — siehe TD-Compliance-05.

### Pilot-blockierend
Ja (kommt mit Pilot-Blocker #4).

### Aufwand
Bei Datenschutzerklaerung-Update mit erledigen.

### Inhalt
Sentry GmbH (US-Mutter, EU-Tochter), Frankfurt-Hosting.
Verarbeitete Daten: Stack-Traces, URL-Pfade, User-Agent,
Browser-Version. `sendDefaultPii: false` → keine IP-Adressen,
keine Cookies.

## TD-Compliance-03: AVV-Anthropic ergaenzt + Widget-Consent transparent (15.04.2026)

### Status
Erledigt.

### Pilot-blockierend
War ja — zwei kritische DSGVO-Luecken vor Pilot-Start.

### Kontext
1. `public/dpa.md` listete OpenAI als Subprozessor, aber nicht Anthropic —
   obwohl Anthropic (claude-sonnet-4-20250514) primaerer Bot-Processor ist.
2. Widget-Consent-Modal nannte weder Drittanbieter noch Drittland-Transfer
   noch Links zu Datenschutzerklaerung/AVV → Art. 13 DSGVO unvollstaendig.

### Loesung
1. `public/dpa.md` §5: Anthropic, PBC (USA/SCCs, Zero Data Retention via
   API) VOR OpenAI in Subprozessor-Tabelle ergaenzt + §5.1 mit Details
   (Anthropic DPA-Link, Rechtsgrundlage, Aufbewahrung). Version auf 1.1
   erhoeht, Datum auf 15.04.2026.
2. `src/app/embed/widget/ChatClient.tsx` ConsentModal: Text erweitert um
   Provider-Liste (Anthropic, OpenAI), Speicherdauer (90 Tage), LOESCHEN-
   Hinweis, absolute Links auf `${NEXT_PUBLIC_APP_URL}/datenschutz` und
   `/dpa.md` (iframe-kompatibel, target="_blank"). Modal-Karte auf
   `max-h-[90vh] overflow-y-auto` umgestellt, damit erweiterter Text auf
   Mobile (<400px) scrollbar bleibt.

### AVV-Link-Ziel
`/dpa.md` (public-Datei), da keine `/dpa`-Route als Next-Page existiert.
Bei Anlage einer HTML-Route spaeter: Link in ChatClient.tsx DPA_URL anpassen.

## TD-Compliance-04: xAI-Klarstellung in Datenschutzerklaerung (15.04.2026)

### Status
Erledigt.

### Pilot-blockierend
Ja — falsche Provider-Zuordnung im Datenschutz vor Pilot-Start.

### Kontext
`/datenschutz` §6.3 listete Grok (xAI) gleichrangig mit Anthropic und
OpenAI als Bot-Provider. Tatsaechlich wird xAI nur im Asset-Studio fuer
Bild-Generierung genutzt, nicht im Chat-Bot.

### Loesung
- §6.3 auf Anthropic (primaer) + OpenAI (Lead-Scoring) reduziert,
  jeweils als Liste mit klarer Rollen-Zuordnung
- Neuer §6.4 "Asset-Studio" mit xAI/Gemini/Flux, explizite Klarstellung
  dass diese Provider keine Chat-Nachrichten/Lead-Daten erhalten
- Datum auf 15.04.2026 aktualisiert

## TD-Compliance-05: Sentry in /datenschutz + AVV ergaenzt (15.04.2026)

### Status
Erledigt. Ersetzt TD-Compliance-02.

### Pilot-blockierend
Ja — Sentry-Verarbeitung musste vor Pilot-Start transparent gemacht werden.

### Loesung
- `src/app/datenschutz/page.tsx` §6.5: Sentry als eigener Drittanbieter
  dokumentiert. Sitz USA, Daten-Hosting Frankfurt, SCCs, `sendDefaultPii:
  false`, 30 Tage Retention, Rechtsgrundlage Art. 6 Abs. 1 lit. f.
- `public/dpa.md` §5: "Functional Software, Inc. dba Sentry" in
  Subprozessor-Tabelle. AVV-Version auf 1.2 erhoeht.

## TD-Compliance-06: AVV-Akzeptanz-Verifikation (15.04.2026)

### Status
Nur-Verifikation, keine Code-Aenderung noetig.

### Befund
`src/app/api/onboarding/route.ts` Z.19-21 erzwingt `dpaAccepted: true` via
Zod-Literal (Request wird ohne Akzeptanz mit 400 abgelehnt). Z.93
persistiert `dpaAcceptedAt: new Date()` in `Tenant`-Tabelle
(`prisma/schema.prisma:28` — Feld existiert). Zusaetzlich Audit-Log
`gdpr.dpa_accepted` (Z.99-102). AVV-Akzeptanz ist DSGVO-konform
dokumentiert; kein Fix noetig.

### Folge-Iteration 15.04.2026 — Layered Notice
Consent-Modal-Text auf Layered-Notice-Pattern eingedampft: 3 Saetze +
2 Links (Datenschutzerklaerung, AVV). Provider-Liste (Anthropic/OpenAI)
und LOESCHEN-Hinweis entfernt — rechtlich ausreichend via Layered
Notice (h.M. deutscher Datenschutzbehoerden, EuGH-Linie), Kerninfo plus
Link zur vollstaendigen Erklaerung. Begruendung: Conversion-Optimierung
ohne Transparenz-Verlust. `max-h-[90vh] overflow-y-auto` bleibt als
Sicherheitsnetz.

## TD-Compliance-07: EU-Vertreter nach Art. 27 DSGVO (15.04.2026)

### Status
ERLEDIGT am 20.04.2026.

### Pilot-blockierend
War JA — jetzt erledigt. EU-Vertreter Prighter (iuro Rechtsanwaelte GmbH
t/a Prighter, Schellinggasse 3, 1010 Wien) im Impressum eingetragen.

### Aufwand
1-2 Stunden Entscheidung + Vertrag, danach laufend.

### Optionen
- **Service-Anbieter** (z.B. EU Representative GmbH, Prighter, VeraSafe):
  200-600 €/Jahr, schnell einsatzbereit, fuer Solo-Founder Standard
- **EU-Bekannter mit Auftragsverarbeitungsvertrag + Vollmacht:** unentgeltlich
  moeglich, aber vertragliche Absicherung noetig

### Nachbereitung
Kontaktdaten des Vertreters in `/datenschutz` §1 und Impressum aufnehmen.

## TD-Compliance-08: Sentry SOC 2 Bridge Letter akzeptieren (15.04.2026)

### Status
ERLEDIGT am 15.04.2026 (User-Action im Sentry-Portal).

### Pilot-blockierend
Nein — nur Compliance-Nachweis fuer B2B-Audits.

### Aufwand
2 Min (erledigt).

### Vorgehen (erledigt)
sentry.io → Settings → Legal & Compliance → SOC 2 Bridge Letter
akzeptiert. Bestaetigung archivieren.

## TD-Compliance-09: Telefonnummer im Impressum nachtragen (15.04.2026)

### Status
ERLEDIGT am 20.04.2026.

### Pilot-blockierend
War JA — jetzt erledigt. Telefonnummer ist im Kanzlei-Impressum
(content/legal/impressum.md) enthalten.

### Aufwand
5 Min (Edit + Commit) sobald Nummer vorliegt.

### Vorgehen
- `src/app/impressum/page.tsx` Kontakt-Section: "wird nachgereicht" ersetzen
- `src/app/datenschutz/page.tsx` §1 Verantwortlicher: gleiche Aenderung
- Pro-Forma Commit: `docs(impressum): add phone number`

## TD-Monitoring-03: instrumentation.ts Lokation fuer Next.js 15 + src/ (13.04.2026)

### Status
Erledigt (dokumentiert fuer Wissens-Konservierung).

### Pilot-blockierend
Nein.

### Kontext
Bei manueller Sentry-Installation (ohne Wizard) wurde `instrumentation.ts`
zunaechst ins Projekt-Root gelegt. Next.js 15 mit `/src/app`-Verzeichnis
erwartet die Datei aber in `/src/instrumentation.ts` — sonst wird sie
nicht geladen, Sentry SDK bleibt uninitialisiert (silent No-Op).

Symptom: `getClient()` returns undefined, `captureException()` fuehrt
keinen HTTP-Call aus, keine Events in Sentry-Dashboard sichtbar.

### Loesung (am 13.04.2026 erfolgt)
- `instrumentation.ts` → `src/instrumentation.ts` verschoben
- Imports angepasst: `./sentry.*.config` → `../sentry.*.config`

### Lehre fuer Zukunft
- Bei Next.js + `src/`-Verzeichnis IMMER `instrumentation.ts` in `/src/` legen
- Nicht-Wizard-Installs erfordern bewusste Pfad-Wahl
- Diagnose-Endpoint mit `Sentry.getClient()` ist die schnellste Verifikation

## TD-Monitoring-04: Browser-Side Sentry war durch CSP blockiert (13.04.2026)

### Status
Erledigt.

### Pilot-blockierend
Nein (Server-Side Sentry funktionierte).

### Kontext
CSP `connect-src 'self'` blockierte alle Browser-Fetch-Calls zu
`https://*.ingest.de.sentry.io`. Sentry Client-SDK konnte keine Events
senden. Server-Side Sentry (via instrumentation.ts) war nicht betroffen
(kein CSP im Server-Kontext). Dadurch wurde der Bug beim initialen
Sentry-Test nicht entdeckt (Test lief nur Server-Side).

### Loesung
`connect-src` in `src/middleware.ts` um `https://*.ingest.de.sentry.io`
erweitert.

### Lehre fuer Zukunft
Bei jedem neuen externen Service der Browser-Requests macht:
CSP-connect-src-Anpassung in Middleware mitdenken. Checkliste:
- Sentry → connect-src
- Analytics → connect-src + script-src
- CDN-Assets → script-src / style-src / img-src

## TD-Monitoring-05: Sentry Browser-SDK-Init auf src/instrumentation-client.ts umgestellt (14.04.2026)

### Status
Erledigt.

### Pilot-blockierend
Nein.

### Kontext
`sentry.client.config.ts` im Projekt-Root wurde von `@sentry/nextjs` v10
+ Next.js 15 nicht mehr automatisch geladen. Die Build-Warnung
(*"It is recommended renaming your sentry.client.config.ts file, or moving
its content to instrumentation-client.ts"*) wurde beim initialen Setup
ignoriert. Folge: `Sentry.init()` wurde im Browser nie aufgerufen,
Browser-Events landeten nie in Sentry. Server-Side Sentry ueberdeckte
den Bug (funktionierte korrekt via `src/instrumentation.ts` register()).

### Loesung
Saubere Umsetzung nach offizieller Sentry-Doku fuer Next.js 15 + src/:
- `/sentry.client.config.ts` → `src/instrumentation-client.ts`
- `/sentry.server.config.ts` → `src/sentry.server.config.ts`
- `/sentry.edge.config.ts` → `src/sentry.edge.config.ts`
- `src/instrumentation.ts` Imports angepasst (`../` → `./`)
- `next.config.ts` unveraendert (withSentryConfig ist pfad-agnostisch)

Datei-Inhalte identisch (DSN, tracesSampleRate=0, kein Replay,
enabled=production, sendDefaultPii=false). Kein `onRouterTransitionStart`
(nicht noetig bei tracesSampleRate=0).

### Lehre fuer Zukunft
Build-Warnungen von Drittanbieter-SDKs NIEMALS ignorieren — auch nicht
wenn alles "anscheinend" funktioniert. Server-Side kann Client-Side-Bugs
ueberdecken, die erst bei echtem User-Traffic sichtbar werden.

## Code-Cleanup (nicht blockierend)

### TD-Cleanup-01: Vercel.live-Nonce-Fehler in CSP
- Symptom: "Sign in with"-Button auf Preview-Deploys wirft CSP-Warning
- Ursache: vercel.live-Script braucht Nonce-Ergaenzung oder Whitelist
- Nur Preview-Deploys betroffen, Production unauffaellig
- Fix: `frame-src https://vercel.live` in CSP-Konfiguration (Middleware)
- Aufwand: 15 Min inkl. Preview-Test

### TD-Cleanup-02: Widget-Auth-Diskrepanz — NICHT VERIFIZIERT
- Uebergabeprotokoll nannte `x-widget-public-key`-Header als
  alternativen Auth-Pfad in `/api/widget/config`
- Code-Audit 12.04.2026: Header existiert NICHT im Code.
  Config-Endpoint nutzt ausschliesslich Query-Parameter `?key=`
- Status: kein Action-Item, Punkt ist gegenstandslos

### TD-Cleanup-03: Phase-4-Branch — NICHT VERIFIZIERT
- Uebergabeprotokoll nannte Branch `phase-4-admin-dashboard`
  mit 11 ungemergten Commits
- Code-Audit 12.04.2026: Branch existiert weder lokal noch remote
  (kein Match in `git branch -a`)
- Status: moeglicherweise bereits gemergt oder verworfen, kein
  Action-Item

## TD-Billing-01: Payment-Provider-Ersatz fuer Paddle (16.04.2026)

### Status
Offen.

### Pilot-blockierend
Ja — aktuell laeuft Founding-Phase manuell ueber SEPA. Fuer Skalierung
ueber 5-10 Kunden wird automatisierter Checkout benoetigt.

### Kontext
Paddle hat am 07.04.2026 die Application fuer ai-conversion.ai abgelehnt
(Kategorien "AI Chatbots" + "Marketing Software" ausserhalb Paddle
Acceptable Use Policy). Payouts nicht aktiviert, kein Checkout moeglich.
User-facing Checkout auf der Website komplett deaktiviert (503 mit
Calendly-Verweis). Backend-Code (src/modules/billing/paddle.ts) bleibt
fuer eventuelle spaetere Wiedernutzung.

### Optionen
- (a) Lemon Squeezy (MoR, AI-friendly, 1-2 Wochen Setup)
- (b) Stripe nach US-LLC-Setup (2-4 Monate)
- (c) Weiter manuell per SEPA (Demo-Call → PDF-Vertrag → SEPA-Rechnung)

### Entscheidung
Nach 3-5 Pilot-Kunden evaluieren. Aktuell reicht SEPA.

## TD-Billing-02: Paddle-Einspruch versuchen (16.04.2026)

### Status
Offen.

### Pilot-blockierend
Nein.

### Kontext
Paddle-Einspruch koennte versucht werden. Geschaetzter Aufwand: 30 Min.
Erfolgswahrscheinlichkeit 15-25% laut ConvArch-Einschaetzung.

### Wann
Optionaler 30-Min-Task, keine Prioritaet.

## TD-Marketing-01: AGB-Passage zu Setup-Gebuehr anpassen (16.04.2026)

### Status
ERLEDIGT am 16.04.2026.

### Pilot-blockierend
War ja — inkonsistent mit Website ("0 EUR in Pilotphase").

### Kontext
src/app/agb/page.tsx §4 Preistabelle auf neue Listenpreise (349/699/1.299)
aktualisiert. Paddle-MoR-Absatz durch SEPA-Zahlungsabwicklung ersetzt.
Neue Founding-Partner-Sonderkonditionen-Klausel als §4 Abs. 7 eingefuegt.
Onboarding-Schritt "Paddle" durch "SEPA" ersetzt.

### Aufwand
Erledigt in ~15 Min.

## TD-Admin-01: Admin-UI fuer manuelle Tenant-Aktivierung (16.04.2026)

### Status
Offen.

### Pilot-blockierend
Nein — wird relevant bei erstem zahlenden Pilot.

### Kontext
Founding-Phase laeuft ohne automatisierten Checkout: Demo-Call via
Calendly → PDF-Vertrag + PDF-Rechnung per Mail → Kunde zahlt per SEPA →
Tenant wird manuell aktiviert. Aktuell: Direct-DB-Access via Admin-UI
(paddlePlan-Selector) reicht. Spaeter: dedizierter "Activate after
SEPA payment" Flow im Admin-UI.

### Aufwand
2-3 Stunden (UI + API-Endpoint fuer Plan-Setzung nach Zahlungseingang).

## TD-Compliance-12: Ergaenzungstexte nach Kanzlei-Review uebernehmen (20.04.2026)

### Status
Offen (wartet auf Antwort).

### Pilot-blockierend
Nein — Texte sind live, Kanzlei-Review kann nachtraeglich Anpassungen
bringen.

### Kontext
E-Mail an IT-Recht-Kanzlei (Keller) am 20.04.2026 mit Bitte um Review
der Datenschutz-Ergaenzungstexte (Sentry, Resend, Chat-Widget,
Google-Fonts-Hinweis). Antwort erwartet in 1-3 Werktagen.

Betrifft: content/legal/datenschutz-ergaenzung.md

### Aufwand
15-30 Min (Textanpassungen nach Kanzlei-Feedback).

## TD-Pilot-01: WhatsApp Phone ID als Pflichtfeld bei Tenant-Anlage (21.04.2026)

### Status
Offen.

### Kategorie
Pilot-relevant, nicht blockierend.

### Pilot-blockierend
Nein fuer manuell angelegte Tenants. Ja, sobald Kunden Tenants
selbst anlegen (Self-Service-Phase).

### Problem
Bei Tenant-Anlage im Admin-Interface ist das Feld "WhatsApp
Phone ID" aktuell Pflicht, auch wenn der Tenant Web-Widget-only
nutzen soll. Das fuehrt zu Workarounds wie "00000" als
Dummy-Wert. Wegen `@unique`-Constraint auf `whatsappPhoneId`
muss jeder Web-Widget-only Tenant sogar einen eindeutigen
Dummy-Wert bekommen (00000, 00001, ...).

### Ursache
Historisch — urspruengliches Produkt war WhatsApp-first, Feld
wurde als Required-Feld mit `@unique`-Constraint angelegt.

### Aktuelle Code-Lage
- `prisma/schema.prisma:21` → `whatsappPhoneId String @unique`
  (NOT NULL)
- `src/app/api/admin/tenants/route.ts:27` → Zod-Validator
  `whatsappPhoneId: z.string().min(1).max(64)` (required)
- `src/app/admin/page.tsx:761` → Frontend `isValid`-Check
  erzwingt nicht-leeren Wert; Field (Z. 860-866) ohne
  "Optional"-Kennzeichnung

### Impact
- User-Experience-Bug in der Admin-UI
- Unprofessioneller Eindruck bei Self-Service-Tenant-Erstellung
- Dummy-Werte in Produktions-DB (Data-Quality-Issue)
- Jeder Dummy-Wert verbrennt einen Slot im `@unique`-Raum

### Fix
- WhatsApp Phone ID als Optional im Prisma-Schema
  (`String? @unique` → Prisma erlaubt Multi-NULL auf
  `@unique`-Feldern)
- Zod-Validator anpassen: Required nur, wenn WhatsApp-Feature
  aktiviert ist (plan-/feature-konditional)
- Admin-Frontend: Feld als "Optional" kennzeichnen oder
  ausblenden, wenn Plan/Feature WhatsApp nicht umfasst
- Migration fuer existierende Tenants mit "00000"-Werten
  (auf NULL umstellen)

### Aufwand
~45-60 Min.

### Prioritaet
Mittel. Fix innerhalb der naechsten 2-3 Wochen, spaetestens
vor Self-Service-Flow.

## TD-Pilot-02: Web-Widget muss nach Tenant-Erstellung manuell aktiviert werden (21.04.2026)

### Status
Offen.

### Kategorie
Pilot-relevant, nicht blockierend.

### Pilot-blockierend
Nein — Admin-Fehleranfaelligkeit, kein Funktionsausfall.

### Problem
Bei Tenant-Anlage ist "Web-Widget" standardmaessig nicht
aktiviert, auch bei Plaenen, die Web-Widget enthalten (Growth,
Professional). Admin muss nach Tenant-Erstellung manuell das
Widget aktivieren (Admin-Edit-Modal oder Dashboard-Toggle).

### Ursache
Historisch — WhatsApp war der Primaer-Kanal, Web-Widget kam
spaeter dazu (Phase 2-5). Default-State wurde nie an den
neuen Produkt-Stand angepasst.

### Aktuelle Code-Lage
- `prisma/schema.prisma:40` →
  `webWidgetEnabled Boolean @default(false)` (DB-Default OFF)
- `src/app/api/admin/tenants/route.ts:114-127` (POST-Handler)
  setzt `webWidgetEnabled` NICHT explizit → erbt `false`
- `src/app/admin/page.tsx:850-918` (Create-Dialog) hat KEINEN
  `webWidgetEnabled`-Toggle im Anlage-Formular
- Plan-Selector-UI-Label "Growth (Web-Widget aktiv)" ist
  rein dekorativ, loest keine Auto-Aktivierung aus
- Aktivierung erfolgt NUR via Admin-Edit-Modal
  (`page.tsx:1395-1415`) oder Dashboard-Toggle
  (`src/app/api/dashboard/widget-config/toggle/route.ts`)

### Impact
- Extra-Arbeitsschritt bei jeder Tenant-Anlage
- Risiko: Admin vergisst Aktivierung → Widget-Integration
  scheitert beim Kunden
- Gegenlaeufig zur aktuellen strategischen Ausrichtung
  (Web-Widget-first nach Meta-Verifizierungs-Problemen mit
  WhatsApp)

### Fix
- Default-Aktivierung Web-Widget plan-basiert umkehren:
  - Starter (kein Widget): `webWidgetEnabled` default OFF
  - Growth / Professional / hoeher: `webWidgetEnabled`
    default ON
- Umsetzung im POST-Handler von `api/admin/tenants/route.ts`
  (aus `paddlePlan` ableiten), nicht im Prisma-Default
  (bleibt OFF als sichere Baseline)
- WhatsApp-Aktivierung als separaten, nachtraeglich
  ausloesbaren Schritt kennzeichnen (sobald
  Meta-Verifizierung durch)
- Admin-UI Create-Dialog: WhatsApp-Felder als "optional
  spaeter aktivieren" kennzeichnen, Web-Widget-Status
  sichtbar machen

### Aufwand
~20-30 Min.

### Prioritaet
Mittel-Hoch. Zeitnah (naechste 2 Wochen), spaetestens vor
Self-Service-Kunden. Strategisch konsistent mit
Widget-first-Positionierung.

## TD-Pilot-03: Scoring-Prompt tenant-agnostisch, nicht bildungsbranchen-optimiert (21.04.2026)

### Status
Offen.

### Kategorie
Pilot-relevant.

### Pilot-blockierend
Nein fuer MOD-Demo-Call — Demo-Leads haben vorgesetzte Scores,
Live-Nora-Testgespraech akzeptiert generischen Score.
Relevant ab erstem echten MOD-Pilot mit Produktionstraffic.

### Problem
Der GPT-4o-Scoring-Prompt in `src/modules/bot/gpt.ts:36-53`
(`SCORING_SYSTEM_PROMPT`) ist **zentral und tenant-agnostisch**.
Er bewertet Leads nach generischen DACH-B2B-Kriterien:
Kaufinteresse, Budget-Signale, Dringlichkeit,
Gespraechsqualitaet. Das passt fuer klassische B2B-Software-
Leads, aber NICHT fuer bildungsbezogene Qualifikation:

- **B2C (Arbeitssuchende, Mara):** relevante Signale sind
  Kurswahl-Konkretheit, Arbeitsvermittler-Kontakt,
  Bildungsgutschein-Status, Zeitrahmen bis Kursstart,
  sprachliches Ausdrucksvermoegen. "Budget" ist hier irrelevant
  (Foerderung ueber Gutschein).
- **B2B (Qualifizierungschancengesetz, Nora):**
  Entscheidungs-Position, Unternehmensgroesse (fuer Foerder-
  saetze), Mitarbeiter-Anzahl, Foerderungs-Awareness,
  Zeitdruck-Treiber. "Budget" wird hier durch "Foerderfaehigkeit"
  ersetzt.

### Ursache
Scoring-Prompt wurde initial fuer das generische Paddle-
Plan-Standard-Produkt geschrieben (vor der Entscheidung fuer
die Bildungsbranche als Pilot-Ziel). Demo-Phase zeigt die
Luecke, aber sie wurde bewusst nicht unter Zeitdruck fuer den
Demo-Call geschlossen (siehe Session-Log 21.04.2026:
"Demo-Leads bekommen vorgesetzte Scores, Live-Nora akzeptiert
generischen Score").

### Impact
- MOD-Pilot-KPIs: GPT-4o-Score korreliert nicht stark mit
  Bildungsberatungs-Konversionsrate — Salesreps muessen
  Score-Signale manuell uebersetzen
- Andere Pilotkunden mit Nicht-B2B-Software-Profil
  (Coaching, Immobilien, Handwerk) hatten historisch
  dieselbe Diskrepanz, aber nie formalisiert

### Fix
- ADR schreiben unter `docs/decisions/scoring-prompt-tenant-
  specific.md`: Soll der Scoring-Prompt pro `leadType` + ggf.
  `branche` parametrisiert werden?
- Implementierungs-Optionen:
  - (a) Mehrere hartkodierte Scoring-Prompt-Varianten
    (B2C, B2B, Default), Auswahl via `leadType` aus
    `webWidgetConfig`. Einfach, wenig Flexibilitaet.
  - (b) Scoring-Prompt aus `tenant.systemPrompt` **abgeleitet**:
    kurzes "Analysiere die Signale, die der Bot-Prompt
    priorisiert" vor dem Generic-Prompt platzieren. Komplexer,
    aber automatisch tenant-spezifisch.
  - (c) Tenant-Feld `scoringContext: string` (`@db.Text`,
    nullable) als explizites Override fuer den Scoring-
    Prompt. Am flexibelsten, aber erfordert Dashboard-UI
    fuer Wartung.
- Regression-Tests gegen internal-admin, test-b, bestehende
  Coaching-/Immobilien-Templates

### Aufwand
2-3 Stunden (ADR + Refactor + Tests). Abhaengig von Option.

### Trigger
Nach TD-Pilot-05 (Prompt-Sales-Effizienz-Optimierung).
Begruendung: Der Scoring-Prompt bewertet Signale, die der
Bot im Gespraech erzeugt. Wenn Bot-Prompts (TD-Pilot-05)
noch unoptimierte Signale erzeugen, wird ein refactor des
Scoring-Prompts auf suboptimaler Rohdaten-Basis optimiert.
Reihenfolge: erst TD-Pilot-05 (bessere Signale),
dann TD-Pilot-03 (bessere Bewertung).

### Prioritaet
Mittel. Vor erstem echten MOD-Pilot mit Produktionstraffic —
aber eben NACH TD-Pilot-05. Zeitfenster: 1-2 Wochen nach
Demo-Call.

## TD-Pilot-04: Widget-Preview im Admin-Interface (21.04.2026)

### Status
Offen.

### Kategorie
Pilot-relevant.

### Pilot-blockierend
Nein — Admin kann via manuellem HTML-Test oder Dashboard-
Widget-Preview testen. Nur Workflow-Reibung, keine
Funktionsluecke.

### Problem
Nach Tenant-Anlage und Prompt-Konfiguration gibt es im
Admin-Interface keine Moeglichkeit, das Widget live zu
testen. Admin muss manuell eine HTML-Datei erstellen oder
Browser-Console-Injection auf einem lokalen Webserver
nutzen. Der bestehende Dashboard-Widget-Preview
(`src/app/dashboard/settings/widget/page.tsx`) ist
tenant-eigener Flow und nicht fuer Admin-Cross-Tenant-
Checks gedacht.

### Ursache
Feature wurde bisher nicht priorisiert — Admin-Workflow
erwartete manuelles Testing durch den Plattform-Betreiber
mit Dev-Umgebung. Mit wachsender Anzahl Kunden wird das
zum Engpass.

### Impact
- Solo-Founder-Workflow: 15-20 Min Zeit-Verlust bei jedem
  Prompt-Update (HTML-Datei anlegen, lokal serven, testen,
  aufraeumen)
- Bei Prompt-Iteration unter Zeitdruck
  (Demo-Vorbereitung, Kunden-Feedback) signifikante
  Reibung
- Self-Service-Kunden koennten Konfiguration ohne
  Preview-Option nicht selbst verifizieren
- Support-Aufwand bei Onboarding neuer Kunden erhoeht

### Fix
- Admin-Detail-View pro Tenant (`src/app/admin/page.tsx`
  Tenant-Edit-Modal): neuer Button "Widget Preview"
- Oeffnet Modal oder separate Route
  (`/admin/tenants/[id]/preview`) mit eingebettetem
  Widget
- Nutzt `webWidgetPublicKey` des Tenants automatisch,
  keine Parameter-Eingabe noetig
- Optional: Device-Preview (Desktop / Mobile Toggle)
- Optional: Test-Mode-Flag
  (z.B. `?admin-preview=1`-Query), der Gespraeche als
  `channel: "WEB"` mit einem `widgetVisitorMeta.adminTest`
  Marker schreibt, damit Lead-Scoring und CRM-Push
  unterdrueckt werden koennen. Erfordert kleine
  Erweiterung in `processMessage`.

### Aufwand
2-3 Stunden.

### Pilot-relevanz
Ja, sobald mehrere Kunden parallel onboarded werden.
Fuer den MOD-Demo-Call selbst nicht blockierend — Philipp
kann direkt ueber Widget-Public-Key und
`/embed/widget?key=pub_xxx` testen.

### Prioritaet
Mittel. Vor Self-Service-Phase, nach ersten 3 Pilotkunden.

## TD-Pilot-05: Bot-Prompts Sales-Effizienz-Optimierung (21.04.2026)

### Status
Offen.

### Kategorie
Pilot-relevant.

### Pilot-blockierend
Nicht technisch blockierend, aber relevant fuer
KPI-Qualitaet des ersten Demo-Gespraechs.

### Problem
Aktuelle Mara (B2C) und Nora (B2B) Prompts aus Phase 1
(Commit `4f159e3`) sind konversationell stark, aber bei
Sales-Effizienz suboptimal. Beobachtungen aus Live-Tests
am 21.04.2026 gegen die MOD-Demo-Tenants:

**Mara-spezifisch:**
- Zu viele Validierungs-Saetze ("Das verstehe ich",
  "Verstehe.", "Das kann ich gut verstehen"). Im
  Testlauf 4 Validierungen in 12 Messages → reduziert
  Info-Dichte pro Message.
- Kein Drill-Down auf qualifizierende Kriterien:
  Branche, Kuendigungsfrist, Zielrolle nach
  Weiterbildung und geografische Verfuegbarkeit
  (MOD-Standorte) werden nicht aktiv erfragt.
- Kein Conversion-Anker: Gespraech endet ohne explizite
  Termin-Uebergabe oder Kontaktdaten-Erfassung.

**Nora-spezifisch:**
- Multi-Frage-Messages: mehrere unzusammenhaengende
  Themen in einer Message (z.B. Kandidaten-
  Identifikation UND Arbeitgeberservice-Kontakt
  gleichzeitig). Ueberfordert B2B-Entscheider, fuehrt zu
  unvollstaendigen Antworten.
- Text-Bloecke zu lang: B2B-Kontext erwartet praezise,
  zackige Kommunikation.
- Keine aktive Qualifikation der Entscheidungs-Position
  (Geschaeftsfuehrer vs. HR vs. Assistenz) im
  Gespraechsfluss.

**Beide Bots:**
- Kein Message-Count-basierter Conversion-Anker: Nach
  N Qualifying-Messages sollte explizit Termin
  vorgeschlagen werden, statt beliebig weiterzu-
  qualifizieren.

### Ursache
Initial-Prompts optimiert auf Rapport-Building und
natuerlichen Gespraechsfluss (User-Direktive aus Phase 1:
"Empathisch, warm, nicht als Checkliste"). Sales-Effizienz-
Kriterien wurden in erster Iteration nicht explizit
gesetzt, weil Fokus auf DSGVO-Ehrlichkeits-Anker und
Ton-Treue lag.

### Impact
- Leads bekommen hohen Rapport-Score, aber niedrige
  Conversion-Rate — Diskrepanz zwischen GPT-4o-Scoring
  und realer Sales-Qualifikation
- Salesreps muessen im Erstgespraech mehr Qualifikation
  nachholen als noetig (Branche, Zielrolle, Standort)
- Pilot-KPIs (Erstgespraech-Dauer, A-Lead-Quote,
  Conversion von Chat zu Termin) werden nicht optimal
  erreicht

### Fix
1. Validierungs-Limit einfuehren: Maximal jede dritte
   Message beginnt mit empathischer Spiegelung. Rest
   der Messages gehen direkt in die naechste Frage.
2. Drill-Down-Struktur definieren (B2C, Mara):
   Kurswunsch → Branche → Kuendigungsfrist / Agentur-
   Status → Zielrolle nach Weiterbildung → Standort-
   Praeferenz (MOD hat 20+ Standorte, Distanz zaehlt).
3. Drill-Down-Struktur definieren (B2B, Nora):
   Weiterbildungsbedarf → Unternehmensgroesse / Branche
   → Mitarbeiter-Anzahl → Entscheidungs-Position →
   Foerderungs-Awareness → Zeitrahmen.
4. Message-Struktur: Ein Thema pro Message. 2-3 Saetze
   erlaubt, wenn sie dasselbe Entscheidungs-Objekt
   betreffen. Kein Mix unzusammenhaengender Themen.
5. Conversion-Anker: Nach 8-10 Messages mit gutem Lead-
   Signal → expliziter Termin-Vorschlag mit Kontaktdaten-
   Erfassung (Telefon oder E-Mail).
6. B2B-Tonalitaet praezisieren: Nora antwortet kompakter,
   weniger Smalltalk-Varianz als Mara. "Sachlich-
   praezise" statt "warm-einfuehlsam".
7. Eval-Setup: 5-10 realistische Test-Szenarien pro Bot,
   systematische Bewertung der Optimierung
   (z.B. `src/scripts/eval-mara-nora.ts` gegen Claude-API
   mit fixen User-Szenarien und Score-Diff).

### Aufwand
2-3 Stunden Prompt-Iteration + 1 Stunde Eval-Szenarien.

### Pilot-relevanz
Hoch. Fix idealerweise VOR erstem Demo-Call mit MOD
oder anderem Warm Contact.

### Prioritaet
Hoch. Innerhalb 24-48h nach Demo-Tenant-Setup
(also bis spaetestens 23.-24.04.2026 laut
PROJECT_STATUS MOD-Demo-Termin).

### Abhaengigkeit zu TD-Pilot-03
TD-Pilot-03 (Scoring-Prompt tenant-agnostisch) und
TD-Pilot-05 (Sales-Effizienz der Bot-Prompts) adressieren
unterschiedliche Pfade derselben Conversion-Qualitaet:
TD-Pilot-05 optimiert, welche Signale der Bot im Gespraech
erzeugt; TD-Pilot-03 optimiert, wie GPT-4o diese Signale
bewertet. Reihenfolge: erst TD-Pilot-05 (bessere Signale),
dann TD-Pilot-03 (tenant-spezifisches Scoring) — sonst
wird das Scoring auf schlechter Rohdaten-Basis optimiert.

## TD-Pilot-07: Web-Channel-Namens-Anzeige — maskId-Fallback, displayName-Priorisierung (21.04.2026)

### Status
ERLEDIGT mit Commit (Hash folgt im selben Fix-Commit).

### Kategorie
Archiv-Eintrag. Dokumentiert die Verhaltensaenderung fuer
zukuenftige Reviewer, keine weitere Aktion noetig.

### Hintergrund
Vor Commit 21.04.2026: Dashboard zeigte fuer WEB-Channel-
Conversations die maskierte `externalId` (z.B. `"dem •••• -m"`
fuer `externalId="demo-seed-anna-m"`) oder den generischen
Platzhalter `"Web-Session"`. Beide Anzeigen waren fuer
Salesreps nicht identifizierbar — kein Name, keine Abgrenzung
zwischen verschiedenen Leads.

Die `maskId()`-Funktion stammt aus der WhatsApp-Aera, als
`externalId` ein Hash der Telefonnummer war. Fuer den Web-Kanal
ist das Feld entweder `null` oder ein techischer Marker —
Maskierung hatte dort keinen DSGVO-Zweck, erzeugte aber
Identifikations-Luecken in Kanban und Konversations-Liste.

### Aenderung
- Neuer Helper `parseVisitorDisplayName(raw: unknown)` in
  `src/lib/widget/publicKey.ts`, extrahiert defensiv
  `widgetVisitorMeta.displayName` (1-120 Zeichen, string).
- Dashboard-API-Endpoints liefern das abgeleitete Feld
  `visitorDisplayName: string | null` mit, nicht das
  Raw-JSON:
  - `/api/dashboard/leads`
  - `/api/dashboard/leads/[id]`
  - `/api/dashboard/conversations`
- Server-Component `/dashboard/conversations/page.tsx` nutzt
  direkten Prisma-Load + gleichen Helper.
- UI-Fallback-Kette: `visitorDisplayName ?? maskId(externalId)`
  (crm/page.tsx) bzw. `displayNameOrMask()` (conversations/page.tsx).

### Backward-Compatibility
- WhatsApp-Leads haben `widgetVisitorMeta=null` →
  `visitorDisplayName=null` → Fallback auf maskId greift unveraendert.
- Bestehende Web-Leads ohne `displayName` in `widgetVisitorMeta` →
  gleicher Fallback wie vorher ("Web-Session" in conversations/page.tsx,
  maskId in crm/page.tsx).
- Kein Schema-Change, keine DB-Migration.

### Sekundaerer Nutzen
Widget-Embed-Integrationen koennen bei Session-Start einen
`displayName` mitgeben (z.B. Logged-In-User-Name vom Host-System),
der dann direkt im Dashboard erscheint — ohne weitere Code-
Aenderungen. Demo-Seed und zukuenftige SSO-Widget-Integrationen
profitieren von derselben Infrastruktur.

## TD-Pilot-08: Admin-UI-Button fuer Dashboard-Token-Regeneration + Invalidation (21.04.2026)

### Status
Offen.

### Kategorie
Pilot-relevant.

### Pilot-blockierend
Nein — manuelles Regenerieren via `npx tsx
src/scripts/refresh-mod-magic-links.ts` existiert. Fuer
generische Tenants fehlt ein aehnliches Skript, aber der
Admin-API-Endpoint ist da (`POST /api/admin/tenants/[id]`).

### Hintergrund
Das Dashboard-Token ist Single-Use: nach dem ersten
erfolgreichen Login rotiert es in `login/route.ts:39-49`
und der urspruengliche Magic-Link wird ungueltig. Das ist
Absicht (Security), fuehrt aber zu Reibung:
- Admin kann sich in einem Browser einloggen, in einem
  zweiten Browser / Inkognito-Tab liefert der identische
  Link dann die Fehlerseite
- Kunden-Onboarding: wenn der Magic-Link per E-Mail an
  den Kunden geht und der Admin-Mail-Client vorher
  "Link-Preview" macht, wird der Link bereits dort
  verbrannt
- Ohne Admin-UI gibt es keinen schnellen Weg, einen
  frischen Link zu generieren — das Admin-API-Endpoint
  `POST /api/admin/tenants/[id]` existiert, hat aber kein
  UI

Diagnose und Fehlertext-Praezisierung sind im selben
Commit wie dieser Eintrag. Der Fehlertext nennt jetzt
"bereits verwendet oder abgelaufen" statt des frueheren
irrefuehrenden "Ungueltiger, deaktivierter oder
abgelaufener Link".

### Fehlender Endpoint
`DELETE /api/admin/tenants/[id]/dashboard-token` — invalidiert
ein bestehendes Token ohne neues zu generieren. Use-Case:
kompromittierter Zugang, Mitarbeiter-Wechsel beim Kunden.
Aktuelle Alternative: POST-Endpoint aufrufen, neuen Link
nicht rausgeben — aber Token rotiert dabei trotzdem, nicht
ganz sauber.

### Fix
1. Backend:
   - Existierenden Endpoint `POST /api/admin/tenants/[id]`
     nutzen fuer Regeneration (nichts zu tun)
   - Neuer Endpoint `DELETE /api/admin/tenants/[id]/
     dashboard-token` fuer reines Invalidate
   - AuditActions `admin.dashboard_token_regenerated` und
     `admin.dashboard_token_invalidated` ergaenzen
2. Admin-UI (`src/app/admin/page.tsx` Detail-Modal):
   - Sektion "Dashboard-Zugang"
   - Button "Neuen Login-Link generieren" → Copy-Box mit
     Link (einmalig, wie Vercel-API-Keys)
   - Button "Bestehende Tokens invalidieren" mit Confirm-
     Dialog
3. Clipboard-Helper (navigator.clipboard API, keine neue
   Dependency)

### E-Mail-Versand (explizit NICHT im ersten Iterations-
### schritt)
Resend-Integration existiert bereits. Der E-Mail-Versand
eines Magic-Links an einen Kunden braucht aber eine eigene
Design-Runde: Sender-Adresse, Template, Opt-in der
Empfaenger, DSGVO-Implikationen (automatisierter Versand
an B2B-Ansprechpartner). In separater Session.

### Aufwand
45-60 Minuten fuer Backend + UI ohne E-Mail. Mit E-Mail:
zusaetzlich 30-45 Minuten (eigene Session).

### Prioritaet
Mittel-Hoch. Vor dem ersten echten Kunden-Onboarding
(wo der Link per E-Mail rausgehen muss).

### Referenzen
- Diagnose-Session 21.04.2026 (nach Phase-2-Fix-Session)
- Sofort-Loesungs-Skript: `src/scripts/refresh-mod-magic-links.ts`
- Rotation-Code: `src/app/dashboard/login/route.ts:39-49`
- Token-TTL-Konstanten: `src/modules/auth/dashboard-auth.ts:12-13`

## TD-Marketing-02: Pricing-Plans-Datenstruktur zentralisieren (22.04.2026)

### Status
Offen.

### Hinweis zur Nummerierung
Die Nummer "TD-Marketing-01" war bereits vergeben (AGB-Passage zu
Setup-Gebuehr, 16.04.2026, ERLEDIGT). Dieser Eintrag ist der zweite
Marketing-Eintrag und bekommt daher TD-Marketing-02, auch wenn der
urspruengliche Auftrag TD-Marketing-01 vorschlug.

### Kategorie
Code-Qualitaet / DRY.

### Pilot-blockierend
Nein — Copy-Konsistenz wurde manuell in beiden Dateien gesetzt.

### Problem
Die Pricing-Cards werden an zwei Stellen gerendert, beide mit
eigenen inline-Datenstrukturen:

1. `src/app/pricing/PricingClient.tsx` — voller Plan-Typ mit
   `icon: React.ReactNode`, `tagline`, `description`, `bots`,
   `tenants`, `conversations`, `features: {text, icon}[]`, `popular`,
   `pilot`.
2. `src/app/page-v2.tsx` — kompaktes Inline-Array mit `price`,
   `tag`, `features: string[]`, `highlighted`, `pilot`.

Jede Preis-, Bullet- oder Pilot-Signal-Aenderung muss an beiden
Stellen identisch nachgefuehrt werden. Bei der Pilot-v2-Umstellung
(22.04.2026) war das machbar, aber anfaellig fuer Drift.

### Ursache
Homepage und /pricing haben unterschiedliche UI-Anforderungen:
- Homepage: kompakt, nur Basis-Features als Strings
- /pricing: ausfuehrlich, mit Icons pro Feature, Tenant-/Bot-Limits
  als eigene Eckdaten-Chips

Eine gemeinsame Datenstruktur muesste beide Sichten abdecken — das
geht nur, wenn Icons als String-Keys gespeichert und in der UI
gemappt werden (`src/data/pricing-plans.ts` + `src/lib/pricing-
icons.ts` als Lookup-Table).

### Fix
1. `src/data/pricing-plans.ts` anlegen:
   - Gemeinsame Struktur: `id`, `name`, `listPrice`, `tag`, `tagline`,
     `description`, `bots`, `tenants`, `conversations`,
     `featureIds: string[]`, `popular`, `pilot`
   - featureIds sind semantische Keys (z.B. "whatsapp-bot",
     "multi-language", "lead-scoring-100"), keine UI-Strings
2. `src/lib/pricing-features.ts`:
   - Map von featureId → `{ text: string; icon: LucideIcon }`
3. PricingClient.tsx und page-v2.tsx nutzen beide
   `import { PLANS } from "@/data/pricing-plans"` und rendern nach
   ihrer jeweiligen Detail-Dichte (Homepage nimmt die ersten N
   featureIds, /pricing nimmt alle).
4. page-v2.tsx bekommt ebenfalls Zugriff auf Icons, falls spaeter
   Konsistenz mit /pricing-Icons gewuenscht.

### Aufwand
40-60 Minuten — keine DB-Migration, nur Refactor mit Type-Check
und visuelle Re-Verifikation in Homepage + /pricing.

### Prioritaet
Niedrig-Mittel. Sobald die dritte Pricing-Aenderung ansteht
(Preis-Rundung, neuer Tier, Feature-Bullet-Anpassung) oder das
Drift-Risiko konkret wird (Copy-Check-Findings in Audits).

### Referenzen
- `src/app/pricing/PricingClient.tsx` — /pricing Plans-Array
- `src/app/page-v2.tsx:481-485` — Homepage Plans-Array
- Commit der Pilot-v2-Umstellung (22.04.2026) — zeigt die
  Drift-Anfaelligkeit: beide Dateien mussten identisch angepasst
  werden

## TD-Marketing-03: WhatsApp-Integration reaktivieren sobald Meta-Verifizierung durch (22.04.2026)

### Status
Offen — blockiert durch externe Meta-Business-Verifizierung.

### Pilot-blockierend
Nein — Marketing ist auf "Web-Widget" umgestellt, Backend-Routen und
Dashboard-Integration bleiben funktionsfaehig fuer spaetere
Reaktivierung.

### Kontext
Die Meta-Business-Verifizierung fuer ai-conversion.ai steckt seit
Paddle-Ablehnung vom 07.04. faktisch fest (keine neue AUP-kompatible
Kategorie bislang akzeptiert). Pilot laeuft ueber Web-Widget. Am
22.04.2026 wurde die Marketing-Website konsequent auf Web-Widget
umgestellt — WhatsApp ist nur noch als Roadmap-Eintrag "Q3 2026"
sichtbar.

### Was wurde zurueckgestuft (Commit 22.04.)
- `src/app/layout.tsx` + `src/app/page.tsx`: Meta-Title/Description
  ohne WhatsApp, neue Positionierung "KI-Lead-Qualifizierung fuer
  Weiterbildung"
- `src/app/page-v2.tsx` Hero: "KI-Lead-Qualifizierung fuer
  Weiterbildung & Inbound-Teams" statt "KI-Vertrieb DACH-Mittelstand"
- `src/app/page-v2.tsx` Sales Agent Description, Vergleichs-Sektion,
  Pricing-Cards (1/3/10 WhatsApp Bots → 1/3/10 KI-Bots (Web-Widget))
- `src/app/pricing/PricingClient.tsx` Feature-Bullets,
  Vergleichstabelle, WhatsApp-Gebuehren-Fussnote entfernt
- `src/app/faq/FaqClient.tsx`: WhatsApp-spezifische FAQ-Eintraege
  durch Web-Widget-Perspektive ersetzt, neuer Eintrag "Wird
  WhatsApp als Kanal unterstuetzt?" mit Q3-2026-Info
- `src/app/page-v2.tsx` Integrations-Chip: "WhatsApp Cloud API"
  bleibt mit "(Q3 2026)"-Suffix sichtbar als Roadmap-Signal

### NICHT angefasst (funktional, nicht Marketing)
- `src/app/onboarding/page.tsx` — enthaelt weiterhin
  "WhatsApp Phone ID"-Pflichtfeld (an TD-Pilot-01 gekoppelt, eigener
  Fix-Zyklus)
- `src/app/admin/page.tsx` — interne Admin-Felder
- `src/app/dashboard/campaigns/*`, `broadcasts/*`, `bot-test/*`,
  `conversations/*` — interne Dashboard-UI
- Backend-Routen (`/api/webhook/whatsapp`, `/api/platform-bot`)
- ChannelBadge-Komponente (WhatsApp bleibt als Kanal-Enum-Wert)

### Fix bei Meta-Verifizierungs-Erfolg
1. Alle obigen Marketing-Texte zuruecktauschen — dabei idealerweise
   statt revert: bewusste Copy-Entscheidung, ob "Web-Widget **+**
   WhatsApp" (additive Positionierung) oder WhatsApp-zurueck-in-den-
   Fokus
2. Pricing-Labels: "1/3/10 KI-Bots (Web-Widget)" →
   "1/3/10 KI-Bots (Web + WhatsApp)"
3. FAQ: Roadmap-Eintrag umformulieren zu "Wie funktioniert die
   WhatsApp-Integration?"
4. Integrations-Chip: "(Q3 2026)"-Suffix entfernen
5. Onboarding-Flow WhatsApp-Phone-ID je nach Strategie wieder
   pflicht oder optional (TD-Pilot-01-Fix)

### Aufwand
2-3 Stunden reine Copy-Arbeit + eine Design-Runde zu
"Web-Widget + WhatsApp"-Kombi-Positionierung.

### Trigger
Meta-Business-Verifizierung bestaetigt. Aktuell keine zeitliche
Einschaetzung aus Paddle-Tenor; TD-Billing-01 Payment-Provider-
Ersatz laeuft parallel und kann WhatsApp-unabhaengig starten.

## TD-Marketing-04: Branchen-Sektion als dedizierte Landing-Pages reaktivieren (22.04.2026)

### Status
Offen — geplante Nutzung ab Juni 2026 (Steuerberater-Launch).

### Pilot-blockierend
Nein.

### Kontext
Die Branchen-Sektion "Fuer diese Branchen besonders geeignet" (4
Karten: Bildung, Steuerberater, Immobilien, Coaching) war zuletzt
auf der Haupt-Landing-Page aktiv. Nach dem Nischen-Pivot vom 21.04.
und der Fokussierung auf Weiterbildung widerspricht eine Generalist-
Branchen-Sektion der Positionierung.

Am 22.04.2026 wurde die Sektion in `src/app/page-v2.tsx` (Z. 402ff)
komplett auskommentiert, der Code (inkl. Icons GraduationCap,
Calculator, Building2, Users) bleibt erhalten. Icon-Imports wurden
aus dem Haupt-Imports-Block entfernt, mit Inline-Hinweis fuer
Reaktivierung.

### Fix (zum Zeitpunkt Steuerberater-Launch Juni 2026)
- **Nicht** den auskommentierten Block auf der Haupt-Seite
  reaktivieren — widerspricht Nischen-Positionierung.
- **Statt dessen** dedizierte Landing-Page `/steuerberater` bauen,
  die:
  - Den auskommentierten Code als Ausgangspunkt nutzt (Layout +
    Icons)
  - Steuerberater-spezifische Hero, Use-Cases, Testimonials (falls
    vorhanden)
  - Eigenes Pricing-Framing falls fuer die Nische abweichend
  - Eigene Integrations-Liste (DATEV, Lexoffice, lexware statt
    HubSpot als Standard)
- Parallel weitere Landing-Pages pro Nische nach gleichem Muster:
  `/weiterbildung` (aus MOD-Pilot-Lernings), `/immobilien`,
  `/coaching` — jeweils nur wenn eine Pilot-Referenz besteht.

### Aufwand
3-4 Stunden pro Landing-Page (Copy + Layout + Routing + Metadata).
Ein-Zeit-Extraktion der gemeinsamen Branchen-Card-Komponente in
`src/components/BranchCard.tsx` lohnt sich ab Seite 2.

### Trigger
Erster echter Steuerberater-Pilot bestaetigt (ConvArch-Ziel: Juni
2026 nach erfolgreichem MOD-Onboarding).

### Referenzen
- Auskommentierter Ausgangscode: `src/app/page-v2.tsx:402-437`
- Icon-Reaktivierung: Import-Block in `src/app/page-v2.tsx:7-15`

## TD-Compliance-13: Prighter-LOA-Approval-Status woechentlich pruefen (22.04.2026)

### Status
Offen — Prighter-Portal zeigt aktuell "Waiting for LOA approval" seit
22.04.2026.

### Hinweis zur Nummerierung
User-Vorschlag war "TD-Compliance-01" — die Nummer ist bereits belegt
(Sentry-AVV, ERLEDIGT am 15.04.2026). Dieser Eintrag ist die naechste
freie Nummer nach TD-Compliance-12.

### Kategorie
Compliance / Prozess.

### Pilot-blockierend
Nein — Art. 27-Klausel in Datenschutz + Impressum ist bereits live
(Commit 23.04.2026). Prighter agiert bei Purchase sofort, LOA-Approval
ist ein internes Prighter-Prozess-Signal.

### Kontext
AI Conversion hat am 22.04.2026 einen EU-Vertreter-Vertrag mit iuro
Rechtsanwaelte GmbH t/a Prighter (Wien) abgeschlossen. Prighter-
Account-ID: 16103587069. LOA-Status im Portal ist "Waiting for LOA
approval". Solange der LOA nicht approved ist, kann sich Prighter nicht
als offizieller Vertreter gegenueber Behoerden ausweisen.

### Fix
1. Prighter-Portal woechentlich checken:
   https://app.prighter.com/portal/16103587069
2. Bei Approval-Mail: Eintrag hier auf ERLEDIGT setzen, Datum der
   Bestaetigung notieren, PDF-Bestaetigung archivieren
3. Bei Problemen (Ablehnung, Nachforderung): support@prighter.com

### Aufwand
5 Min pro Check, einmaliger Abschluss.

### Prioritaet
Niedrig — reine Statusueberwachung.

## TD-Compliance-14: Verarbeitungsverzeichnis nach Art. 30 DSGVO erstellen (22.04.2026)

### Status
Offen.

### Hinweis zur Nummerierung
User-Vorschlag war "TD-Compliance-02" (belegt, Sentry-Datenschutz,
ERLEDIGT 15.04.2026). Dieser Eintrag nutzt die naechste freie Nummer.

### Kategorie
Compliance / DSGVO-Pflicht.

### Pilot-blockierend
Nein fuer Outreach-Start, aber **Pflicht nach Art. 30 DSGVO** und bei
Aufsichtsbehoerden-Anfrage sofort vorlegbar.

### Kontext
Ein Verarbeitungsverzeichnis (Art. 30 DSGVO) ist fuer Verantwortliche
mit Beschaeftigten oder bei regelmaessiger Verarbeitung
personenbezogener Daten zwingend — beides trifft auf AI Conversion
zu (Tenant-Conversations, Leads, Dashboard-User). Ein vollstaendiges
Verzeichnis fehlt aktuell; die Einzelbausteine existieren in
verstreuter Form:
- AVV-Liste in `public/dpa.md`
- Subprozessor-Liste in Datenschutzerklaerung
- Retention-Zeitraeume in `docs/architecture.md`
- Audit-Log-Actions in `src/modules/compliance/audit-log.ts`

### Fix (separater Arbeitsblock diese Woche)
1. Template von Datenschutz-Generator oder IT-Recht-Kanzlei nutzen
2. Pro Verarbeitungstaetigkeit eintragen: Zweck, Rechtsgrundlage,
   Datenkategorien, Betroffenenkategorien, Empfaenger, Drittland-
   Uebermittlungen, Loeschfristen, technische und organisatorische
   Massnahmen
3. Mindestens abdecken:
   - Website-Besuch / Server-Logs
   - Widget-Conversations (AES-256, 90 Tage Retention)
   - Lead-Pipeline / CRM
   - Dashboard-Zugriff / Magic-Link-Auth
   - Sentry Error-Reporting
   - Calendly Terminvergabe
   - OpenAI Lead-Scoring / Anthropic Claude Chat-Replies
4. PDF-Ausgabe archivieren, nicht public-facing
5. Pflege-Rhythmus: bei jeder neuen Subprozessor-/Feature-Einfuehrung
   aktualisieren

### Aufwand
4-6 Stunden Erst-Erstellung mit Template. Danach ca. 15 Minuten pro
Update.

### Prioritaet
Hoch. Vor erstem zahlenden Pilot-Kunden fertig, idealerweise diese
Woche nach dem MOD-Outreach-Follow-Up.

## TD-Compliance-15: Impressum + Datenschutz um US-Sitz erweitern sobald POWER FORGE AI LLC operativ (22.04.2026)

### Status
Offen — abhaengig von LLC-Registrierung / Operatives-Start.

### Hinweis zur Nummerierung
User-Vorschlag war "TD-Compliance-05" (belegt, Sentry+Datenschutz,
ERLEDIGT 15.04.2026). Dieser Eintrag nutzt die naechste freie Nummer.

### Kategorie
Compliance / Internationale Ausweitung.

### Pilot-blockierend
Nein — nur relevant sobald der US-Sitz tatsaechlich Geschaeft aufnimmt.

### Kontext
AI Conversion plant die US-LLC "POWER FORGE AI LLC" als parallele
juristische Einheit fuer den US-Markt. Bei Operativierung:
- Impressum wird Co-Verantwortlichen-Konstellation oder
  Dual-Entity-Struktur abbilden
- Datenschutzerklaerung muss US-Sitz benennen und Drittland-Kontext
  anpassen
- EU-Vertreter (Prighter) bleibt bestehen — US-Sitz ist ebenfalls
  ausserhalb EU, Art. 27 DSGVO greift weiterhin

### Fix
1. Mit IT-Recht-Kanzlei abklaeren, ob Co-Verantwortlichen-Vereinbarung
   nach Art. 26 DSGVO noetig ist
2. Impressum: zweiten Block fuer POWER FORGE AI LLC (Sitz, Registriernr.,
   Kontakt, TMG-Angaben nach US-Recht-Aequivalent)
3. Datenschutzerklaerung: Verantwortlicher-Abschnitt um zweite
   Entitaet + Aufteilung der Verarbeitungen ("X wird von Philipp
   Motzer verantwortet, Y von POWER FORGE AI LLC")
4. Prighter-Vertrag eventuell um zweite Entitaet erweitern (je nach
   Prighter-Terms)
5. AVV-Liste in public/dpa.md anpassen

### Aufwand
2-4 Stunden, je nach Kanzlei-Konsultation.

### Prioritaet
Niedrig-Mittel — blockiert durch externe LLC-Registrierung.

## TD-Compliance-16: Google Fonts self-hosten (23.04.2026)

### Status
Offen — Kanzlei-Konfigurator-Deaktivierung erfolgt, Code-
Implementierung steht aus.

### Hinweis zur Nummerierung
User-Vorschlag war "TD-Compliance-06" (belegt, AVV-Akzeptanz-Verifikation,
ERLEDIGT 15.04.). Dieser Eintrag nutzt die naechste freie Nummer nach
TD-Compliance-15.

### Kategorie
Compliance / Technische Implementierung.

### Pilot-blockierend
Nein — Interim-Hinweis in datenschutz-ergaenzung.md (Abschnitt "Google
Web Fonts") deckt das Thema rechtlich ab: Google Fonts werden nur im
eingeloggten Bereich geladen, nicht auf der oeffentlichen Seite.

### Kontext
Die neue Datenschutzerklaerung (23.04.) enthaelt bewusst keine Google-
Fonts-Klausel mehr, weil die Kanzlei Google Fonts im Konfigurator
deaktiviert hat. Tatsaechlich werden Google Fonts aber weiterhin in
einigen Admin- und Dashboard-Bereichen (Cormorant Garamond + Geist)
ueber `<link>`-Tags von fonts.googleapis.com geladen — siehe:
- `src/middleware.ts:192` (Admin-Login-HTML)
- `src/app/admin/page.tsx:207` (@import url)
- `src/app/dashboard/conversations/[id]/page.tsx:133` (@import url)
- `src/app/dashboard/login/route.ts:92` (Dashboard-Login-Error-HTML)

Kurze Uebergangsloesung: Ergaenzungs-Hinweis "ausschliesslich in
eingeloggten Bereichen" bleibt in `content/legal/datenschutz-ergaenzung.md`
als Interim-Klausel aktiv.

### Fix
1. Migration auf `next/font/google` (Self-Hosting via Next.js-Font-
   Optimierung) an allen vier Stellen
2. Fallback-Chain pruefen (Georgia, serif)
3. Nach Verifikation: Ergaenzungs-Google-Fonts-Klausel in
   `datenschutz-ergaenzung.md` entfernen
4. CSP-Lockerung (fonts.googleapis.com / fonts.gstatic.com) aus
   `src/middleware.ts` entfernen

### Aufwand
1-2 Stunden fuer alle vier Fundstellen + CSP-Cleanup + Smoke-Test in
Admin/Dashboard.

### Prioritaet
Mittel. Nicht pilot-blockierend (Interim-Klausel deckt ab), aber im
naechsten Compliance-Zyklus erledigen — auch weil damit Tech-Debt
Phase 4-pre "Google Fonts hardcoded auf 4 Stellen" abgearbeitet wird.

## TD-Compliance-17: Resend- und Chat-Widget-Klauseln in Hauptdatenschutz verschieben (23.04.2026)

### Status
Offen — blockiert durch AVV-Zweitinfo von IT-Recht-Kanzlei Keller.

### Hinweis zur Nummerierung
User-Vorschlag war "TD-Compliance-07" (belegt, EU-Vertreter Art. 27,
ERLEDIGT 20.04.). Naechste freie Nummer.

### Kategorie
Compliance / Redaktionelle Konsolidierung.

### Pilot-blockierend
Nein — beide Klauseln sind in `content/legal/datenschutz-ergaenzung.md`
(Abschnitte "E-Mail-Versand ueber Resend" und "Chat-Widget / KI-basierte
Kundenkommunikation") aktuell live und rechtlich ausreichend, aber
strukturell separiert.

### Kontext
Die neue Hauptdatenschutzerklaerung von IT-Recht-Kanzlei Keller
(23.04.) enthaelt keine Klausel fuer:
- Resend (Transaktions-E-Mail-Versand)
- Eigenes Chat-Widget / Mara (KI-Erstberatung)

Begruendung: Bei der Konfigurator-Generierung lagen noch nicht alle
AVV-/Zweck-/Empfaenger-Informationen zu diesen Diensten vor. Keller
hat Zweit-Mail mit AVV-Status/Zweck/Betreiber/Empfaenger-Infos
angekuendigt.

### Fix
1. Keller-Zweit-Mail abwarten (oder aktiv anmahnen)
2. Resend-Klausel aus `datenschutz-ergaenzung.md` ins Hauptdokument
   verschieben, z.B. als neuer Abschnitt "7) Tools und Sonstiges →
   Resend" oder neuer Abschnitt "8) E-Mail-Versand"
3. Chat-Widget-Klausel (Mara) ebenfalls ins Hauptdokument migrieren —
   ggf. als eigener Abschnitt "Chat-Bot" oder unter "5) Kontaktaufnahme"
4. Ergaenzungs-Datei danach evtl. ganz entfernen, wenn alle
   Produkt-Hinweise ins Hauptdokument migriert sind

### Aufwand
30-45 Minuten nach Eingang der Keller-Zweit-Mail.

### Prioritaet
Niedrig-Mittel. Wartet auf externe Zulieferung.

## TD-Compliance-18: AVV-Check aller Auftragsverarbeiter durchfuehren (23.04.2026)

### Status
Offen — Live-Check vom 23.04. bereits teilweise durchgefuehrt.

### Hinweis zur Nummerierung
User-Vorschlag war "TD-Compliance-08" (belegt, Sentry SOC 2 Bridge
Letter, ERLEDIGT 15.04.). Naechste freie Nummer.

### Kategorie
Compliance / Auditierung.

### Pilot-blockierend
Nein fuer Outreach, aber **Pflicht vor erstem zahlenden Pilot-Kunden**.
Ohne AVV darf keine Auftragsverarbeitung stattfinden.

### Aktueller Stand (Live-Check 23.04.2026)
| Anbieter | AVV | Drittland-Uebermittlung |
|---|---|---|
| Vercel | ✅ | DPF |
| Calendly | ✅ | DPF |
| Sentry | ✅ (v5.1.0 unterzeichnet 13.04.) | DPF |
| Anthropic | ✅ (DPA, Zero Data Retention) | SCC |
| OpenAI | ✅ (DPA) | SCC |
| Resend | ⚠️ offen | SCC (zu verifizieren) |
| Neon / DB-Anbieter | ⚠️ offen | ? |
| Paddle | ⚠️ offen (aktuell deaktiviert, Backend-Code vorhanden) | DPF (zu verifizieren) |
| HubSpot | ⚠️ offen (Optional-Feature ab Professional) | DPF |
| Notion | ⚠️ offen (Session-Notes intern) | DPF |

### Fix
1. Pro Anbieter im "⚠️ offen"-Status:
   - AVV-Status pruefen (Anbieter-Portal / Account-Settings)
   - Falls nicht vorhanden: DPA anfordern + unterzeichnen
   - Drittland-Status verifizieren (DPF-Zertifizierung oder SCCs)
2. Ergebnisse in `public/dpa.md` Subprozessor-Tabelle nachtragen
3. Datenschutzerklaerung ggf. um fehlende Anbieter ergaenzen
4. Ergebnis-Tabelle als internes Compliance-Dokument archivieren

### Aufwand
30-45 Minuten pro Anbieter (Portal-Check + Download/Unterzeichnung +
Eintrag). Gesamt 3-5 Stunden.

### Prioritaet
Hoch. Vor erstem zahlenden Pilot-Kunden vollstaendig.

### Anmerkung zu TD-Compliance-14
TD-Compliance-14 "Verarbeitungsverzeichnis nach Art. 30 DSGVO erstellen"
(angelegt 22.04.) deckt die inhaltliche Dokumentations-Seite ab. Dieser
Eintrag (TD-Compliance-18) fokussiert auf die **vertragliche** Seite:
welche AVVs sind unterzeichnet, welche Drittland-Mechanismen greifen.
Beide Tasks laufen parallel. Bei GDD-Vorlage-Nutzung (Kanzlei-Keller)
werden beide Themenfelder mit einem Template abgedeckt.

## Post-Demo Scoring-Pipeline (ADR-002, 23.04.2026)

### TD-Post-Demo-01: Scoring-Debouncing

#### Status
Bewusst verschoben auf nach dem MOD-Demo-Call 29.04.2026.

#### Problem
`runScoringPipeline` laeuft asynchron nach JEDER Bot-Antwort. Bei einem
10-Nachrichten-Gespraech entstehen 10 GPT-4o-Calls. Fuer den Demo-Call
am 29.04. ist das akzeptabel, aber bei Pilot-Skalierung kostenrelevant
und potenziell rate-limit-problematisch.

#### Gewuenschte Loesung
Throttle nach letztem Scoring-Call — z.B. "mindestens 60 Sekunden
Konversations-Pause oder Gespraech beendet", bevor erneut gescored
wird. Konservative Variante: Nur am Ende des Gespraechs scoren
(auto-close-Trigger benoetigt, existiert heute nicht).

#### Wann fixen
Nach dem 29.04.-Demo, vor dem ersten zahlenden Pilot-Kunden.

### TD-Post-Demo-02: Claude-Modell pro Tenant override-faehig

#### Status
Bewusst verschoben auf nach dem MOD-Demo-Call 29.04.2026.

#### Problem
`claude-sonnet-4-20250514` ist in `src/modules/bot/claude.ts` hartcodiert.
Kein ENV-Flag, kein Tenant-Override. Fuer kuenftige Nischen mit anderen
Latenz- oder Qualitaets-Praeferenzen (z.B. Opus fuer komplexe B2B-
Gespraeche, Haiku fuer Low-Latency-Massen-Chats) muss der Code deployed
werden.

#### Gewuenschte Loesung
Neues Feld `Tenant.claudeModel: String?` mit Default = aktuelles
Sonnet-4. Whitelist im Backend gegen Modell-Injection. Dashboard-
Setting fuer Admin-User.

#### Wann fixen
Nach erstem Pilot-Kunden, wenn echter Tuning-Bedarf sichtbar wird.

### TD-Post-Demo-03: Temperature pro Tenant konfigurierbar

#### Status
Bewusst verschoben auf nach dem MOD-Demo-Call 29.04.2026.

#### Problem
`temperature: 0.3` ist in `src/modules/bot/claude.ts` hartcodiert
(Kommentar TD-Post-Demo-03 markiert die Stelle). Fuer das Tuning
verschiedener Nischen-Tonalitaeten koennte ein Tenant-Override
sinnvoll sein.

#### Gewuenschte Loesung
Neues Feld `Tenant.botTemperature: Float?` (Range 0.0-1.0). Default =
0.3. Dashboard-Slider mit 0.1-Schritten.

#### Wann fixen
Nach erstem Pilot-Kunden, zusammen mit TD-Post-Demo-02.

### TD-Post-Demo-04: Rate-Limit-Bypass fuer Admin-Testing

#### Status
Bewusst verschoben auf nach dem MOD-Demo-Call 29.04.2026.

#### Problem
Widget-Session-Endpoint limitiert 10 Sessions/IP/Stunde
(`src/app/api/widget/session/route.ts:84`). Beim Durchtesten von 10
Test-Szenarien aus einer IP (Philipp fuer den Demo-Call) hart an der
Grenze.

#### Gewuenschte Loesung
Admin-Header oder signierter Test-Token, der das Rate-Limit umgeht.
Nur fuer eingeloggte Admin-Sessions, streng auditiert.

#### Wann fixen
Nach dem 29.04.-Demo. Work-around bis dahin: Philipp nutzt iframe-
Reload in `/dashboard/settings/widget` (zaehlt als eine Session pro
Config-Fetch), oder 1h-Pause zwischen Test-Serien.

### TD-Post-Demo-05: Signal-Kategorisierung mit Icon-System

#### Status
Bewusst verschoben auf nach erstem Pilot mit echten Signal-Daten.

#### Problem
Signals werden aktuell als reine Text-Bullets gerendert, ohne
Kategorisierung (positiv/negativ/neutral/Risiko). Das ist bewusst so
(ADR-002, "Abgelehnte Alternativen"): ohne Datenbasis ist jede
Kategorisierung willkuerlich.

#### Gewuenschte Loesung
Nach Sammlung von ~100 echten Scoring-Calls ueber 2-3 Pilot-Kunden:
Manuelle Auswertung der Signals, Erkennung wiederkehrender
Kategorien, Mapping-Tabelle + Icon-Set. Dashboard-Rendering erweitert.

#### Wann fixen
Nach erstem Pilot-Kunden mit >=100 gesammelten Signal-Arrays.

### TD-Post-Demo-06: Enum-Naming-Review LeadQualification

**Status:** Open, Post-Demo, niedrige Prioritaet

**Kontext:** Die DB-Enum LeadQualification nutzt lange Keys
(MARKETING_QUALIFIED, SALES_QUALIFIED) waehrend Marketing-Sprache
MQL/SQL ist. Abweichung im Scoring-Refactor 23.04.2026 dokumentiert.

**Warum nicht gefixt:** PostgreSQL-Enum-Rename mit bestehenden
Daten ist ein One-Way-Door (neuer Enum erzeugen, Spalte migrieren,
alter Enum droppen). Risiko > Nutzen, weil Enum-Keys intern sind
und User nur die tenant.qualificationLabels sehen.

**Wann relevant:** Wenn wir ohnehin auf String-Column statt Enum
migrieren (z.B. fuer voll-dynamische Qualification-Stufen pro
Tenant). Bis dahin: deferred.

### TD-Post-Demo-07: Prisma-Config-Klarheit + Dev-vs-Prod-DB-Doku

**Status:** Open, Post-Demo, MITTLERE Prioritaet (blockiert jede kuenftige Migration).

**Problem:**
Die Kommentar-Zeile in `prisma.config.ts:6` behauptet:
> .env.local hat Vorrang (enthält die echten Vercel-Werte)

Das ist am 23.04.2026 als falsch entlarvt worden. Tatsaechlich zeigen
lokale `.env.local` und Vercel-Production auf **zwei verschiedene
Prisma-Postgres-Datenbanken** (gleiches Host `db.prisma.io`, aber
unterschiedliche User/Password-Kombinationen = zwei separate DBs).

Zusaetzlich gibt es auf Prisma Postgres ein internes Verhalten, bei dem
Prisma-CLI-Befehle (`migrate status`, `migrate deploy`, `migrate diff`,
`db execute`) nicht durchgehend dieselbe Datenbank ansprechen wie der
Runtime-`PrismaPg`-Adapter — trotz identischer DATABASE_URL. Der CLI-
Management-Layer meldet "Database schema is up to date", waehrend die
vom Runtime-Adapter genutzte DB die neuen Spalten physisch nicht hatte.

Der Scoring-Refactor vom 23.04. lief deshalb lokal durch, aber die
Prod-Spalten wurden erst durch manuelles ALTER TABLE via PrismaPg
und INSERT in `_prisma_migrations` nachgerueckt.

**Warum nicht jetzt gefixt:**
- Vor dem Demo-Call 29.04. keine Zeit fuer DB-Struktur-Reorganisation.
- Migration ist inzwischen zweifelsfrei auf Prod angekommen (Spalten
  verifiziert, `_prisma_migrations`-Eintrag gesetzt).
- Nur Tooling-Doku-Problem, nicht Code-Logik.

**Gewuenschte Loesung:**
1. Kommentar in `prisma.config.ts` korrigieren.
2. Zweite Env-File `.env.vercel.dev` / `.env.vercel.production` als
   Standard etablieren (ueber `vercel env pull ...`) und den
   Migration-Workflow darauf umstellen.
3. Eindeutige Dokumentation: wie wird eine Migration zuverlaessig auf
   Prisma Postgres Prod gespielt, wenn `migrate deploy` "No pending"
   luegt? Siehe `docs/migration-workflow.md` Abschnitt "Migrationen
   auf Prod deployen" fuer den 23.04.-Ablauf, der funktioniert hat.
4. Pruefen ob Prisma-Accelerate-Layer oder ein Prisma-Postgres-Bug
   als Root-Cause ausgeschlossen werden kann — andernfalls Upstream-
   Report an Prisma.

**Wann fixen:**
Erste Woche nach Demo-Call (03.05.-10.05.2026). Vor naechster Migration
zwingend. Gefahr sonst: jede kuenftige Schema-Aenderung hat denselben
Fallout.

### TD-Post-Demo-19: Lokale `maskId()`-Duplikate zentralisieren

**Status:** Open, Post-Demo, NIEDRIGE Prioritaet.

**Problem:**
In drei Dashboard-Pages existieren wortgleiche `maskId()`-Helper:
- `src/app/dashboard/page.tsx:80-83`
- `src/app/dashboard/crm/page.tsx:203-206`
- `src/app/dashboard/conversations/[id]/page.tsx:102`

Phase 2c.3 hat im Zuge der ActionBoard-Integration die kanonische
Funktion `maskExternalId()` plus eine Convenience-Wrapper
`resolveLeadDisplayIdentifier()` in `src/lib/widget/publicKey.ts`
etabliert (Single Source of Truth). Die drei lokalen Duplikate
wurden bewusst nicht angetastet — Scope-Disziplin: ActionBoard-
Build sollte nicht zusaetzlich drei Dashboard-Pages anfassen, weil
jede dieser Pages eigene Lead/Conversation-Shape-Annahmen hat und
ein Refactor-Audit eigene Verifikation braucht.

**Risiko bis zum Fix:**
Drift. Wenn das DSGVO-Maskierungs-Format (3 Zeichen Prefix, 2
Zeichen Suffix) sich aendert (z.B. weil Datenschutz-Gutachten
strenger wird), muessen vier Stellen synchron angepasst werden.

**Gewuenschte Loesung:**
1. Lokale `maskId`-Funktionen aus den drei Dashboard-Pages entfernen.
2. Import auf `maskExternalId` aus `@/lib/widget/publicKey` umstellen.
3. Optionale weitere Stellen identifizieren, die direkt
   `conversation.externalId` rendern und auf `resolveLeadDisplayIdentifier`
   umstellen koennten (DRY-Bonus, nicht zwingend).

**Wann fixen:** Erste Refactor-Welle nach Demo-Call. Zusammen mit
TD-Post-Demo-11 (Sub-Page-Inline-Token-Migration) bietet sich an —
beide Refactors touchen dieselben Sub-Pages.
