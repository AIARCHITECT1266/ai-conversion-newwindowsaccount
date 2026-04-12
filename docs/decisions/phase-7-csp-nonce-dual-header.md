# ADR: CSP-Nonce Dual-Header-Propagation + Force-Dynamic Root-Layout

**Datum:** 2026-04-12
**Phase:** Phase 7 / Production-Hotfix
**Status:** Umgesetzt (Commits `4590cc1` + `16348a0`)
**Kontext:** `docs/production-regression-2026-04-12.md`

---

## Entscheidung 1: CSP auf Request- UND Response-Headers setzen

### Problem

Die Middleware generierte einen kryptographischen Nonce pro Request
und setzte den `Content-Security-Policy`-Header mit
`script-src 'self' 'nonce-XXX' 'strict-dynamic'` — aber NUR auf
die **Response**-Headers.

Next.js 15 SSR-Renderer (`getScriptNonceFromHeader` in
`app-render.tsx`) extrahiert den Nonce aus dem
`Content-Security-Policy`-Header der **Request**-Headers (die via
`NextResponse.next({ request: { headers } })` weitergereicht
werden). Da die CSP dort fehlte, fand der Renderer keinen Nonce
und konnte ihn nicht auf Framework-generierte `<script>`-Tags
(webpack, main-app, page-chunks, Hydration-Inline-Scripts)
propagieren.

Resultat in Production: Browser blockierte alle JavaScript-Bundles,
weil die CSP einen Nonce verlangte, den kein Script-Tag trug.

### Entscheidung

Die Middleware berechnet den CSP-String **einmal** und setzt ihn
auf **beide** Header-Ebenen:

1. **Request-Headers** — damit der Next.js SSR-Renderer den Nonce
   extrahieren und auf alle Framework-Scripts propagieren kann
2. **Response-Headers** — damit der Browser die CSP durchsetzt

Der CSP-String wird identisch auf beide Ebenen geschrieben, um
Header-Drift zu vermeiden.

### Alternativen (geprueft und verworfen)

- **`x-nonce`-Header allein:** Next.js kennt diesen Header nicht.
  Der Renderer liest ausschliesslich `Content-Security-Policy`.
- **`layout.tsx` liest Nonce und injiziert manuell:** Waere fuer
  eigene `<Script>`-Tags noetig, aber Next.js propagiert den
  Nonce automatisch auf Framework-Scripts — `layout.tsx` muss
  nichts tun, solange die CSP in den Request-Headers steht.

### Referenz

- Next.js Source: `getScriptNonceFromHeader` in
  `packages/next/src/server/app-render/app-render.tsx`
- Next.js Beispiel: `examples/with-strict-csp/middleware.js`
  setzt CSP auf Request-Headers

---

## Entscheidung 2: Force-Dynamic via `await headers()` im Root-Layout

### Problem

Viele Seiten (`/`, `/dashboard`, `/pricing`, `/faq`, etc.) waren
als **statisch** (`○`) konfiguriert — Next.js renderte sie zur
Build-Zeit vor. Zur Build-Zeit laeuft keine Middleware, es gibt
keine Request-Headers, und der SSR-Renderer findet keinen
CSP-Header → kein Nonce auf den Scripts.

Lokaler Production-Test (Phase A.3) zeigte:
- `/embed/widget` (dynamisch `ƒ`): 5+ Scripts mit Nonce ✅
- `/` (statisch `○`): 0 Scripts mit Nonce ❌

### Entscheidung

`src/app/layout.tsx` ruft `await headers()` auf. Dieser Aufruf
hat keinen funktionalen Rueckgabewert — er dient ausschliesslich
dazu, das Root-Layout und damit **alle untergeordneten Seiten**
als dynamisch zu markieren. Next.js rendert sie dann pro Request,
die Middleware laeuft, der Nonce wird propagiert.

### Trade-off

| Aspekt | Vorher (Static) | Nachher (Dynamic) |
|---|---|---|
| Rendering | Build-Zeit (SSG) | Pro Request (SSR) |
| CSP-Nonce | Nicht moeglich | Funktioniert |
| TTFB | ~0ms (CDN-Edge) | ~50-200ms (Vercel Fluid Compute) |
| CDN-Caching | Automatisch | Manuell via Cache-Control moeglich |
| Security | Broken (kein Nonce) | Korrekt |

**Bewertung:** Security hat Vorrang. Der TTFB-Impact ist in der
Pilot-Phase vernachlaessigbar (wenige Nutzer, Vercel Fluid
Compute recycled Instanzen). Fuer spaetere Skalierung koennen
Marketing-Seiten per `Cache-Control`-Header oder ISR mit
Revalidation-Fenstern optimiert werden.

### Alternativen (geprueft und verworfen)

- **`export const dynamic = "force-dynamic"` pro Seite:** Funktional
  aequivalent, aber erfordert Aenderungen in ~20 Page-Dateien.
  Root-Layout-Ansatz ist ein einziger Aenderungspunkt.
- **Rollback auf `unsafe-inline` (Option B):** Wuerde Static
  Generation beibehalten, aber `unsafe-inline` in `script-src`
  ist ein aktiver XSS-Vektor. Nur als Notfall-Fallback akzeptabel.
- **CSP komplett deaktivieren (Option C):** Nur im absoluten
  Notfall. Entfernt alle Script-Schutz-Mechanismen.

### Reversibilitaet

Beide Entscheidungen sind reversibel:
- Request-Header-CSP kann entfernt werden (dann kein Nonce mehr)
- `await headers()` kann entfernt werden (dann wieder Static
  Generation, aber ohne Nonce-Schutz)
- Rueckkehr zu Static Generation mit Nonce waere nur moeglich,
  wenn Next.js einen Build-Time-Nonce-Mechanismus einfuehrt
  (aktuell nicht vorhanden)

### Prozess-Lektion

Die CSP-Nonce-Migration (Commit `2087f4f`, Phase 4-pre) wurde
nie in einer echten Production-Umgebung oder lokal via
`next build && next start` verifiziert. Dev-Mode (`next dev`) ist
CSP-lax und verdeckt solche Regressionen.

**Neue Regel:** Vor jedem sicherheitsrelevanten Deploy zwingend
`next build && next start` lokal testen, und Vercel Preview-Deploys
fuer Browser-Verifikation nutzen.
