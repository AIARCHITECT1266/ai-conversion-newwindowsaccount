# ADR Phase 5 — Embed-Script-Architektur

**Datum:** 2026-04-12
**Status:** Entschieden
**Owner:** Project Owner + ConvArch
**Betroffene Dateien:**
- `public/widget.js` (neu, Vanilla JS Loader)
- `public/widget-bubble-icon.svg` (neu, Premium-Standard-Icon)
- `public/widget-demo.html` (neu, lokale Test-Seite)
- `src/lib/widget/publicKey.ts` (Erweiterung: `bubbleIconUrl`)
- `src/app/api/widget/config/route.ts` (Erweiterung: Response-Feld)

---

## Kontext

Phase 4 hat das Widget-UI fertiggestellt: `/embed/widget?key=pub_xxx`
rendert ein vollständiges, iframe-fähiges Chat-Interface. Was
fehlt, ist der **Loader**: ein einziges `<script>`-Snippet, das
Pilot-Kunden in den `<head>` ihrer Webseite einbetten, um eine
Floating-Chat-Bubble unten rechts zu erzeugen. Beim Klick öffnet
sich das bestehende Widget in einem Overlay.

Ziel-Snippet (Endprodukt):

```html
<script src="https://ai-conversion.ai/widget.js"
        data-key="pub_xxx" async></script>
```

Drei Architektur-Entscheidungen wurden vom Project Owner vor
Beginn der Implementierung bestätigt.

---

## Entscheidung 1 — Hybrid-Architektur (statisches JS + dynamische Config)

**Gewählt:** Statische `public/widget.js` + Laufzeit-Fetch der
Tenant-Config via `GET /api/widget/config?key=pub_xxx` beim
ersten Bubble-Klick.

**Alternativen erwogen:**

| Alternative | Pro | Contra |
|---|---|---|
| **A — Statisch + Lazy-Config (gewählt)** | Eine JS-Datei für alle Tenants, beste CDN-Cacheability (1 Datei statt N), trivial-einfaches Versioning, kein Build-Step, Tenant-Config bleibt im Dashboard editierbar ohne Redeploy | Zusätzlicher Request beim ersten Klick (~50ms auf Fluid Compute) |
| **B — Pro Tenant generiertes JS** | Null Runtime-Fetches, alle Werte im JS inline | N-fache Cache-Duplikation, Redeploy bei jeder Config-Änderung, Build-Step nötig |
| **C — SSR-geliefertes JS unter `/widget.js?key=xxx`** | Ein Request weniger als A | Kein statisches Caching, jeder Page-Load erzeugt einen Fluid-Compute-Call, Vercel-Edge-Cache schwer einstellbar |

**Begründung:** Industrie-Standard (Intercom, Crisp, HubSpot,
Zendesk Chat) nutzen alle Variante A. Der 50ms-Fetch beim ersten
Klick ist nicht wahrnehmbar, weil er parallel zum iframe-Mount
läuft. Für Marketing-Seiten, wo die meisten Besucher nie klicken,
bedeutet A außerdem null Zusatzlast — der `/api/widget/config`
wird nur bei echter Interaktion ausgelöst.

**Aufgegeben:** Feinste Ladezeit-Optimierung bei Sub-50ms-
Click-to-Open-Latenz. Akzeptiert, weil (a) nicht wahrnehmbar,
(b) kein Pilot-Kunde das jemals messen wird, (c) CDN-Cache und
Dashboard-Editierbarkeit höher priorisiert.

---

## Entscheidung 2 — Premium-Standard-Icon mit optionalem Tenant-Override

**Gewählt:** Ein einzelnes hand-designtes SVG-Icon
(`public/widget-bubble-icon.svg` bzw. inline im Loader) als
Default, mit einer optionalen `bubbleIconUrl`-Override-Möglichkeit
in der Tenant-Config (`webWidgetConfig.bubbleIconUrl`).

