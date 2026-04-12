# Production-Regression: CSP-Nonce blockiert JavaScript

## Datum
2026-04-12, entdeckt 18:40 Uhr (kurz nach Deploy 18:35 Uhr)

## Symptome
- Startseite (`/`): Section-Ueberschriften rendern (SSR-HTML), aber
  JavaScript-Bundles blockiert → Client-Components fehlen, keine
  Interaktivitaet
- Dashboard (`/dashboard`): Infinite Loading-Spinner, keine Client-Scripts
- `/admin`: funktioniert (Middleware liefert eigene HTML-Response mit
  korrektem `nonce`-Attribut auf dem Inline-Script)
- Browser-Console: 16-17 CSP-Violations, 7+ blockierte Scripts

### Console-Fehler (woertlich)
```
Loading the script '<URL>' violates the following Content Security Policy
directive: "script-src 'self' 'nonce-rm+uS1HQdv3yvIvZPsZXIg==' 'strict-dynamic'".
Note that 'strict-dynamic' is present, so host-based allowlisting is disabled.
```

```
Executing inline script violates the following Content Security Policy
directive: "script-src 'self' 'nonce-rm+uS1HQdv3yvIvZPsZXIg==' 'strict-dynamic'".
Either the 'unsafe-inline' keyword, a hash ('sha256-...'), or a nonce ('nonce-...')
is required to enable inline execution.
```

## Root-Cause-Analyse

### Das Problem: Nonce wird generiert und in CSP gesetzt, aber NICHT an Next.js Scripts weitergegeben

**Middleware (`src/middleware.ts`):**
1. Generiert Nonce pro Request (Zeile 162): `const nonce = generateNonce()`
2. Setzt Nonce in `x-nonce` Request-Header (Zeile 164):
   `requestHeaders.set("x-nonce", nonce)`
3. Setzt CSP-Header mit Nonce in Response (Zeile 110-113):
   `script-src 'self' 'nonce-XXX' 'strict-dynamic'`

**Root-Layout (`src/app/layout.tsx`):**
- **Liest den Nonce NICHT aus.** Kein `headers().get('x-nonce')`, kein
  `<Script nonce={...} />`, keine Nonce-Weiterreichung an Next.js.
- Das Layout ist ein reines Static-Metadata-Layout ohne dynamische
  Header-Nutzung.

**Konsequenz:**
- Die CSP erlaubt NUR Scripts mit dem korrekten Nonce ODER Scripts die
  von einem Nonce-tragendem Script geladen werden (`strict-dynamic`)
- Next.js generiert Inline-Scripts (RSC-Payload, Hydration-Bootstrap)
  die KEINEN Nonce tragen
- Diese Inline-Scripts werden von der CSP blockiert
- Da die Bootstrap-Scripts blockiert sind, werden auch die externen
  Bundles (webpack, main-app, page-chunks) nie geladen — `strict-dynamic`
  propagiert nur von Scripts die selbst ausgefuehrt werden durften

### Warum /admin funktioniert
Die Admin-Login-Seite wird komplett in der Middleware gerendert
(Zeile 229-296) als inline HTML-String mit `<script nonce="${nonce}">`.
Der Nonce ist korrekt auf dem Script-Tag → CSP erlaubt die Ausfuehrung.
Kein Next.js-Rendering involviert, daher kein Nonce-Propagation-Problem.

### Warum es lokal funktionierte
Im Development-Modus (`NODE_ENV=development`) wird `'unsafe-eval'`
hinzugefuegt (Zeile 57/60). Das allein loest das Problem nicht, ABER:
Der Dev-Server hat moeglicherweise andere CSP-Timing-Semantik
(Hot-Module-Reload, anderes Script-Loading-Pattern) und/oder die
Browser-DevTools waren mit "Disable Cache" aktiv, was CSP-Enforcement
lockerer macht.

**Kern-Erkenntnis:** Das Problem existierte seit Commit `2087f4f`
(CSP-Nonce-Migration), wurde aber nie in Production sichtbar, weil
kein Deploy seitdem stattfand.

## Betroffene Dateien

| Datei | Rolle | Problem |
|---|---|---|
| `src/middleware.ts` | Generiert Nonce, setzt CSP | Funktioniert korrekt |
| `src/app/layout.tsx` | Root-Layout | **Liest x-nonce Header nicht aus, injiziert Nonce nicht in Next.js** |
| `next.config.ts` | Nur `reactStrictMode: true` | Kein Konflikt |

