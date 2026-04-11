# ADR Phase 3b — Spec-Reconciliation (Config-Felder + Poll-Audit-Log)

**Datum:** 2026-04-12
**Status:** Entschieden und dokumentiert (kein Code-Change)
**Owner:** Project Owner + ConvArch
**Betroffene Dateien:** keine (reine Doku-Aufarbeitung)

---

## Kontext

Im unmittelbar vorhergehenden Phase-3b-Vollaudit — durchgefuehrt
nach dem Session-Rate-Limit-Fix vom selben Tag (Commit
`a26977d`, siehe `phase-3b-rate-limit-correction.md`) — wurden
zwei weitere Soft-Drifts zwischen `WEB_WIDGET_INTEGRATION.md`
Phase 3 und dem tatsaechlichen Code identifiziert. Beide sind
**funktional korrekt**, **Intent-konform** und technisch
verteidigbar, aber **nicht spec-referenziert dokumentiert** —
exakt das Pathologie-Muster, vor dem die heutige Lessons-Learned-
Sektion des Rate-Limit-ADR warnt.

Dieser ADR schliesst die Doku-Luecke, macht die Spec-Bezuege
explizit und bestaetigt die Entscheidungen retroaktiv. Es gibt
**keinen Code-Change**; Phase 3b bleibt funktional unveraendert.

---

## Drift 1 — Config-Response-Felder

### Spec-Wortlaut

`WEB_WIDGET_INTEGRATION.md` § "Phase 3: Widget-API-Endpoints",
Unterabschnitt 3.2 Config-Endpoint:

> Gibt NUR nicht-sensitive Tenant-Config zurueck:
> `{ primaryColor, logoUrl, welcomeMessage }`

Drei Felder explizit aufgelistet.

### Aktueller Code

`src/app/api/widget/config/route.ts` Z. 119-132 liefert
**11 Felder** im Response-JSON:

**Farben (5):**
- `backgroundColor` — Basisfarbe des Chat-Backgrounds
- `primaryColor` — Akzent/Action-Farbe (Buttons, Highlights)
- `accentColor` — Sekundaere Akzentfarbe (Gradienten, Hover)
- `textColor` — Primaere Textfarbe
- `mutedTextColor` — Sekundaere Textfarbe (Zeitstempel, Hints)

**Branding (3):**
- `logoUrl` — Optionales Tenant-Logo im Chat-Header
- `botName` — Anzeigename des Bots
- `botSubtitle` — Subtitle unter dem Bot-Namen
  ("Antwortet sofort" als Default)

**Verhalten (2):**
- `welcomeMessage` — Begruessungs-Text vor dem ersten Turn
- `avatarInitials` — Initialen im Avatar-Kreis, wenn kein
  `logoUrl` gesetzt

**Embed-Loader (1):**
- `bubbleIconUrl` — Optionaler Tenant-Override fuer das
  Floating-Bubble-Icon (Phase 5)

### Sensitivitaets-Verifikation

Jedes der 11 Felder wurde einzeln geprueft auf:
- ❌ DB-interne IDs (`tenantId`, `conversationId`, etc.)
- ❌ API-Keys (`anthropicApiKey`, `openaiApiKey`, `hubspotApiKey`,
  `paddleApiKey`, `whatsappToken`)
- ❌ Secrets (`adminSecret`, `encryptionKey`, `webhookVerifyToken`)
- ❌ Personenbezogene Daten (E-Mails, Phone-Hashes,
  Consent-Timestamps)
- ❌ Billing-Daten (`paddlePlan`, `paddleStatus`,
  `billingEmail`)
- ❌ Routing-Information (`whatsappPhoneId`, interner `slug`)

**Ergebnis:** Alle 11 Felder sind verifiziert nicht-sensitiv.
Sie enthalten ausschliesslich visuelle und textuelle
Konfiguration, die das Widget zum Rendern braucht und die
ohnehin in jedem HTML-Quellcode der Kunden-Webseite sichtbar
werden wird, sobald das Widget laedt.

### Begruendung der Erweiterung

Die Spec-Liste war **illustrativ fuer das Prinzip "nur
nicht-sensitive Tenant-Config"**, nicht abschliessend. Zum
Zeitpunkt der Spec-Formulierung (vor Phase 4a) stand das
visuelle Customization-Niveau des Widgets noch nicht fest.