**Icon-Design:** Asymmetrische Sprechblase mit drei gradierenden
Dots (100%, 75%, 50% Opacity) — liest sich als "Konversation im
Gang", ist distinkt genug um nicht nach Bootstrap/Cookie-Cutter
auszusehen, und funktioniert in jeder Tenant-Farbe weil die
Füllung über `currentColor` an die Button-Farbe gebunden ist.

**Alternativen erwogen:**

| Alternative | Pro | Contra |
|---|---|---|
| **A — Fester Standard, kein Override** | Konsistente Brand-Erfahrung über alle Pilot-Kunden | Enterprise-Kunden wollen ihr eigenes Icon |
| **B — Frei wählbares SVG per Upload** | Vollständig flexibel | Aufwändige Upload-Pipeline, XSS-Risiko bei freiem SVG |
| **C — Standard + URL-Override (gewählt)** | Premium-Default out-of-the-box, Enterprise-Override ohne Upload-Infrastruktur, keine XSS-Surface | Kunde muss das Icon irgendwo sonst hosten |

**Begründung:** Premium-Default schafft Konsistenz und erspart
jedem Pilot-Kunden die Design-Diskussion. Der URL-basierte Override
ist pragmatisch — Bilder werden als `<img src="...">` geladen,
kein SVG-Injection, keine XSS-Surface. Kunden, die ihr eigenes
Icon wollen, können es auf ihrem eigenen CDN oder einem Asset-Host
ablegen.

**Validierung:** `bubbleIconUrl` durchläuft denselben defensiven
`parseLogoUrl`-Check wie das bestehende `logoUrl`-Feld — nur
`https://`, `http://` oder same-origin-Pfade (`/...`) werden
akzeptiert, alles andere fällt auf `null` zurück (→ Standard-Icon).

**Aufgegeben:** Freie SVG-Upload-Pipeline (für Phase 6 oder
später, wenn ein Pilot-Kunde es explizit fordert — `BACKLOG`).

---

## Entscheidung 3 — Bubble morpht zum X-Button beim Öffnen

**Gewählt:** Die Bubble-Form (runder Button) bleibt erhalten,
nur das innere Icon wechselt via CSS-Transition von "Sprechblase
mit Dots" zu einem "X". Die runde Shape bleibt stabil, die
Morph-Animation betrifft nur das Icon (300ms, `cubic-bezier(.4,0,.2,1)`,
Rotation + Scale + Opacity).

**Alternativen erwogen:**

| Alternative | Pro | Contra |
|---|---|---|
| **A — Form-Morph (Kreis → X-Shape)** | Spektakulärer visueller Effekt | Aufwendige SVG-Path-Interpolation, erfordert Libraries wie `flubber` oder handgezeichnete Zwischenframes, hohe CPU-Last auf Mobile |
| **B — Icon-in-Bubble-Transition (gewählt)** | Smooth 300ms-Animation rein in CSS, null JS-Animation-Logik, funktioniert auf allen Browsern, trifft Premium-Erwartung | Weniger spektakulär als echter Form-Morph |
| **C — Kein Animation, harter Switch** | Trivial einfach | Fühlt sich billig an, widerspricht Regel 4 (Premium-Look) |

**Begründung:** Industrie-Standard (Intercom, Crisp, HubSpot)
nutzt Variante B. Die CSS-only-Lösung ist performant, wartbar
und vermittelt Premium-Feel ohne übertriebenen Show-Off. Variante A
wäre Eyecandy-Luxus, der auf echten Kunden-Seiten weder bemerkt
noch positiv bewertet würde.

**Technik:** Zwei SVG-Icons im selben Container, absolut
positioniert. Im geschlossenen Zustand:
`icon-bubble { opacity: 1; transform: rotate(0) scale(1); }`
und `icon-close { opacity: 0; transform: rotate(-90deg) scale(0.7); }`.
Im offenen Zustand (`.bubble.open`): umgekehrt. Gemeinsame
300ms-Transition sorgt für den Morph-Effekt.

