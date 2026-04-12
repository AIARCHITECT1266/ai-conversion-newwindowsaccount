# Integration-Guide: AI Conversion Web-Widget

Dieses Dokument beschreibt, wie Sie das AI Conversion Web-Widget
auf Ihrer Webseite einbetten. Das Widget qualifiziert Besucher
automatisch per Chat und liefert bewertete Leads in Ihr CRM —
rund um die Uhr, ohne manuellen Aufwand.

**Zielgruppe:** Pilot-Kunden und deren Entwickler/Agenturen.
Teil A (Sektionen 1-5) richtet sich an nicht-technische
Entscheider, Teil B (Sektionen 6-9) an Entwickler.

---

## Teil A — Einbettung (fuer Pilot-Kunden)

### 1. Was das Widget kann

Sobald das Widget auf Ihrer Webseite eingebettet ist, erscheint
unten rechts eine Chat-Bubble. Besucher klicken darauf, geben
ihre DSGVO-Einwilligung und starten eine Konversation mit Ihrem
KI-Berater. Der Bot qualifiziert Interessenten nach Ihren
Kriterien — Budget, Bedarf, Lieferregion, Zeitrahmen — und
bewertet jeden Kontakt mit einem Lead-Score. Qualifizierte
Leads landen automatisch in Ihrem CRM-Dashboard mit
Gespraechsverlauf, Score und naechstem Schritt.

### 2. In drei Schritten einbetten

**Schritt 1 — Embed-Code aus dem Dashboard kopieren**

Oeffnen Sie Ihr Dashboard unter
`https://ai-conversion.ai/dashboard/settings/widget`.
Dort finden Sie den Embed-Code — ein kurzes HTML-Snippet:

```html
<script src="https://ai-conversion.ai/widget.js"
        data-key="[DEIN-PUBLIC-KEY]" async></script>
```

Klicken Sie auf den **Kopieren**-Button, um das Snippet in
die Zwischenablage zu uebernehmen. Der `data-key` ist Ihr
persoenlicher Public Key — er identifiziert Ihr Unternehmen
und ist sicher im Quelltext sichtbar.

**Schritt 2 — Snippet in Ihre Webseite einfuegen**

Fuegen Sie das kopierte Snippet **direkt vor dem schliessenden
`</body>`-Tag** Ihrer Webseite ein. Das Widget laedt
asynchron und blockiert nicht den Seitenaufbau.

**Schritt 3 — Speichern und pruefen**

Speichern Sie die Aenderung und laden Sie Ihre Webseite neu.
Die Chat-Bubble sollte unten rechts erscheinen. Klicken Sie
darauf, um zu pruefen, ob der DSGVO-Consent und die
Konversation funktionieren.

*Screenshots: TODO*

### 3. Anleitung pro Plattform

#### WordPress

1. Installieren Sie das Plugin **"HFCM (Header Footer Code Manager)"** oder **"Insert Headers and Footers"** aus dem Plugin-Verzeichnis
2. Oeffnen Sie `WP-Admin` → `HFCM` → `Add New Snippet`
3. Waehlen Sie als Position **"Before </body>"**
4. Fuegen Sie das Embed-Code-Snippet ein
5. Speichern Sie und leeren Sie den WordPress-Cache

#### Shopify

1. Oeffnen Sie `Shopify Admin` → `Online Store` → `Themes`
2. Klicken Sie auf `Actions` → `Edit Code`
3. Oeffnen Sie die Datei `theme.liquid`
4. Fuegen Sie das Snippet direkt vor `</body>` ein
5. Speichern Sie

#### Wix

1. Oeffnen Sie `Wix Dashboard` → `Einstellungen` → `Tracking & Analytics`
2. Klicken Sie auf `Neues Tool` → `Benutzerdefiniert`
3. Fuegen Sie das Snippet ein
4. Waehlen Sie als Platzierung **"Body - Ende"**
5. Waehlen Sie **"Auf allen Seiten laden"** und speichern Sie

