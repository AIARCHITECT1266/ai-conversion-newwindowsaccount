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
Akzeptiert als Plattform-Standardverhalten. Prioritaet niedrig.

### Datum
2026-04-12 (Phase 7, Test-Gruppe B, Szenario B3 Mobile)

### Symptom
Beim aktiven Tippen ins Chat-Input-Feld scrollt Chromium nativ
den fokussierten Input ueber die virtuelle Tastatur. Dabei werden
Header und Welcome-Message kurzzeitig aus dem sichtbaren Viewport
geschoben. Nach Bot-Antwort oder Tastatur-Schliessen normalisiert
sich das Layout.

### Bereits umgesetzte Mitigationen
- **F1 (Auto-Fokus-Unterdrueckung):** `matchMedia`-Check im
  Fokus-useEffect in `src/app/embed/widget/ChatClient.tsx` —
  auf Mobile (≤767px) kein automatischer Fokus ins Input-Feld
  beim Oeffnen. Loest das Problem beim initialen Widget-Oeffnen.
- **F2 (Smart-Scroll):** `overflow <= 100` Guard im Auto-Scroll-
  useEffect — verhindert programmatisches Scroll-to-Bottom bei
  kurzen Message-Listen. Ergaenzende Massnahme.

### Was NICHT funktioniert hat
- `100dvh` statt `100vh`/`h-screen`: Wirkungslos, weil der
  iframe in einem `position:fixed; inset:0` Container sitzt
  (sowohl in `widget.js` Host als auch in `embed/layout.tsx`).
  Fixed-Elemente reagieren auf iOS/Android nicht auf die Tastatur.
  Aenderungen wurden vollstaendig revertiert.

### Vollstaendige Loesung (nicht implementiert)
Visual Viewport API (`window.visualViewport`) wuerde das
vollstaendig loesen:
- `visualViewport.height` gibt die tatsaechliche sichtbare
  Hoehe zurueck (exkl. Tastatur)
- `resize`-Event feuert bei Tastatur-Oeffnung/-Schliessung
- Container-Hoehe dynamisch auf `visualViewport.height` setzen

Geschaetzter Aufwand: 150-300 Zeilen mit iOS/Android-Edge-Cases
(Safari hat andere Timing-Semantik als Chrome, `resize`-Event
feuert auf iOS waehrend der Animation, auf Android erst danach).

### Akzeptanz-Begruendung
Identisches Verhalten bei Intercom, Crisp, Drift und anderen
Chat-Widgets. Kein Pilot-Kunde wird dieses Verhalten als Bug
melden, weil es dem Plattform-Standard entspricht.

### Wann fixen
Nachfrage-getrieben: implementieren wenn ein Pilot-Kunde
explizit Feedback dazu gibt. Kein Blocker fuer Go-Live.

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