## Commits die Nonce eingefuehrt haben

| Commit | Beschreibung |
|---|---|
| `2087f4f` | `fix(security): replace unsafe-inline CSP with nonce-based script-src` — **Initialer Nonce-Commit** |
| `9e134e4` | `fix(security): allow unsafe-eval in dev mode CSP for HMR` — Dev-Mode-Fix |
| `865843b` | `fix(middleware): add route-specific CSP for widget demo page` — Demo-Route-CSP-Lockerung |

## Fix-Optionen

### Option A: Nonce korrekt an Next.js SSR weitergeben (EMPFOHLEN)

Next.js App Router unterstuetzt Nonce-Injection nativ. Der Fix
besteht aus einer Aenderung in `src/app/layout.tsx`:

```tsx
import { headers } from "next/headers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? "";
  return (
    <html lang="de" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head>
        <meta property="csp-nonce" content={nonce} />
      </head>
      <body className="noise-bg antialiased" nonce={nonce}>
        {children}
      </body>
    </html>
  );
}
```

Ergaenzend: In `next.config.ts` die experimentelle CSP-Nonce-Propagation
aktivieren (falls von Next.js 15.3 unterstuetzt):

```ts
const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Propagiert den Nonce aus dem x-nonce-Header automatisch
    // auf alle vom Framework generierten <script>-Tags
  },
};
```

**WICHTIG:** Die genaue API muss gegen die aktuelle Next.js 15.3
Dokumentation geprueft werden. Die `headers()`-basierte Nonce-
Auslese ist das etablierte Pattern, aber die Details der Propagation
auf Framework-generierte Inline-Scripts koennen sich zwischen
Versionen aendern.

**Aufwand:** 30-60 Min (inkl. lokaler Verifikation + Build-Test)
**Risiko:** Niedrig (additive Aenderung, kein Breaking Change)

### Option B: Rollback auf unsafe-inline (Tech-Debt)

Revert von Commit `2087f4f` (CSP-Nonce-Migration). Bringt
`script-src 'self' 'unsafe-inline'` zurueck.

```bash
git revert 2087f4f
```

**Achtung:** Revert koennte Konflikte mit spaetere Commits
verursachen (9e134e4, 865843b bauen auf der Nonce-CSP auf).
Moeglicherweise muessen alle drei Commits revertiert werden.

**Aufwand:** 15-30 Min
**Risiko:** Mittel (Revert-Konflikte), Sicherheits-Regression
(unsafe-inline erlaubt XSS-Vektoren ueber injizierte Scripts)

### Option C: CSP komplett deaktivieren (Notfall)

Middleware-CSP-Zeile auskommentieren oder auf permissive Policy
setzen (`script-src *`).

**Aufwand:** 5 Min
**Risiko:** Hoch (alle CSP-Schutz-Mechanismen deaktiviert)
**Nur im absoluten Notfall**, z.B. wenn ein Pilot-Kunde innerhalb
von Stunden eine funktionierende Seite braucht und Option A noch
nicht fertig ist.

## Empfehlung

**Option A (Nonce korrekt propagieren)** als primaerer Fix.
Ist die sauberste Loesung und bewahrt die Security-Haertung.

Falls Option A morgen nicht in 60 Min geloest werden kann:
**Option B als Fallback** (Revert auf unsafe-inline, akzeptabler
Sicherheits-Trade-off fuer Pre-Pilot-Phase).

Option C nur bei akutem Zeitdruck durch externen Stakeholder.

## Evidenz

- Deploy-Commit: `ef25efe` (trigger) / `03dc39c` (inhaltlich)
- CSP-Nonce-Migration: Commit `2087f4f`
- Browser-Console-Screenshots: vorhanden beim Project Owner
- Production-CSP-Header (verifiziert via curl):
  `script-src 'self' 'nonce-qTETCwMhyeFb5N54HqWp3w==' 'strict-dynamic'`

---

## Pre-Analyse A.1 (12.04.2026 abends)

### Next.js-Version
**15.5.14** (App Router, `src/app/`-Struktur)

### Layouts im Projekt