#### Squarespace

1. Oeffnen Sie `Settings` → `Advanced` → `Code Injection`
2. Fuegen Sie das Snippet in das Feld **"Footer"** ein
3. Speichern Sie

#### Webflow

1. Oeffnen Sie `Site Settings` → `Custom Code`
2. Fuegen Sie das Snippet in das Feld **"Before </body> tag"** ein
3. Speichern und veroeffentlichen Sie die Seite

#### Jimdo / eigene HTML-Seite

1. Oeffnen Sie Ihre HTML-Datei in einem Texteditor
2. Fuegen Sie das Snippet direkt vor `</body>` ein:

```html
  <!-- AI Conversion Widget -->
  <script src="https://ai-conversion.ai/widget.js"
          data-key="[DEIN-PUBLIC-KEY]" async></script>
</body>
```

3. Speichern und hochladen

#### Google Tag Manager

1. Oeffnen Sie `Google Tag Manager` → `Tags` → `Neu`
2. Waehlen Sie als Tag-Typ **"Benutzerdefiniertes HTML"**
3. Fuegen Sie das Snippet ein
4. Waehlen Sie als Trigger **"All Pages"**
5. Speichern und veroeffentlichen Sie den Container

### 4. Nach der Einbettung — was passiert jetzt?

Nach erfolgreicher Einbettung:

- **Die Chat-Bubble** erscheint auf jeder Seite unten rechts.
  Farben und Branding passen sich an Ihre Dashboard-Konfiguration
  an (aenderbar unter `Dashboard` → `Einstellungen` → `Web-Widget`)
- **Besucher klicken auf die Bubble,** bestaetigen den
  DSGVO-Consent und starten eine Konversation
- **Der KI-Bot qualifiziert** nach Ihren Kriterien — automatisch,
  24 Stunden am Tag, 7 Tage die Woche
- **Qualifizierte Leads** erscheinen in Ihrem Dashboard unter
  `Conversations` mit Channel-Marker "Web", Lead-Score und
  vollstaendigem Gespraechsverlauf
- **Alle Daten** werden verschluesselt gespeichert (AES-256-GCM)
  und in der EU gehostet

### 5. Haeufige Fragen

**"Das Widget erscheint nicht."**
Pruefen Sie: Ist das Script-Tag vor `</body>` eingefuegt (nicht
im `<head>`)? Ist der `data-key` korrekt? Leeren Sie den
Browser-Cache und laden Sie die Seite ohne Cache neu
(Strg+Shift+R). Falls Sie eine Content Security Policy nutzen,
lesen Sie Sektion 7.

**"Das Widget passt nicht zu meinem Design."**
Farben, Bot-Name, Willkommensnachricht und Avatar sind ueber
das Dashboard anpassbar: `Dashboard` → `Einstellungen` →
`Web-Widget` → Abschnitt "Design anpassen". Aenderungen
werden sofort wirksam, ohne das Snippet zu aendern.

**"Was kostet das Widget?"**
Das Web-Widget ist ab dem Growth-Plan verfuegbar. Details
finden Sie unter `https://ai-conversion.ai/pricing`.

**"Ist das DSGVO-konform?"**
Ja. Das Widget holt vor der ersten Nachricht eine explizite
Einwilligung ein, speichert den Consent mit Zeitstempel, und
alle Daten liegen verschluesselt auf EU-Servern. Ein
Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO ist
inklusive.

**"Kann ich das Widget auf mehreren Seiten einbauen?"**
Ja. Ein einziges Snippet gilt fuer alle Seiten und Subdomains
Ihrer Webseite. Das Widget erkennt automatisch, auf welcher
Seite der Besucher sich befindet.

**"Antwortet der Bot auch nachts und am Wochenende?"**
Ja, 24/7. Der Bot ist KI-basiert und benoetigt keine
menschliche Betreuung.

---

## Teil B — Technische Details (fuer Entwickler)