Phase 4a hat dann das 10-Felder-Tenant-Config-Model eingefuehrt
(Commit `ee9209c`, belegt in `PROJECT_STATUS.md` Eintrag "Phase
4a — Widget iframe-Skelett"). Gruende fuer den vollen 10-Felder-
Umfang:

1. **Premium-Branding-Direktive (Regel 4):** Ein Widget, das
   sich von Standard-Chat-Widget-Optik abheben soll, braucht
   volle Kontrolle ueber Background + Farbpalette +
   Typografie-Fuehrung. Drei Farben reichen dafuer nicht.
2. **Dark-Mode-Faehigkeit:** `backgroundColor` + `textColor` +
   `mutedTextColor` sind zwingend fuer kontrastreiche
   Dark-Themes. Ohne sie zerreisst jeder Dark-Widget-Look.
3. **Bot-Identitaets-Customization:** `botName`, `botSubtitle`,
   `avatarInitials` erlauben dem Tenant, dem Bot eine eigene
   Persona zu geben (Beispiel: "Sarah", "Beraeterin fuer
   Immobilien in Berlin", "SH"). Das ist eine Kern-
   Differenzierung gegen generische Chatbots.
4. **Accessibility:** `mutedTextColor` muss separat setzbar
   sein, damit Tenants den WCAG-AA-Kontrast ihrer Sekundaer-
   Texte kontrollieren koennen — die Spec-Liste mit nur
   `primaryColor` machte das unmoeglich.

Phase 5 hat dann Feld 11 (`bubbleIconUrl`) hinzugefuegt, bereits
dokumentiert in `phase-5-embed-script.md` Entscheidung 2
(Standard-Icon mit optionalem Tenant-Override).

### Klassifizierung

**Spec-Luecke geschlossen, kein Drift.** Die Spec formulierte
das Prinzip ("nicht-sensitiv") und gab drei Beispiele. Der
Code folgt dem Prinzip und ergaenzt sieben weitere Felder, die
demselben Prinzip genuegen. Die sinnvollste Lesart der Spec
ist: die drei Felder sind Mindest-Umfang, nicht Maximal-Umfang.

### Status

Akzeptiert. Doku nachgezogen durch diesen ADR. Kein Code-Change.

---

## Drift 2 — Poll-Endpoint ohne `auditLog()`

### Spec-Wortlaut

`WEB_WIDGET_INTEGRATION.md` § "Pflicht fuer ALLE Endpoints":

> `auditLog()` fuer alle Aktionen (mit IP-Hash, nicht
> Klartext-IP)

Keine Ausnahme fuer Read-Only-Endpoints in der Spec.

### Aktueller Code

`src/app/api/widget/poll/route.ts` enthaelt **keinen**
`auditLog`-Aufruf. Datei-Header Z. 5-6 dokumentiert die
Abweichung inline:

> Das Widget pollt periodisch (alle ~2 Sek laut Spec),
> daher KEIN Audit-Log je Request - wuerde Logs fluten.

Die anderen drei Endpoints (`config`, `session`, `message`)
rufen `auditLog()` spec-konform mit IP-Hash auf.

### Begruendung der Ausnahme

Polling laeuft mit dem im `ChatClient.tsx` gesetzten Intervall
von 2 Sekunden pro aktiver Session. Bei 100 parallelen
Pilot-Sessions bedeutet das:

```
100 Sessions × (60s / 2s) = 3000 Audit-Logs pro Minute
                         = 180_000 pro Stunde
                         = 4_320_000 pro Tag
```

Allein der Poll-Endpoint wuerde die Audit-Log-Tabelle um **vier
Millionen Zeilen pro Tag** fuellen, ohne dabei eine einzige
zustandsaendernde Aktion zu dokumentieren. Das ist nicht nur
ein Storage-Problem, sondern ein **Signal-to-Noise-Problem**:
die echten, interessanten Audit-Events (neue Session,
eingehende User-Nachricht, Consent-Event, STOP-Befehl,
Tenant-Wechsel) wuerden im Poll-Rauschen untergehen.

Der semantische Kern der Spec-Anforderung ist: **jede "Aktion"
muss auditierbar sein**. Poll ist aber keine Aktion im
semantischen Sinne — es ist ein Read-Heartbeat ohne
Zustands-Aenderung. Die Aktionen, die der Poll lesbar macht
(Bot-Antworten, Consent-Status-Aenderungen), sind bereits
einzeln auditiert:

- **Session-Erstellung** → `widget.session_started` im
  Session-Endpoint
- **User-Nachricht** → `widget.message_received` im
  Message-Endpoint
- **Bot-Antwort** → `bot.reply_sent` in `processMessage`
- **Consent-Events** → `bot.consent_requested`,
  `bot.conversation_stopped` in `processMessage`

Der Poll ist lediglich der Transport-Layer, ueber den der Client
diese bereits auditierte Ereignisse abholt. Ihn zusaetzlich zu
loggen, wuerde die gleiche Information dupliziert halten — ohne
Compliance-Gewinn.

### Geprueften Alternativen

| # | Alternative | Bewertung |
|---|---|---|
| **(i)** | **Reiner Verzicht (aktuell, gewaehlt)** | Kein Noise, keine Storage-Kosten, keine Log-Flood. Compliance-Luecke Null, weil alle wirklichen Aktionen in anderen Endpoints bereits auditiert sind |
| (ii) | Sampled Audit-Logging (z.B. jeder 60. Poll = 1x/Min/Session) | Reduziert Noise um 98.3%, aber immer noch ~72k Logs/Tag bei 100 Sessions. Nicht-deterministische Compliance-Decke (was, wenn der relevante Event im 1-von-60-Fenster liegt?) |
| (iii) | Metrik statt Audit-Log (Prometheus-Counter ohne PII) | Null Compliance-Beitrag, aber Operations-Sichtbarkeit. Trennt "Audit" (Compliance) von "Metrics" (Ops) sauber |

### Empfehlung

**(i) bleibt als aktiver Zustand.** Die Aktion-Semantik der
Spec ist erfuellt — alle zustandsaendernden Aktionen sind in
den anderen drei Endpoints abgedeckt. Poll ist der reine
Lese-Transport, den zu loggen redundanten Compliance-Wert hat.

**(iii) als Tech-Debt-Eintrag fuer Phase 7+** (Operations-
Observability-Aufbau): Falls Phase 6 oder spaeter einen
Operations-Dashboard-Bedarf entwickelt ("Wie viele aktive
Widget-Sessions laufen gerade?"), waere ein Prometheus- oder
Vercel-Analytics-basierter Counter der richtige Ort dafuer —
**nicht** das Audit-Log.

### Klassifizierung

**Bewusste Spec-Ausnahme, kein Drift.** Die Spec ist in diesem
Punkt zu pauschal formuliert ("fuer alle Aktionen"); der
engere, semantisch praezisere Begriff ist "fuer alle
zustandsaendernden oder sicherheitsrelevanten Aktionen". Der
Code folgt der engeren Lesart.

### Status

Akzeptiert. Doku nachgezogen durch diesen ADR. Kein Code-Change.

---

## Konsistenz-Tabelle: Audit-Log-Status aller 4 Widget-Endpoints

| Endpoint | Audit-Log vorhanden? | Event-Name | Begruendung |
|---|---|---|---|
| `config/route.ts` | ✅ | `widget.config_fetched` | Config-Fetch ist der Eintrittspunkt ins Widget-Flow und markiert jede aktive Kundensession aus Tenant-Sicht. Rate-Limit-Abuse-Analyse basiert auf diesen Events |
| `session/route.ts` | ✅ | `widget.session_started` | Session-Erstellung ist eine zustandsaendernde Aktion (neue `Conversation`-Row mit WEB-Channel). Compliance-Pflicht fuer DSGVO-Dokumentation |
| `message/route.ts` | ✅ | `widget.message_received` | Eingehende User-Nachricht ist eine zustandsaendernde Aktion (Message-Persistenz + Bot-Trigger). Compliance-Pflicht plus Missbrauchs-Erkennung |
| `poll/route.ts` | ❌ **bewusst** | — | Read-only Heartbeat, 2-Sekunden-Intervall waehrend aktiver Session. Logging wuerde Signal-to-Noise-Ratio zerstoeren und zustandsaendernde Events im Rauschen versenken. Siehe Drift 2 oben |

Nach diesem ADR ist das Audit-Log-Muster fuer Widget-Endpoints
**spec-konform und vollstaendig dokumentiert**.

---

## Lessons Learned (Verstaerkung des Vormittags-ADRs)

Beide in diesem Audit identifizierten Findings folgen demselben
Pathologie-Muster wie die Session-Rate-Limit-Drift vom selben
Tag:

1. **Plausibel klingende Code-Kommentare ohne Spec-Referenz.**
   - Im Config-Fall gibt es gar keinen Kommentar zur Felder-
     Auswahl, nur den Ausdruck *"NUR die 11 nicht-sensitiven
     Config-Felder"* — der die Zahl 11 als gegeben akzeptiert,
     ohne die Spec zu zitieren.
   - Im Poll-Fall gibt es einen Kommentar, der die Ausnahme
     erklaert (*"wuerde Logs fluten"*), aber **ohne Verweis
     auf die Spec-Zeile, von der die Ausnahme abweicht**.

2. **Keine ADR-Begleit-Dokumentation fuer die
   Entscheidungspunkte.** Phase 3b hat kein dediziertes ADR-
   Dokument ueber das gesamte Phasen-Design hinweg; die
   einzelnen Abweichungen sind nur punktuell in `PROJECT_STATUS.md`
   und Inline-Kommentaren verstreut.

3. **Kein vorgelagerter Spec-Reconciliation-Audit beim Phasen-
   Abschluss.** Der Drift wurde erst durch den **nachgelagerten**
   Phase-5-Done-Audit sichtbar. Ein dedizierter Spec-vs-Code-
   Audit als Pflicht-Schritt am Ende jeder Phase haette alle
   drei Drifts vor dem Merge erkannt.

**Die heute eingefuehrte CLAUDE.md-Regel** (siehe
`CLAUDE.md` Regel 5 "Spec-Bezug in Code-Kommentaren bei
Abweichungen") adressiert den ersten und zweiten Punkt
systematisch. Sie verpflichtet, dass jede Abweichung von einem
wortlaut-genannten Spec-Wert einen spec-referenzierten Kommentar
traegt — und plausibel klingende Kommentare ohne Spec-Bezug
explizit verbietet.

Der dritte Punkt (Spec-Reconciliation-Audit als Pflichtschritt)
bleibt vorerst offen. Empfehlung fuer einen spaeteren Prompt:
**Regel 6** in CLAUDE.md ergaenzen, die einen Spec-Reconciliation-
Audit als Pflicht-Phase-Abschluss definiert — analog zum
Konsumenten-Audit bei Schema-Migrationen (Regel 2).

---

## Reversibilitaets-Check

| Drift | Reversibilitaet | Impact bei Rueckbau |
|---|---|---|
| **1 — Config-Felder 3→11** | **Two-Way-Door (theoretisch)** | Praktisch **blockiert**: Rueckbau auf 3 Felder wuerde das Chat-UI visuell dramatisch verschlechtern (hartkodierte Fallbacks in `ChatClient.tsx` + `DEFAULT_CONFIG` muessten als Fallback-Layer reanimiert werden). Wuerde Phase-4-Customization-Features effektiv zerstoeren. **Kein realistischer Rueckbau** |
| **2 — Poll-Audit-Log-Ausnahme** | **Two-Way-Door** | Audit-Logging im Poll-Endpoint waere trivial ergaenzbar (~3 LOC). Performance-Impact: messbar negativ bei skalierten Pilot-Deployments (siehe Log-Volume-Rechnung oben). Bei konkretem Bedarf jederzeit nachruestbar — die Architektur macht es zu einer Entscheidung, nicht zu einem Refactor |

Kein One-Way-Door, keine der beiden Entscheidungen ist in
einem Sinne "final", der spaetere Neu-Bewertung verhindern
wuerde.

---

## Zusammenfassung

Phase 3b ist nach dem Session-Rate-Limit-Fix vom
Vormittag (`a26977d`) und diesem Doku-Commit **funktional
spec-konform und vollstaendig dokumentiert**. Alle drei
in dieser Phase identifizierten Drifts sind entweder
korrigiert (Session-Rate-Limit) oder als bewusste Spec-
Ausnahmen dokumentiert (Config-Felder-Erweiterung,
Poll-Audit-Log-Verzicht).

**Phase 6 ist aus Doku-Sicht freigegeben.**