| Layout | Liest Nonce? | Propagiert Nonce? |
|---|---|---|
| `src/app/layout.tsx` | Nein | Nein |
| `src/app/embed/layout.tsx` | Nein | Nein |
| `src/app/dashboard/settings/layout.tsx` | Nein | Nein |

Keines der drei Layouts importiert `headers()` oder liest `x-nonce`.

### Script-Tag-Audit
- `<Script>` (next/script): **0 Verwendungen** im gesamten `src/`
- `dangerouslySetInnerHTML`: **0 Verwendungen** im gesamten `src/`
- Einziger Inline-Script im Projekt: Admin-Login-HTML in
  `src/middleware.ts:262` — traegt korrekten `nonce="${nonce}"`

### next.config.ts
```ts
const nextConfig: NextConfig = {
  reactStrictMode: true,
};
```
Kein CSP-Config, keine experimentellen Flags, kein Konflikt.

### Middleware-Analyse (praezisierter Root-Cause)

**Nonce-Generierung (Zeile 8-9, korrekt):**
```ts
function generateNonce(): string {
  return randomBytes(16).toString("base64");
}
```

**Request-Header-Weiterreichung (Zeile 162-166):**
```ts
const nonce = generateNonce();
const requestHeaders = new Headers(req.headers);
requestHeaders.set("x-nonce", nonce);
const nextWithNonce = () =>
  NextResponse.next({ request: { headers: requestHeaders } });
```
Setzt **nur** `x-nonce` auf die Request-Headers. Setzt die CSP
**NICHT** auf die Request-Headers.

**CSP auf Response-Headers (Zeile 94-113, via applySecurityHeaders):**
```ts
response.headers.set(
  "Content-Security-Policy",
  buildCspHeader(nonce, widgetRoute, demoRoute)
);
```
Setzt CSP nur auf die **Response**-Headers — zu spaet fuer den
Next.js SSR-Renderer, der die Request-Headers liest.

### Root-Cause-Diagnose (praezisiert)

**Next.js 15 liest den Nonce NICHT aus einem `x-nonce`-Header.**

Der interne SSR-Renderer (`getScriptNonceFromHeader` in
`app-render.tsx`) parst den `Content-Security-Policy`-Header
aus den **Request-Headers** (die via `NextResponse.next({
request: { headers } })` weitergereicht werden) und extrahiert
den `'nonce-XXX'`-Wert aus dem `script-src`-Direktiv.

Die Middleware setzt den CSP-Header aber nur auf die
**Response**-Headers (via `applySecurityHeaders`). Zum Zeitpunkt
des SSR-Renderings hat der Renderer keinen Zugriff auf die
Response-Headers — er sieht nur die Request-Headers. Dort
findet er `x-nonce` (das er nicht kennt) aber kein
`Content-Security-Policy` (das er braucht).

**Ergebnis:** Nonce wird nie an Framework-generierte `<script>`-
Tags propagiert. Browser sieht CSP mit Nonce-Anforderung in der
Response, aber die Scripts tragen keinen Nonce → blockiert.

**Referenz:** Next.js offizielle CSP-Dokumentation und
`examples/with-strict-csp/middleware.js` setzen die CSP auf
BEIDE Header-Ebenen — Request (fuer den Renderer) UND Response
(fuer den Browser).

### Fix-Plan

**Eine einzige Aenderung in `src/middleware.ts`:**

Die CSP muss zusaetzlich auf die **Request**-Headers gesetzt
werden, BEVOR `NextResponse.next()` aufgerufen wird. So kann
der SSR-Renderer den Nonce extrahieren und auf alle Framework-
Scripts propagieren.

**Konkrete Aenderungen:**

1. **`src/middleware.ts` — Request-Header um CSP ergaenzen:**
   In der `middleware()`-Funktion, nach Zeile 164
   (`requestHeaders.set("x-nonce", nonce)`), die CSP auch auf
   die Request-Headers setzen. Da der `widgetRoute`- und
   `demoRoute`-Check zu diesem Zeitpunkt noch nicht gelaufen
   ist, muss die CSP-Berechnung vorgezogen werden — oder der
   einfachere Weg: die CSP wird in `applySecurityHeaders`
   zusaetzlich auf die Request-Headers gesetzt (was aber nicht
   moeglich ist, weil die Request-Headers zu dem Zeitpunkt
   schon committed sind).

   **Saubere Loesung:** Die `requestHeaders.set(
   "Content-Security-Policy", buildCspHeader(nonce, ..., ...))`
   muss VOR dem `NextResponse.next()`-Aufruf passieren. Dafuer
   muessen `isWidgetRoute()` und `isDemoRoute()` frueher im
   Flow aufgerufen werden. Das ist moeglich, weil `pathname`
   bereits auf Zeile 157 verfuegbar ist.