**Aufgegeben:** Echter Shape-Morph. Akzeptiert, weil die
wahrgenommene Qualität gleichwertig ist und die Implementierung
10× einfacher.

---

## Trade-offs zusammengefasst

| Was aufgegeben | Warum |
|---|---|
| Sub-50ms First-Click-Latenz | Nicht wahrnehmbar, Industrie-Standard so |
| Freie SVG-Upload-Pipeline | Phase 6+ falls Kunde es fordert, XSS-Surface vermeiden |
| Echter Shape-Morph (Kreis ↔ X-Pfad) | Library-Abhängigkeit und CPU-Last nicht gerechtfertigt |
| Build-Step für `widget.js` | Vanilla JS bleibt les- und debugbar, kein Versioning-Bruch |
| Pro-Tenant-generiertes JS | Verliert CDN-Cache-Effizienz, Redeploy-Pflicht bei Config-Änderung |

## Reversibilität

| Aspekt | Reversibilität |
|---|---|
| Hybrid-Architektur | **Two-Way** — `widget.js` durch Build-pipeline ersetzbar ohne API-Break |
| Standard-Icon + Override | **Two-Way** — `bubbleIconUrl` Feld kann jederzeit entfernt oder zum Pflicht-Feld werden |
| Morph-Animation | **Two-Way** — rein CSS, trivial zu tauschen |

Keine One-Way-Door-Entscheidungen. Alle drei sind später
anpassbar ohne Breaking Change am Endprodukt für Pilot-Kunden.

## Folgen für Regel 2 (Konsumenten-Audit)

Erweiterung von `ResolvedTenantConfig` um ein 11. Feld
(`bubbleIconUrl: string | null`). Audit-Ergebnis (vor der
Implementierung durchgeführt):

- `src/lib/widget/publicKey.ts` — Interface, `DEFAULT_CONFIG`,
  `parseConfig` erweitern
- `src/app/api/widget/config/route.ts` — JSON-Response um Feld
  erweitern
- `src/app/embed/widget/page.tsx` + `ChatClient.tsx` importieren
  das Interface, nutzen aber nur existierende Felder — kein Change
- Alle `src/generated/prisma/*`-Treffer sind auto-generierter
  Code, nicht betroffen

Neue Konsumenten-Seite: `public/widget.js` liest `bubbleIconUrl`
aus dem Config-Response und behandelt `null` explizit (Fallback
auf inline-SVG-Standard).

## Akzeptierte Browser-Warnung: Sandbox-Eskalations-Hinweis

Chrome DevTools warnt im Console-Log beim Oeffnen des Widgets:

> An iframe which has both `allow-scripts` and `allow-same-origin`
> for its sandbox attribute can escape its sandboxing.

**Das ist keine Regression, sondern eine bewusste Architektur-
Entscheidung** und spec-konform gemaess
`WEB_WIDGET_INTEGRATION.md` Phase 5. Die Warnung steht
ausdruecklich so in der Chrome-Dokumentation, wird aber in
unserem Setup durch das folgende Szenario entkraeftet:

### Warum beide Flags noetig sind

- **`allow-scripts`** — Ohne diesen Flag kann das Widget-iframe
  kein JavaScript ausfuehren, d.h. `ChatClient.tsx` waere tot.
  Nicht verhandelbar.
- **`allow-same-origin`** — Wird fuer Cookie- und Storage-Zugriff
  in der eigenen Origin (`ai-conversion.ai`) gebraucht. Die
  Widget-Session benoetigt Zugriff auf eigene Origin-
  Ressourcen (Session-Token-Persistenz innerhalb des iframes,
  polling gegen den eigenen API-Endpoint). Ohne diesen Flag
  muesste der Session-State ueber `postMessage` ans Parent-
  Dokument gereicht und dort verwaltet werden — das wuerde
  den Datenfluss invertieren und die iframe-Isolation
  paradoxerweise schwaechen.

### Warum die Chrome-Warnung hier nicht greift

