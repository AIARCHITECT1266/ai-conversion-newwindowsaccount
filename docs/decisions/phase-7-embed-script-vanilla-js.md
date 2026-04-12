# ADR Phase 7 — Embed-Script als Vanilla JS statt Build-Pipeline

**Datum:** 2026-04-12
**Status:** Entschieden
**Owner:** Project Owner
**Betroffene Dateien:**
- `public/widget.js` (12.5 KB, Vanilla JS)

---

## Kontext

`WEB_WIDGET_INTEGRATION.md` Phase 7 "Build-Check vor Go-Live"
listet zwei Build-Befehle:

```bash
npx next build
cd widget-embed && npm run build
```

Das Verzeichnis `widget-embed/` existiert nicht und hat nie
existiert. Die Spec-Referenz stammt aus einem frueheren
Architektur-Entwurf, der eine separate Rollup/Webpack-Build-
Pipeline fuer das Embed-Script vorsah.

In Phase 5 (Commit `705007b`) wurde das Embed-Script als
**Vanilla-JS-Datei** direkt in `public/widget.js` geschrieben.
Dieser ADR dokumentiert retroaktiv die Entscheidung und
klaert die Spec-Diskrepanz.

---

## Entscheidung

**Das Embed-Script bleibt eine einzelne Vanilla-JS-Datei in
`public/widget.js` ohne separaten Build-Schritt.**

Der Build-Check fuer Phase 7 reduziert sich auf:

```bash
npx next build
```

Der zweite Befehl (`cd widget-embed && npm run build`) entfaellt.

---

## Begruendung

### Warum Vanilla JS statt Build-Pipeline

| Kriterium | Build-Pipeline (Rollup/Webpack) | Vanilla JS (gewaehlt) |
|---|---|---|
| **Dateigroesse** | ~10-12 KB (nach Tree-Shaking) | 12.5 KB (ohne Build, handoptimiert) |
| **Dependencies** | Rollup + Plugins oder Webpack als devDep | Null |
| **Build-Schritt** | Ja, muss bei jeder Aenderung laufen | Nein, Datei ist direkt deploybar |
| **Debugging** | Source-Maps noetig | Klartext-JS, direkt lesbar in Browser-DevTools |
| **Wartung** | Build-Config muss gepflegt werden | Keine Build-Config |
| **CDN-Caching** | Identisch (statische Datei in `public/`) | Identisch |
| **TypeScript** | Moeglich (Transpilation) | Nicht noetig (Loader hat ~250 LOC, keine komplexe Logik) |

### Warum eine Build-Pipeline overengineered waere

1. **Kein Tree-Shaking-Bedarf:** `widget.js` hat null externe
   Dependencies — es gibt nichts zu shaken
2. **Keine NPM-Imports:** Der Loader nutzt ausschliesslich
   Browser-APIs (`document.createElement`, `fetch`,
   `shadowRoot.attachShadow`)
3. **Keine Transpilation noetig:** Der Code nutzt nur ES5-
   kompatible Syntax (var, function, keine Arrow-Functions
   im oeffentlichen Scope), laeuft in allen Target-Browsern
4. **12.5 KB ist unter dem Spec-Limit** von 15 KB —
   eine Build-Pipeline wuerde maximal 2-3 KB sparen, das
   rechtfertigt keine zusaetzliche Tooling-Komplexität
5. **Industrie-Praezedenz:** Intercom, Crisp und Drift
   liefern ihre Loader ebenfalls als statische JS-Dateien
   ohne sichtbaren Build-Schritt aus

### Warum die Spec einen Build-Schritt vorsah

Der urspruengliche Spec-Entwurf entstand VOR der Phase-5-
Implementierung. Zu dem Zeitpunkt war unklar, ob das
Embed-Script NPM-Dependencies (z.B. einen Polyfill fuer
`ShadowDOM`, einen Markdown-Parser fuer Bot-Nachrichten)
brauchen wuerde. Phase 5 hat gezeigt: nein, der Loader
ist zu simpel fuer einen Build-Schritt.

---

## Spec-Bezug (CLAUDE.md Regel 5)

Abweichung von `WEB_WIDGET_INTEGRATION.md` Phase 7
"Build-Check vor Go-Live": der Befehl
`cd widget-embed && npm run build` ist gegenstandslos,
weil `widget-embed/` nicht existiert.

Begruendung: Das Embed-Script wurde in Phase 5 als
Vanilla-JS-Datei implementiert (12.5 KB, null Dependencies).
Eine separate Build-Pipeline waere overengineered fuer einen
~250-LOC-Loader ohne externe Imports. Die Spec-Referenz
stammt aus einem frueheren Architektur-Entwurf, der eine
Build-Pipeline antizipierte, die sich als unnoetig
herausstellte. Siehe Abschnitt "Begruendung" oben.

---

## Reversibilitaet

**Two-Way-Door.** Falls `widget.js` in Zukunft NPM-
Dependencies braucht (z.B. Markdown-Parser, i18n-Library),
kann jederzeit ein `widget-embed/`-Verzeichnis mit einer
Rollup/Vite-Config aufgesetzt werden, das nach
`public/widget.js` baut. Die oeffentliche URL und das
Embed-Snippet bleiben identisch — der Change ist fuer
Pilot-Kunden unsichtbar.
