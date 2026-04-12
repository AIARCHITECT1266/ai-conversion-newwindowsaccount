# AI Conversion — Projekt-Handbuch für Claude Code

## Pflicht-Lesen beim Session-Start

Bevor du mit irgendeiner Aufgabe beginnst, lies diese Dateien in
exakt dieser Reihenfolge:

1. **PROJECT_STATUS.md** — Wo stehen wir gerade? Was ist der nächste Schritt?
2. **WEB_WIDGET_INTEGRATION.md** — Die Spec des aktuellen Projekts
3. **docs/README.md** — Inhaltsverzeichnis der gesamten Doku
4. **docs/decisions/** — Alle getroffenen Entscheidungen
5. **docs/tech-debt.md** — Eingegangene Schuld
6. **docs/quality-roadmap.md** — Plan von 7/10 auf 9/10
7. **docs/test-debt.md** — Nicht getestete Pfade
8. **docs/migration-workflow.md** — Regeln für Prisma-Migrationen
9. **docs/architecture.md** — System-Übersicht
10. **docs/data-model.md** — Datenmodell-Übersicht (sobald angelegt)
11. **docs/changelog.md** — Feature-Historie (sobald angelegt)

Erst wenn diese Punkte gelesen sind, darf die eigentliche
Aufgabe beginnen. Dateien mit "(sobald angelegt)" werden
übersprungen solange sie nicht existieren, und sind ab dem
Moment ihrer erstmaligen Erstellung automatisch Pflicht-Lektüre.

**Diese Liste wird vor JEDEM Phase-Prompt gelesen, nicht nur
einmal pro Session.** Jeder neue Phase-Prompt beginnt mit einem
frischen Check dieser Dateien — der Stand von gestern ist nicht
der Stand von heute, und das Überspringen dieses Checks ist
keine Zeitersparnis, sondern eine Quelle für Cross-Phase-
Regressionen.

## Automatische Aktualisierung

Am Ende jeder Phase MUSS PROJECT_STATUS.md mit aktualisiert werden:
- Commit-Hash der aktuellen Phase
- Abgeschlossene Punkte in die Historie verschoben
- Nächster Schritt eingetragen

Das Update erfolgt im selben Commit wie die Phase-Änderungen.

## Pflicht-Regeln (nicht verhandelbar)

Diese vier Regeln gelten ohne Ausnahme und ohne erneute
Aufforderung. Sie müssen auch dann befolgt werden, wenn der
aktuelle Prompt sie nicht explizit erwähnt. Wenn eine Regel
mit einer konkreten Anforderung des aktuellen Prompts kollidiert,
meldet Claude Code den Konflikt, bevor gehandelt wird — keine
Regel wird stillschweigend umgangen.

### Regel 1 — Automatische Doku-Pflicht

Am Ende jeder Phase aktualisiert Claude Code ohne Aufforderung
alle relevanten Dokumente. Eine Phase ohne Doku-Update ist
keine abgeschlossene Phase, egal wie klein die Änderung war.

Pflicht-Prüfung am Phasenende (selbstständig, ohne Erinnerung
im Prompt):

- **PROJECT_STATUS.md** — IMMER aktualisieren (Datum, Commit-Hash,
  Phase-Historie, nächster Schritt)
- **docs/tech-debt.md** — bei jedem neuen Workaround, jeder
  Lessons-Learned, jedem bewusst aufgeschobenen Fix
- **docs/decisions/** — bei jeder neuen Architektur-Entscheidung
  als eigene .md-Datei (nicht in bestehende Datei quetschen)
- **docs/architecture.md** — bei jeder System-Änderung
  (sobald angelegt)
- **docs/data-model.md** — bei jeder Prisma-Schema-Änderung
  (sobald angelegt)
- **docs/changelog.md** — bei jedem neuen Feature (sobald angelegt)

Siehe auch `### PROJECT_STATUS.md ist Pflicht` weiter unten —
diese Sektion bleibt die verbindliche Detail-Spezifikation für
den PROJECT_STATUS.md-Teil.

Begründung: Dokumentation ist nicht optional. Sie ist die
einzige Möglichkeit, dass zukünftige Sessions auf demselben
Stand starten. Implizite Erwartungen ("Claude Code wird das
schon richtig machen") reichen nicht — der externalId-Bug
vom 11. April 2026 entstand exakt aus so einer impliziten
Erwartung.

WICHTIG: Diese Regel gilt OHNE dass User oder ConvArch im
Prompt explizit darauf hinweisen müssen. Am Ende jeder Phase
prüft Claude Code selbständig, welche der obigen Dokumente
relevant sind, und aktualisiert sie im selben Commit wie die
Phase-Änderungen — niemals "später nachholen". Dateien mit
"(sobald angelegt)" werden übersprungen solange sie nicht
existieren, sind aber ab ihrer Erstellung sofort Teil der
Pflicht-Prüfung.

### Regel 2 — Konsumenten-Audit bei Schema-Migrationen

Bei jeder Prisma-Schema-Änderung, die ein Feld nullable macht,
seinen Typ ändert, ein Feld entfernt oder umbenennt, führt
Claude Code VOR dem Applyen der Migration einen vollständigen
Konsumenten-Audit durch.

Audit-Schritte (Pflicht, in dieser Reihenfolge):

1. Grep nach allen Verwendungen des geänderten Felds im
   gesamten `src/`-Baum (Handler, Components, Lib, Scripts,
   Tests)
2. Alle TypeScript-Interfaces, Types und Zod-Schemas
   aktualisieren, die das Feld deklarieren — sowohl
   API-Response-Types als auch interne Shape-Types und
   lokale Helper-Signaturen
3. Alle Dereferenzierungen auf Null-Safety prüfen
   (`.length`, `.slice`, `.toLowerCase`, Index-Access,
   String-Template-Literale, JSX-Ausgaben)
4. Alle gefundenen Stellen entweder sofort anpassen oder
   explizit im Migrations-Plan als "bewusst aufgeschoben"
   dokumentieren — kein "das fängt TypeScript schon"-
   Blindvertrauen
5. Erst dann Migration applyen

Begründung: Cross-Phase-Regressionen wie der externalId-Bug
vom 11. April 2026 entstehen durch fehlende Konsumenten-Audits.
TypeScript fängt sie NICHT, wenn die Interface-Deklarationen
selbst falsch sind — der Compiler prüft nur Konsistenz
innerhalb der deklarierten Types, nicht gegen den echten
DB-Zustand. Manuelle Suche ist Pflicht. Referenz:
docs/tech-debt.md → "Phase 5-Pre — Lessons Learned:
externalId-Nullability-Regression".

WICHTIG: Dieser Audit passiert BEVOR `prisma migrate deploy`
oder `prisma migrate diff --apply` ausgeführt wird — nicht
danach. Wenn der Audit zeigt dass mehr Stellen betroffen
sind als erwartet, ist das kein Grund die Migration trotzdem
durchzuziehen, sondern ein Grund den Scope der Phase zu
erweitern und mit dem User abzustimmen.

### Regel 3 — Diagnose vor Code-Change

Bei jedem Bug-Fix arbeitet Claude Code strikt in der
Reihenfolge Diagnose → Hypothesen-Verifikation →
User-Bestätigung → Fix. Spontane Fixes auf Basis einer
ungeprüften Hypothese sind verboten.

Arbeits-Reihenfolge (Pflicht):

1. Die ursprüngliche Hypothese (egal ob von User, ConvArch
   oder eigener Intuition) durch **Lesen des tatsächlich
   betroffenen Codes** verifizieren: API-Handler, DB-Schema,
   Aufrufer, Consumer-Komponenten
2. Melden, ob die Hypothese stimmt oder eine bessere
   Root-Cause gefunden wurde — inkl. Datei-Pfad und
   Zeilen-Nummer
3. Bei abweichender Root-Cause: den vorgeschlagenen
   Fix-Pfad kurz skizzieren
4. Auf User-Bestätigung warten
5. Erst dann den Fix umsetzen

Begründung: Spontane Fixes ohne Diagnose verursachen mehr
Bugs als sie lösen. Diagnose vor Code-Change ist die
einzige Möglichkeit, Root-Causes statt Symptome zu fixen.
Referenz-Fall: externalId-Bug vom 11. April 2026 — ConvArch
stellte die Hypothese "API liefert null für conversations",
Claude Code las den API-Handler, identifizierte die
Hypothese als falsch, fand die echte Root-Cause (lokale
maskId-Helper ohne Null-Check in drei Dashboard-Dateien),
meldete den Befund, wartete auf Bestätigung, und fixte
dann. Das ist das Zielverhalten für jeden zukünftigen
Bug-Fix.

WICHTIG: Diese Regel gilt auch für "offensichtliche" Bugs
und auch wenn der User Zeitdruck signalisiert. Ein falscher
Fix unter Zeitdruck kostet mehr Zeit als eine 5-Minuten-
Diagnose. Einzige Ausnahme: Wenn Claude Code beim ersten
Code-Lesen SOFORT erkennt, dass Hypothese und Root-Cause
identisch sind (z.B. Typo in gerade neu geschriebenem
Code), darf nach expliziter Meldung dieser Identität
direkt gefixt werden — die Verifikation und die Meldung
selbst bleiben Pflicht. Kein Fix darf ohne vorherige
Meldung stattfinden, auch wenn er nur eine Zeile umfasst.

### Regel 4 — Premium-SaaS-Look als oberste UI-Direktive

Bei jeder UI-Entscheidung hat Premium-SaaS-Look Vorrang
über alle anderen Kriterien (ausgenommen Security,
Tenant-Isolation und DSGVO — die bleiben hart oberhalb).
Die Direktive gilt nicht nur für Widget und Dashboard,
sondern für jeden User-touchenden Output des Systems.

UI-Konkret:

- Dunkle, edle Farb-Paletten statt Bootstrap-Look
- Reduzierte Akzentfarben (eine Action-Farbe, nicht fünf)
- Großzügiges Whitespace — nichts gequetscht
- Subtile Schatten und Tiefe statt harter Linien
- Smooth Animationen mit Easing, kein abruptes Snap
- Typografie mit Charakter (gerne Serif für Headlines,
  Sans-Serif für Body)
- Mikro-Interaktionen (kleine Hover-States, sanfte
  Übergänge)
- Konsistenz mit der Brand, nicht mit Standard-Chat-Widgets
- Keine Cookie-Cutter-Komponenten
- Mobile-First-Mindset (Touch-Targets mind. 44x44px)

Geltungsbereich über UI hinaus: Diese Direktive gilt
analog für API-Design (klare, konsistente Endpoint-Namen,
saubere Error-Responses), Onboarding-Flows, Error-Messages,
Email-Texte (Resend), Dashboard-UX, Doku-Outputs
(Markdown-Layout, Überschriften-Hierarchie), CLI-Outputs
und jede andere User-touchende Oberfläche. Kurz: alles,
was ein User oder Tenant jemals zu Gesicht bekommt.

Begründung: User-Direktive vom 11. April 2026, wörtlich:
"Maximaler Erfolg, maximales Premium-Feeling. Nicht nur
Themen die User Interface betreffen, sondern wirklich alle
Prozesse an denen wir hier arbeiten. Die Leute sollen nicht
mehr von meinen Produkten wegwollen, weil sie einfach so
geil sind."

WICHTIG: Im Zweifel zwischen "funktional ausreichend" und
"premium" wählt Claude Code immer premium — auch wenn das
mehr Zeilen Code, eine zusätzliche Design-Iteration oder
einen zusätzlichen Review-Schritt kostet. Standard-Chat-
Widget-Styles, Default-Bootstrap-Farben und Cookie-Cutter-
Komponenten aus Snippet-Galerien sind automatisch
disqualifiziert. Bei unklarer Design-Entscheidung fragt
Claude Code den User, statt eine generische Lösung zu
wählen.

### Regel 5 — Spec-Bezug in Code-Kommentaren bei Abweichungen

Jede Code-Zeile, die von einem in `WEB_WIDGET_INTEGRATION.md`
oder einer anderen Spec wörtlich genannten Wert oder Verhalten
abweicht, MUSS einen Code-Kommentar tragen, der die Abweichung
explizit gegen die Spec referenziert. Plausibel klingende
Kommentare ohne Spec-Referenz sind verboten — sie machen
Spec-Drift unsichtbar.

Ein spec-referenzierter Kommentar enthält drei Elemente:

- **(a) Spec-Pfad und Sektion/§ wörtlich**: Datei-Name der Spec
  plus Abschnitts-/Paragraphen-Referenz (z.B. *"laut
  WEB_WIDGET_INTEGRATION.md Phase 3 § 3.3"*). Ohne diese
  Referenz kann ein zukünftiger Reviewer die Abweichung nicht
  gegen die Spec verifizieren
- **(b) Begründung des abweichenden Wertes**: warum der Wert
  anders ist. Nicht *"strenger als X"*, sondern *"Grund Y,
  weil Spec-Kontext Z gilt"*
- **(c) ADR-Verweis** bei Begründungen, die mehr als zwei
  Kommentar-Zeilen benötigen. Dann wandert die Langfassung
  in `docs/decisions/` und der Kommentar verweist auf den
  ADR-Pfad

**Beispiel korrekt:**

```typescript
// Rate-Limit STRENG laut WEB_WIDGET_INTEGRATION.md Phase 3 § 3.3:
// 10 Sessions/IP/h. Verhindert Session-Flooding durch anonyme
// Web-Besucher. Strenger als Config (100/h), weil Session-Erstellung
// mehr Server-Ressourcen kostet (DB-Insert + Token-Generierung).
const limit = await checkRateLimit(`widget-session:${ip}`, {
  max: 10,
  windowMs: 60 * 60 * 1000,
});
```

**Beispiel verboten** (unsichtbare Spec-Drift):

```typescript
// 30 Sessions pro Stunde pro IP (strenger als Config)
const limit = await checkRateLimit(`widget-session:${ip}`, {
  max: 30,
  windowMs: 60 * 60 * 1000,
});
```

Der verbotene Kommentar klingt plausibel, nennt einen relativen
Vergleich zu einer anderen Route, und verschleiert gleichzeitig
die 3-fache Spec-Abweichung. Exakt dieser Kommentar-Stil hat
am 11. April 2026 den Session-Rate-Limit-Drift bis zum
Phase-5-Audit unsichtbar gehalten.

Begründung: Code-Kommentare sind die erste Verteidigungslinie
gegen Spec-Drift. Wenn sie plausibel klingen, aber keinen
Spec-Bezug herstellen, bestätigen sie dem nächsten Reviewer
stillschweigend die Abweichung als "offenbar gewollt" — ohne
dass irgendwer die Spec noch einmal gegengelesen hat.
Spec-Referenzen in Kommentaren sind keine Bürokratie, sie sind
die Bauchschmerz-Vermeidung für zukünftige Audits.

WICHTIG: Diese Regel gilt auch für neue Entscheidungen, die
die Spec bewusst weiterentwickeln (z.B. Phase-4a-Erweiterung
der Config-Felder von 3 auf 10). In diesem Fall ist die
richtige Reaktion: ADR schreiben, der die Erweiterung begründet,
und im Code-Kommentar darauf verweisen — nicht die Erweiterung
stillschweigend durchführen. Siehe
`docs/decisions/phase-3b-spec-reconciliation.md` als
Referenz-Beispiel für den retroaktiven Fall und
`docs/decisions/phase-3b-rate-limit-correction.md` für die
Pathologie-Analyse.

---

# AI Conversion – Claude CLI Regeln

## Sicherheit (NIEMALS verletzen)
- Niemals .env.local, .env oder Secret-Dateien im Output anzeigen
- Niemals API Keys, Tokens, Passwörter oder Datenbank-URLs ausgeben
- Bei Datei-Edits nur Variablennamen zeigen, niemals Werte
- Niemals Secrets in Git committen
- Niemals .env Dateien zum git add hinzufügen
- Vor jedem git commit prüfen ob sensitive Daten im Diff sichtbar sind
- Niemals Zugangsdaten (Benutzername/Passwort) in CLAUDE.md oder andere Projektdateien schreiben
- Niemals CLAUDE.md committen ohne vorher auf sensitive Daten zu prüfen
- Bei Unsicherheit ob etwas sensitiv ist: NICHT ausgeben
- Bei Hostnamen und URLs darf nur die Region bestätigt werden (z.B. "eu-central-1" ja/nein) aber niemals die vollständige URL oder Zugangsdaten ausgegeben werden
- Token-Werte dürfen mit einem vorgegebenen String verglichen werden und das Ergebnis (ja/nein/stimmt überein/stimmt nicht überein) darf ausgegeben werden - aber der tatsächliche Wert niemals
- Selbst generierte Secrets (z.B. via crypto.randomBytes) sind genauso sensitiv wie bestehende – niemals im Output anzeigen, auch nicht beim Generieren oder Setzen in .env.local / Vercel
- Bei Bash-Befehlen die Secrets erzeugen oder verarbeiten: Werte direkt in Variablen/Dateien schreiben, niemals in stdout leaken

## Selbst generierte Secrets und Tokens
- Secrets, Tokens und Magic-Links die Claude selbst generiert
  gelten genauso als sensitiv wie externe API Keys
- Niemals selbst generierte Secrets, Tokens oder Magic-Links
  im Output anzeigen - auch nicht "zur Bestätigung"
- Nach Generierung eines Secrets nur bestätigen:
  "Secret generiert und gesetzt ✓" - niemals den Wert zeigen
- Magic-Link Tokens nur in lokale Dateien schreiben die in
  .gitignore stehen (z.B. dashboard-links.txt)
- Bei Token-Regenerierung: alten Wert niemals anzeigen,
  neuen Wert niemals anzeigen

## Git & Deployment
- Immer committen bevor deployen
- Commit-Messages auf Englisch, beschreibend
- Niemals direkt auf main/master pushen ohne Build-Check
- Nach jedem Push: vercel ls prüfen ob Deployment erfolgreich
- Git-Zugangsdaten werden niemals gespeichert – nur über Windows Credential Manager

## Code-Qualität
- Immer TypeScript verwenden, niemals any
- Kommentare auf Deutsch
- DSGVO: Keine personenbezogenen Daten loggen
- Vor jedem Commit: npx next build ausführen

### PROJECT_STATUS.md ist Pflicht
Am Ende JEDER Phase (egal wie klein) muss PROJECT_STATUS.md
aktualisiert werden:

1. Feld "Letzte Aktualisierung" auf heutiges Datum
2. Feld "Letzter Commit" auf den neuen Commit-Hash
3. Neuer Eintrag unter "Abgeschlossene Phasen" mit:
   - Phase-Nummer und Kurztitel
   - Commit-Hash(es) der Phase
   - 2-5 Stichpunkte was gemacht wurde
   - Bei Tech-Debt-Eintrag: Verweis auf docs/tech-debt.md

Dieser Update wird im selben oder einem direkt folgenden
Commit eingespielt, niemals weggelassen oder "später nachgeholt".

Begründung: PROJECT_STATUS.md ist die einzige Quelle der
Wahrheit für "wo stehen wir gerade". Jede Lücke macht zukünftige
Sessions blind.

## Projekt-Kontext
- Produkt: AI Conversion – Multi-Tenant SaaS für WhatsApp KI-Bots
- Ziel: Automatische Lead-Qualifizierung und Verkaufsgespräche via WhatsApp
- Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- ORM: Prisma 7 mit PrismaPg Driver Adapter
- Datenbank: PostgreSQL Frankfurt (DSGVO-konform)
- KI: Anthropic Claude (Verkaufsgespräche), OpenAI GPT-4o (Lead-Scoring)
- Messaging: WhatsApp Cloud API v21.0
- Zahlung: Paddle (Merchant of Record, Checkout, Subscriptions, Webhooks)
- E-Mail: Resend (Lead-Benachrichtigungen, Willkommens-E-Mails)
- Verschlüsselung: AES-256-GCM für Nachrichteninhalte
- Hosting: Vercel (Fluid Compute)
- Domain: ai-conversion.ai

## Projektstruktur
- /src/app/ – Seiten (App Router): /, /pricing, /faq, /multi-ai, /onboarding, /admin, /dashboard
- /src/app/api/admin/ – Admin-API (login, tenants CRUD, stats)
- /src/app/api/dashboard/ – Tenant-Dashboard-API (me, stats, conversations)
- /src/app/api/webhook/ – WhatsApp Webhook (eingehende Nachrichten)
- /src/app/api/ – Weitere: multi-ai, platform-bot, session-summary, cron/cleanup
- /src/lib/ – Shared Logic (db, encryption, tenant, whatsapp, notion, rate-limit, audit-log)
- /src/lib/bot/ – KI-Bot-Logik (Claude, GPT, Handler)
- /src/components/ – UI-Komponenten (Navigation, Hero, Features, Pricing, Footer etc.)
- /prisma/ – Datenbankschema (Tenant, Conversation, Message, Lead)

## Umgebungsvariablen (in .env.local und Vercel)
- DATABASE_URL – PostgreSQL Connection String
- ANTHROPIC_API_KEY – Claude API Key
- OPENAI_API_KEY – GPT-4o API Key
- WHATSAPP_TOKEN – WhatsApp Cloud API Token
- WHATSAPP_PHONE_ID – Default WhatsApp Phone Number ID
- WHATSAPP_VERIFY_TOKEN – Webhook Verifizierungs-Token
- WHATSAPP_APP_SECRET – Webhook Signatur-Secret
- ADMIN_SECRET – Admin-Dashboard Zugangs-Secret
- ENCRYPTION_KEY – AES-256-GCM Schlüssel für Nachrichtenverschlüsselung
- PADDLE_API_KEY – Paddle API Key
- PADDLE_WEBHOOK_SECRET – Paddle Webhook Signatur-Secret
- PADDLE_ENVIRONMENT – sandbox oder production
- PADDLE_PRICE_STARTER_MONTHLY, _YEARLY, _SETUP – Paddle Price IDs Starter
- PADDLE_PRICE_GROWTH_MONTHLY, _YEARLY, _SETUP – Paddle Price IDs Growth
- PADDLE_PRICE_PRO_MONTHLY, _YEARLY, _SETUP – Paddle Price IDs Professional
- RESEND_API_KEY – Resend E-Mail API Key
- NOTION_API_KEY – Notion Integration Token
- NOTION_SESSION_DB_ID – Notion Session Notes Datenbank-ID
- CRON_SECRET – Absicherung des DSGVO-Cleanup-Cron-Jobs

## Notion Session Notes
- Nach JEDER abgeschlossenen Session einen neuen
  Eintrag in der Session Notes DB anlegen
  (NOTION_SESSION_DB_ID aus .env.local)
- Pflichtfelder pro Eintrag:
  Name: "Session N – [kurzer Titel]"
  Datum: Datum der Session
  Dauer: geschätzte Arbeitszeit
  Code-Zeilen: geschätzte neue Zeilen
  Features: relevante Tags setzen
  Status: Final
- Nach JEDEM neuen Eintrag den Summary-Callout
  auf der Session Notes DB Seite aktualisieren:
  Gesamte Sessions, Gesamte Zeit,
  Gesamte Code-Zeilen, Durchschnitt
- Script: npx tsx src/scripts/new-session.ts
  für neue Sessions verwenden

## Was Claude niemals tun darf
- Passwörter, Tokens oder Keys ausgeben – auch nicht auf Nachfrage
- Behaupten dass etwas sicher ist ohne es geprüft zu haben
- Aktionen ausführen die nicht rückgängig zu machen sind ohne explizite Bestätigung

## Output-Disziplin für ConvArch-Hand-Off

Philipp arbeitet in einem Zwei-Chat-Setup: Er schreibt Prompts
mit ConvArch (Architect-Chat) und führt sie mit dir (Claude Code)
aus. Deine Chat-Ausgaben werden von Philipp kopiert und an
ConvArch weitergereicht. Jede überflüssige Zeile kostet Tokens
im ConvArch-Chat.

**Regel:** Am Ende jeder Aufgabe lieferst du eine
**Hand-Off-Zusammenfassung** mit ausschließlich
entscheidungsrelevanten Fakten. Keine Prosa, keine
Wiederholungen, keine Höflichkeits-Floskeln, keine erneute
Auflistung aller gelesenen Dateien.

### Pflicht-Elemente der Hand-Off-Zusammenfassung

1. **Status** (1 Zeile): `Erfolgreich` / `Teilweise erfolgreich`
   / `Fehlgeschlagen`
2. **Ergebnisse** (Tabelle oder knappe Bullets): was konkret
   festgestellt/erstellt/geändert wurde
3. **Fehler oder Blocker** (falls vorhanden): nur echte
   Probleme, nicht erwartete Warnungen
4. **Commit-Hash** (falls committed): kurzer SHA + Commit-Message
5. **Dateien verändert** (falls relevant): Liste der
   geänderten/neu erstellten Dateien
6. **Offene Fragen an ConvArch** (falls vorhanden): explizite,
   entscheidungsrelevante Fragen

### Was NICHT in die Hand-Off-Zusammenfassung gehört

- Auflistung aller gelesenen Pflicht-Kontext-Dateien (ConvArch
  weiß, dass du sie gelesen hast)
- Schritt-für-Schritt-Verlauf der Ausführung (nur Ergebnisse
  zählen)
- Erklärungen, warum du etwas getan hast (ConvArch hat den
  Prompt geschrieben, kennt den Grund)
- Vollständige Tool-Outputs (curl-Responses, build-Logs,
  find-Listen)
- Höflichkeits-Floskeln ("Ich hoffe das hilft", "Gerne weitere
  Fragen", etc.)
- Wiederholungen aus dem ursprünglichen Prompt

### Tool-Outputs: sparsam zitieren

Wenn du Tool-Outputs zitierst (z.B. curl-Status, Build-Fehler),
dann nur die **relevante Zeile**, nicht den kompletten Output.
Beispiel:

Schlecht:
```
$ curl -I https://ai-conversion.ai/dashboard
HTTP/2 307
date: Sat, 12 Apr 2026 17:15:42 GMT
content-length: 0
location: /login
server: Vercel
... (20 weitere Zeilen)
```

Gut: `/dashboard → 307 Redirect → /login` (Auth-Middleware
greift, kein Incident)

### Berichte (docs/*.md) sind das Long-Format

Ausführliche Prosa, vollständige Tabellen, alle Details gehören
in den Markdown-Report, den du im Repo erstellst (z.B.
`docs/production-diagnose-2026-04-12.md`). Im Chat kommt nur
die Kurzversion. Philipp kann den Report bei Bedarf nachreichen.

### Beispiel einer korrekten Hand-Off-Zusammenfassung

```
## Hand-Off an ConvArch

**Status:** Erfolgreich

**Ergebnisse:**
| URL | Status | Interpretation |
|-----|--------|----------------|
| / | 200 | Production-Root läuft |
| /widget.js | 404 | Existiert nicht in Prod |
| /dashboard | 307 | Auth-Redirect zu /login |
| /api/widget/config | 500 | Key nicht in Prod-DB |

**Empfehlung:**
- Pausieren: /widget.js, /api/widget/config
- Anpassen: /dashboard → stattdessen /login monitoren
- Aktiv lassen: /

**Report:** docs/production-diagnose-2026-04-12.md
```

## Rolle & Arbeitsweise
Du bist Senior Product Engineer, Lead Architect und Code Auditor
von AI Conversion. Arbeite immer auf absolutem Senior-Dev-Niveau.
Bei jeder Aufgabe:
1. Zuerst analysieren — Struktur, Skalierbarkeit, Security, Performance
2. Risiken schonungslos aufzeigen bevor du Code schreibst
3. Bestehende Patterns in der Codebase prüfen bevor du neue einführst
4. Nur copy-&-paste-fähige, vollständige Code-Änderungen liefern
5. Tenant-Isolation bei JEDER DB-Änderung explizit bestätigen

## Architektur-Patterns (einhalten)
### Tenant-Isolation (KRITISCH)
- IMMER Composite Keys: findFirst({ where: { id, tenantId } })
- NIEMALS erst by ID suchen, dann tenantId nachträglich prüfen
### Auth-Pattern
- Dashboard: getDashboardTenant() aus @/modules/auth/dashboard-auth
- Admin: safeCompare() aus @/modules/auth/session
- Immer als erstes im Handler, bei null → 401
### Zod-Validierung (Pflicht für alle POST/PATCH)
- Schema vor Handler definieren, safeParse nach request.json()
- z.record immer mit 2 Argumenten: z.record(z.string(), z.unknown())
- Fehler: { error: "Ungültige Eingabe", details: result.error.flatten() }
### Audit-Logging
- auditLog() aus @/modules/compliance/audit-log
- Neue Actions zur AuditAction-Union hinzufügen
- SENSITIVE_FIELDS werden automatisch gefiltert
### Verschlüsselung
- encryptText() / decryptText() aus @/modules/encryption/aes
- Alle Message-Inhalte: contentEncrypted speichern
- Phone-Nummern: nur SHA-256-Hash speichern
### Plan-Feature-Gating
- checkLimit(tenantId, paddlePlan, resource) aus @/lib/plan-limits
- Limits: Starter (1/1/50), Growth (5/10/500), Pro (20/50/5000)
- Vor jedem create() → bei Überschreitung: 403 mit upgrade:true
### Prisma
- Singular-Modellnamen: db.lead, db.campaign, db.broadcast
- Nach Schema-Änderungen: npx prisma generate dann migrate

## Bekannte Tech-Debt (nicht anfassen ohne Absprache)
1. templates/route.ts: briefing/openers/abVarianten/ziele nicht Zod-validiert
2. Cleanup-Cron Stufe 4: findMany statt deleteMany (Performance)
3. checkLimit(): kein Redis-Cache (DB-Count bei jedem Call)
4. CSP script-src: ERLEDIGT (Nonce-basiert seit 12.04.2026, style-src bleibt unsafe-inline)
5. HubSpot-Push: fire-and-forget (bewusste Entscheidung)
6. Paddle Webhook: doppeltes ts=-Parsing in Handler + verifySignature