### 6. Embed-Script-Architektur

- **Datei:** `widget.js` (statisch, ueber CDN ausgeliefert)
- **Groesse:** 12.5 KB, Vanilla JavaScript, keine Dependencies
- **Ladevorgang:** `async`-Attribut, blockiert weder Parsing
  noch Rendering der Host-Seite
- **CSS-Isolation:** Closed Shadow DOM — das Widget-Styling
  kann Host-CSS weder beeinflussen noch von ihm beeinflusst
  werden
- **Chat-UI:** iframe-basiert (`/embed/widget?key=pub_xxx`),
  mit `sandbox="allow-scripts allow-same-origin allow-forms"`
- **Config-Fetch:** lazy beim ersten Bubble-Klick, nicht beim
  Page-Load (kein unnuetiger Request auf Seiten, auf denen
  niemand chattet)
- **Fail-safe:** Bei Config-Fehler bleibt die Bubble mit
  Default-Look sichtbar und zeigt eine Fehlermeldung

### 7. CSP-Hinweise (Content Security Policy)

Falls Ihre Webseite eine strikte Content Security Policy
nutzt, muessen folgende Domains freigeschaltet werden:

```
script-src:  https://ai-conversion.ai
frame-src:   https://ai-conversion.ai
connect-src: https://ai-conversion.ai
```

Beispiel als HTTP-Header:

```
Content-Security-Policy:
  script-src 'self' https://ai-conversion.ai;
  frame-src 'self' https://ai-conversion.ai;
  connect-src 'self' https://ai-conversion.ai;
```

Falls Sie eine Nonce-basierte CSP nutzen, muss das Script-Tag
den Nonce tragen:

```html
<script src="https://ai-conversion.ai/widget.js"
        data-key="[DEIN-PUBLIC-KEY]"
        nonce="[IHR-NONCE]" async></script>
```

Der Nonce muss serverseitig in Ihrer SSR-Pipeline generiert
werden — AI Conversion kann diesen Nonce nicht fuer Sie setzen.

### 8. Debugging

Das Widget loggt relevante Ereignisse in die Browser-Console
mit dem Prefix `[ai-conversion-widget]`.

**Network-Tab pruefen:**

| Request | Zweck | Erwarteter Status |
|---------|-------|-------------------|
| `GET /api/widget/config?key=pub_xxx` | Tenant-Config laden | 200 (oder 404 bei falschem Key) |
| `POST /api/widget/session` | Neue Chat-Session starten | 200 |
| `POST /api/widget/message` | Nachricht senden | 202 |
| `GET /api/widget/poll?token=ws_xxx` | Antworten abrufen | 200 |

**Haeufige Fehlerbilder:**

- **"Widget nicht verfuegbar"** nach Bubble-Klick: der Public Key
  ist falsch oder das Widget ist im Dashboard deaktiviert.
  Pruefen Sie den `data-key`-Wert gegen den Wert in
  `Dashboard` → `Einstellungen` → `Web-Widget`
- **Console: "Refused to load script"**: Ihre CSP blockiert
  `ai-conversion.ai`. Siehe Sektion 7
- **Console: "Refused to frame"**: Ihre CSP braucht
  `frame-src https://ai-conversion.ai`
- **Keine Antworten vom Bot**: Pruefen Sie im Network-Tab, ob
  `/api/widget/poll` 200 zurueckgibt. Falls 429: Rate-Limit
  erreicht (max. 1 Poll/Sekunde)

### 9. Kontakt und Support

- **Technische Fragen:** [SUPPORT-EMAIL]
- **Status-Seite:** [STATUS-URL]
- **Dokumentation:** `https://ai-conversion.ai/docs` (in Vorbereitung)

Bei dringenden Problemen mit dem Widget (z.B. Widget laedt
nicht auf Produktionsseite) kontaktieren Sie uns direkt —
wir unterstuetzen Sie bei der Fehlersuche.