Die dokumentierte Eskalations-Gefahr setzt voraus, dass das
iframe und das umgebende Dokument **derselben Origin** angehoeren
und das iframe damit per `window.parent` auf das umgebende
Dokument zugreifen kann. In unserem Szenario ist die Kunden-
Webseite (parent) eine **fremde Origin**, das iframe
(`ai-conversion.ai/embed/widget`) eine **andere Origin** — der
Browser blockiert Cross-Origin-Zugriffe ohne `allow-same-origin`
fuer den Parent-Frame selbst dann, wenn das Child-iframe den
Flag traegt. Die `allow-same-origin`-Berechtigung gilt
ausschliesslich **innerhalb** der iframe-Origin
(`ai-conversion.ai`), nicht zum Parent.

### Sandbox-Kombination laut Spec

```html
<iframe sandbox="allow-scripts allow-same-origin allow-forms" ...>
```

Das sind exakt die drei Flags, die
`WEB_WIDGET_INTEGRATION.md` Phase 5 spezifiziert. Andere
Sandbox-Permissions (`allow-popups`, `allow-top-navigation`,
`allow-modals`, `allow-pointer-lock`) sind explizit **nicht**
gesetzt und bleiben es auch nicht.

### Status

- **Kein Tech-Debt-Eintrag** (keine Schuld, keine offene Arbeit)
- **Kein Code-Fix noetig** — die Warnung ist informational, nicht
  blockierend
- **Review-Trigger**: Falls Chrome in einer zukuenftigen Version
  die Warnung zu einem Error hochstuft oder die Semantik von
  `allow-same-origin` aendert, diese Sektion neu bewerten

---

## CSP-Hotfix (Option D) — 2026-04-12

**Status:** Umgesetzt im unmittelbar folgenden Commit
`fix(middleware): add route-specific CSP for widget demo page`.

### Problem

Nach der ersten Phase-5-Integration (`705007b`) stellte sich
beim lokalen Test heraus, dass `public/widget-demo.html` die
`widget.js`-Datei nicht laden konnte. Browser-Console zeigte
CSP-Violation:

> Refused to load the script 'http://localhost:3000/widget.js'
> because it violates the following Content Security Policy
> directive: "script-src 'self' 'nonce-...' 'strict-dynamic'
> 'unsafe-eval'".

### Root-Cause-Analyse (Regel 3)

Die Middleware setzt auf **allen** von Next.js servierten Routen
einen strikten CSP-Header mit `'strict-dynamic'`. Per CSP Level 3
Spezifikation bewirkt `'strict-dynamic'`, dass `'self'`, Whitelist-
URLs und Hash-Quellen fuer externe `<script src="...">`-Tags
ignoriert werden — nur Scripts mit gueltigem Nonce (oder transitiv
durch einen nonced Script geladen) sind erlaubt.

`public/widget-demo.html` ist eine **statische Datei** und
durchlaeuft kein SSR, sodass Next.js keinen Nonce in den
`<script src="/widget.js">`-Tag injizieren kann. Ergebnis:
blockiert.

Die zunaechst gleichartig formulierte Sorge "Pilot-Kunden mit
strikten CSPs werden dasselbe Problem haben" ist **keine gueltige
Generalisierung dieses Fehlers**: Pilot-Kunden-Seiten liegen auf
Kunden-Servern und unterliegen Kunden-CSPs — unsere Middleware
sieht diese Seiten nicht. Deren CSP-Allowlist ist eine
Doku-Aufgabe (Integration-Guide), nicht ein Middleware-Fix auf
unserer Seite. Siehe `docs/tech-debt.md` -> "Pilot-Kunden-
Integration-Guide".

### Drei Optionen, drei Verwerfungen