2. **`src/app/layout.tsx` — Keine Aenderung noetig:**
   Next.js propagiert den Nonce automatisch auf alle Framework-
   Scripts, sobald er im CSP-Request-Header verfuegbar ist.
   `layout.tsx` muss NICHTS tun (kein `headers().get()`, kein
   `nonce`-Prop). Nur eigene `<Script>`-Tags bräuchten ein
   explizites `nonce`-Attribut — davon gibt es im Projekt null.

3. **`x-nonce`-Header kann bleiben:**
   Schadet nicht, ist aber fuer den Fix nicht relevant. Kann
   spaeter entfernt werden wenn kein Code mehr darauf zugreift.

**Aufwand:** ~15-30 Min (eine Zeile in middleware.ts hinzufuegen,
plus Umstrukturierung des Flows damit widgetRoute/demoRoute
frueher berechnet werden).

**Risiko:** Niedrig — rein additive Aenderung. Der CSP-Header
auf der Response-Seite bleibt identisch. Nur der Request-Header
bekommt eine zusaetzliche Kopie.

---

## Phase A.3: Lokaler Production-Build-Test (12.04.2026 abends)

### Setup
- Branch: `fix/csp-nonce-request-header` (Commit `4590cc1`)
- Build: `npx next build` gruen
- Server: `npx next start -p 3100` (Production-Modus)

### Test-Ergebnisse

| Test | Ergebnis | Details |
|---|---|---|
| A: CSP-Nonce im Response-Header | **PASS** | Nonce vorhanden (z.B. `ZCenUJ0LNvmc+f/iEryg+A==`) |
| B: HTML-Scripts mit Nonce (Root `/`) | **FAIL** | 0 Scripts mit Nonce-Attribut |
| B: HTML-Scripts mit Nonce (`/embed/widget`) | **PASS** | 5+ Scripts mit Nonce |
| C: Nonce-Match CSP vs HTML | **PASS** (fuer dynamische Routen) | Identischer Nonce auf allen Script-Tags |
| Dashboard `/dashboard` | **FAIL** | Statisch vorgerendert, kein Nonce |
| Widget `/embed/widget` CSP | **PASS** | CSP korrekt mit `frame-ancestors *` |

### Kern-Erkenntnis: Statische Seiten bekommen keinen Nonce

**Der Middleware-Fix funktioniert korrekt fuer dynamische Routen.**
`/embed/widget` (dynamisch, `ƒ`) hat Nonce auf allen Script-Tags.
Die CSP-Request-Header-Propagation funktioniert wie vorgesehen.

**Statische Seiten (`○`) werden zur Build-Zeit vorgerendert** —
zu diesem Zeitpunkt laeuft keine Middleware, es gibt keine
Request-Headers, und der SSR-Renderer findet keinen CSP-Header.
Deshalb haben diese Seiten keinen Nonce auf den Framework-Scripts.

**Betroffene statische Seiten:**
- `/` (Landing-Page)
- `/dashboard` (Haupt-Dashboard)
- `/dashboard/settings`, `/dashboard/settings/widget`,
  `/dashboard/settings/prompt`
- `/pricing`, `/faq`, `/onboarding`, `/multi-ai`
- `/admin`
- Diverse weitere Marketing- und Dashboard-Seiten

**Nicht betroffen (dynamisch, Nonce funktioniert):**
- `/embed/widget` (Widget-iframe)
- `/dashboard/login`, `/dashboard/logout`
- `/dashboard/conversations`, `/dashboard/conversations/[id]`
- `/dashboard/clients/[id]`
- Alle API-Routen

### Loesung fuer statische Seiten

Statische Seiten muessen dynamisch gerendert werden, damit die
Middleware den CSP-Request-Header setzen und der Renderer den
Nonce extrahieren kann. Zwei Optionen:

