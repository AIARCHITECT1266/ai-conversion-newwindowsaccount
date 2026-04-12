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