| Option | Kern | Verdict |
|---|---|---|
| **A** — `/widget.js` von CSP ausnehmen | Antwort-Header auf `widget.js` loeschen | Falsches Ziel: blockierende CSP liegt auf der ladenden HTML-Seite, nicht auf dem geladenen Script |
| **B** — Spezielle CSP auf `/widget.js`-Response | Identisches Problem wie A | Gleiche Fehlframierung |
| **C** — Hash-basierte Allowlist fuer `widget.js` | SHA-256 zu `script-src` hinzufuegen | Inkompatibel mit `'strict-dynamic'`: Hashes greifen dort nur fuer Inline-Scripts, nicht fuer externe `<script src>` |

### Gewaehlte Option D — Route-spezifische CSP ohne `'strict-dynamic'`

Die Middleware bekommt eine neue Route-Check-Funktion
`isDemoRoute(pathname)`, analog zur bestehenden `isWidgetRoute`.
Auf Demo-Routen baut `buildCspHeader` den `script-src` **ohne
`'strict-dynamic'`** — `'self'` wird dadurch wieder wirksam und
der Widget-Loader kann geladen werden.

**Pro:**
- Minimal-invasive Aenderung, ~15 LOC in einer Datei
- Keine Security-Degradation auf Dashboard, Admin, Marketing,
  `/embed/widget` — dort bleibt `'strict-dynamic'`
- Konsistent mit bestehendem Pattern (`frame-ancestors` ist
  bereits route-spezifisch fuer Widget-Routen)
- Keine Datei-Verschiebung, `public/widget-demo.html` unveraendert
- Demo-Seite enthaelt keine User-Daten, keine Auth, keinen
  sensitiven Endpoint — das Lockern hier ist risiko-minimal

**Contra:**
- Weiterer Route-Fork im CSP-Aufbau (geringe mentale
  Komplexitaet)

### Alternative Option E (verworfen)

Demo-Seite als Next.js Server Component nach
`src/app/widget-demo/page.tsx` migrieren und den Nonce per
`headers().get('x-nonce')` injizieren. Technisch sauberer, aber:

- Erfordert Route-Group mit eigener `layout.tsx` fuer
  Atelier-Hoffmann-Branding
- ~300 Zeilen JSX-Port der HTML-Struktur
- 5-10x mehr Aenderungsflaeche fuer eine reine Demo-Seite

Nicht gewaehlt, weil Aufwand/Wert-Verhaeltnis schlecht. Falls
die Demo-Seite jemals dynamische Inhalte braucht (Live-Config-
Preview, A/B-Test-Vorschau), wird Option E zum dann noetigen
Refactor — siehe `docs/tech-debt.md` -> "Demo-Route-CSP-Lockerung".

### Betroffene Zeilen

- `src/middleware.ts`:
  - Neue Funktion `isDemoRoute(pathname)` direkt nach `isWidgetRoute`
  - `buildCspHeader(nonce, widgetRoute, demoRoute)` — dritter Parameter
  - `scriptSrc`-Branch: demoRoute=true entfernt `'strict-dynamic'`
  - `applySecurityHeaders` reicht `demoRoute` durch
  - Kommentarblock ueber `buildCspHeader` um Demo-Route-Hinweis
    ergaenzt

Nicht angefasst: `public/widget.js`, `public/widget-demo.html`,
`src/app/embed/widget/*`, alle anderen Routen.

### Verifikations-Ergebnis

`npx next build` gruen. Live-Curl-Tests gegen lokalen Dev-Server
(NODE_ENV=development):

| Route | `strict-dynamic`? | `frame-ancestors` | Erwartung | Ergebnis |
|---|---|---|---|---|
| `/widget-demo.html` | abwesend | `'none'` | gelockert, keine Widget-Route | OK |
| `/dashboard` | vorhanden | `'none'` | Regression: unveraendert | OK |
| `/api/widget/config` | vorhanden | `*` | Widget-Route-Verhalten erhalten | OK |

Browser-Test: Demo-Seite laedt, DevTools-Console sauber (bis
auf die bereits dokumentierte Sandbox-Warnung), Widget-Bubble
mit soliden Dots erscheint. Vom Project Owner manuell
verifiziert vor Commit.