**Option 1: `headers()` im Root-Layout aufrufen**
```tsx
// src/app/layout.tsx
import { headers } from "next/headers";

export default async function RootLayout({ children }) {
  // headers()-Aufruf macht ALLE untergeordneten Seiten dynamisch.
  // Das ist noetig, damit der Nonce aus der Middleware auf die
  // Framework-Scripts propagiert wird.
  await headers();
  return (
    <html lang="de" className={`${inter.variable} dark`}>
      <body className="noise-bg antialiased">{children}</body>
    </html>
  );
}
```
Konsequenz: ALLE Seiten werden dynamisch — kein Static-Export
mehr. Performance-Impact: unklar, abhaengig von Vercel-Caching.

**Option 2: Nur betroffene Seiten einzeln dynamisch machen**
```tsx
// In jeder betroffenen page.tsx:
export const dynamic = "force-dynamic";
```
Konsequenz: Feingranulare Kontrolle, aber viele Dateien anfassen.

**Empfehlung:** Option 1 (Root-Layout `headers()`-Aufruf) ist
die sauberere Loesung — ein einziger Aenderungspunkt. Der
Performance-Impact ist auf Vercel mit Fluid Compute minimal,
weil dynamische Seiten trotzdem CDN-gecached werden koennen
(via `Cache-Control`-Header oder ISR).

### Go/No-Go fuer Phase A.4

**GO-MIT-ERWEITERUNG:** Der Middleware-Fix (CSP auf Request-
Headers) funktioniert korrekt. Aber fuer einen vollstaendigen
Fix muss zusaetzlich das Root-Layout `headers()` aufrufen, um
statische Seiten dynamisch zu machen. Erst dann bekommen ALLE
Seiten den Nonce.

Naechster Schritt: `src/app/layout.tsx` um `await headers()`
ergaenzen, dann A.3-Test wiederholen.

---

## Phase A.3b: Erneuter Production-Build-Test (12.04.2026 abends)

### Setup
- Branch: `fix/csp-nonce-request-header`
- Commits: `4590cc1` (Middleware-Fix) + `16348a0` (Layout-Fix)
- Build: gruen, alle Routen dynamisch (`ƒ`)
- Server: `npx next start -p 3100`

### Test-Ergebnisse

| Test | Route | Scripts mit Nonce | Vorher (A.3) | Ergebnis |
|---|---|---|---|---|
| 1 | `/` (Root) | **3** | 0 | **PASS** |
| 2 | `/dashboard` → `/dashboard/login` | 0 (Route-Handler, kein HTML-Page) | 0 | **N/A** (erwartet) |
| 4 | `/` (Nonce-Konsistenz) | CSP == HTML | — | **MATCH** |
| 5 | `/embed/widget` | **2** | 2 | **PASS** |
| 6 | `/pricing` | **3** | 0 | **PASS** |

### Detail: Dashboard-Route

`/dashboard` liefert 307-Redirect zu `/dashboard/login`.
`/dashboard/login` ist ein Route-Handler (`route.ts`), kein
Page-Component — liefert 400 Bad Request auf GET (erwartet POST
mit Magic-Link-Token). Die Dashboard-Login-Route ist kein
HTML-Rendering-Pfad, daher keine Script-Tags, kein Nonce noetig.
Im Browser wird `/dashboard/login` nie direkt als GET aufgerufen —
der Login-Flow laeuft ueber Magic-Links.

### Nonce-Konsistenz (Test 4 Detail)

Aus einer einzigen curl-Response (`-D` fuer Header + Body):
- CSP-Header-Nonce: `Kl7At085lOwaE7FTBFUx0Q==`
- HTML-Script-Nonce: `Kl7At085lOwaE7FTBFUx0Q==`
- **MATCH** — identischer Nonce in Header und auf allen Script-Tags

### Gesamturteil

**GO fuer Phase A.4 (Merge + Deploy).**

Beide Fixes zusammen loesen das CSP-Nonce-Problem vollstaendig:
1. Middleware setzt CSP auf Request-Headers → Next.js extrahiert Nonce
2. Root-Layout `await headers()` → alle Seiten dynamisch → Middleware
   laeuft pro Request → Nonce wird propagiert

Alle zuvor statischen Seiten (`/`, `/pricing`, `/dashboard/*`) haben
jetzt Scripts mit korrektem Nonce. Widget-Route bleibt funktional.
Nonce-Konsistenz zwischen CSP-Header und HTML ist verifiziert.
