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
