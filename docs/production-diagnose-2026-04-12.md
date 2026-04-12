# Production-Diagnose 12.04.2026

## Zusammenfassung

Die Production-Version auf `ai-conversion.ai` ist deutlich aelter als der lokale
Code (20 Commits nicht gepusht, aber selbst der gepushte Stand `origin/master`
scheint nicht das aktive Vercel-Deployment zu sein). Von den 4 Better-Stack-
Monitoren ist nur die Root-Domain (`/`) tatsaechlich funktional. Die drei "roten"
Monitore sind korrekt rot — aber aus unterschiedlichen Gruenden.

## Git- und Deployment-Stand

| Dimension | Wert |
|---|---|
| Lokaler HEAD | `1980034` (test(phase-7): complete pilot-ready state) |
| origin/master | `dfeb349` (docs: status update after architecture.md created) |
| Commits ahead | **20** (lokal nicht gepusht) |
| Letzter Push | 2026-04-11 13:45 Uhr (gestern) |
| Production-CSP | `script-src 'self' 'unsafe-inline'` (alte Version ohne Nonce) |
| Lokale CSP | Nonce-basiert mit `strict-dynamic` (seit Commit `2087f4f`) |
| Vercel Deployment-ID | `dpl_9x2BU3B2BxgkbgYNipdd8uCCTmut` |

**Kern-Erkenntnis:** Die Production-CSP (`unsafe-inline` ohne Nonce) stammt aus
einem Deployment das AELTER ist als Commit `2087f4f` (CSP-Nonce-Fix). Dieser
Commit ist in `origin/master` enthalten, wurde also gepusht — aber Vercel hat
offenbar seitdem keinen neuen Production-Build ausgefuehrt, oder der Build ist
fehlgeschlagen.

**Moegliche Ursachen:**
1. Vercel Auto-Deploy ist deaktiviert oder auf eine andere Branch konfiguriert
2. Der letzte Vercel-Build ist fehlgeschlagen (z.B. wegen fehlender Env-Vars
   fuer neue Dependencies)
3. Vercel hat einen aelteren Production-Deployment-Stand "gepinnt"

**Empfehlung:** Im Vercel-Dashboard pruefen:
- Welcher Commit ist das aktive Production-Deployment?
- Gibt es fehlgeschlagene Builds nach dem letzten erfolgreichen?
- Ist Auto-Deploy fuer `master` aktiviert?

## Route-Existenz lokal

| Route | Datei | In origin/master | Handler |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Ja | default export (Server Component) |
| `/widget.js` | `public/widget.js` | **Nein** (erst ab Commit `705007b`, Phase 5) | Statische Datei |
| `/dashboard` | `src/app/dashboard/page.tsx` | Ja | default export (Client Component) |
| `/api/widget/config` | `src/app/api/widget/config/route.ts` | Ja (seit `3e1ac2d`) | GET export |

**widget.js ist der einzige Monitor-Endpunkt der definitiv NICHT in origin/master
existiert.** Er wurde in Phase 5 (Commit `705007b`) hinzugefuegt, der zu den 20
nicht-gepushten Commits gehoert.

## Production-HTTP-Status

| URL | Status | Content-Type | Interpretation |
|---|---|---|---|
| `https://ai-conversion.ai/` | **200** | text/html | OK — Landing-Page funktioniert |
| `https://ai-conversion.ai/widget.js` | **404** | text/html (Next.js 404-Seite) | **Erwartet:** Datei existiert nicht in Production (erst Phase 5, nicht gepusht) |
| `https://ai-conversion.ai/dashboard` | **307** → `/dashboard/login` | text/plain | **False Positive:** Auth-Redirect ist korrekt. Dashboard existiert, ist aber auth-geschuetzt |
| `https://ai-conversion.ai/api/widget/config?key=pub_OQ5vM7rpiwTgwik0` | **404** | text/html (Next.js 404-Seite) | **Unerwartet:** Route existiert in origin/master, sollte in Production funktionieren. Deployment-Stand aelter als erwartet |

### Detail: /api/widget/config 404

Die Route `src/app/api/widget/config/route.ts` ist seit Commit `3e1ac2d` in
`origin/master` enthalten. Trotzdem liefert Production 404.

Die 404-Response ist eine Next.js-generierte HTML-Seite (nicht JSON), was
bedeutet dass der Next.js-Router die Route nicht kennt — sie existiert nicht
im Production-Build-Manifest. Das bestaetigt die Hypothese, dass das aktive
Vercel-Deployment von einem Commit VOR `3e1ac2d` stammt.

Zusaetzlicher Beleg: Die Production-CSP ist `script-src 'self' 'unsafe-inline'`
(pre-Nonce), was auf einen Deployment-Stand vor Commit `2087f4f` hindeutet.

## Public-Key-Stand

Der Public Key `pub_OQ5vM7rpiwTgwik0` gehoert zum Tenant `internal-admin` in
der lokalen Entwicklungs-DB.

| Frage | Antwort |
|---|---|
| `.env.production` vorhanden? | **Nein** — Datei existiert nicht |
| `.env.production.local` vorhanden? | **Nein** |
| Separate Production-DB? | **Unbekannt** — Vercel-Env-Vars nicht einsehbar von lokal. Vermutlich dieselbe Neon-DB (Prisma Postgres Frankfurt), aber moeglicherweise ein anderer Neon-Branch (main vs. dev) |
| Public Key in Production-DB? | **Nicht pruefbar** ohne Production-DB-Zugriff. Falls Vercel auf denselben Neon-Branch zeigt wie `.env.local`, existiert der Key. Falls ein separater Branch: wahrscheinlich nicht |

**Empfehlung:** Im Vercel-Dashboard die `DATABASE_URL` Env-Var pruefen.
Falls sie auf denselben Neon-Endpoint zeigt wie lokal, ist der Key vorhanden.
Falls nicht, muss `generate-widget-keys.ts` gegen die Production-DB laufen.

## Auth-Schutz /dashboard

Die Middleware (`src/middleware.ts`) schuetzt alle `/dashboard`-Routen:

```
Zeile 170-182:
if (!dashboardToken) {
  // API: 401
  // Page: 307 Redirect → /dashboard/login
}
```

**Production-Verifikation:** `curl -I https://ai-conversion.ai/dashboard`
liefert `307 Temporary Redirect` zu `https://ai-conversion.ai/dashboard/login`.

Das ist **korrektes Verhalten** — ein anonymer Request SOLL redirected werden.
Better Stack interpretiert den 307 als "Down", was ein **False Positive** ist.

## Empfehlung fuer Better Stack

| Monitor | Status | Aktion |
|---|---|---|
| `https://ai-conversion.ai/` | **Gruen (200)** | AKTIV lassen |
| `https://ai-conversion.ai/widget.js` | **Rot (404)** | **PAUSIEREN** — existiert erst nach Deploy der 20 lokalen Commits. Nach Deploy reaktivieren |
| `https://ai-conversion.ai/dashboard` | **Rot (307)** | **ANPASSEN** — URL auf `https://ai-conversion.ai/dashboard/login` aendern, oder Keyword-Check auf den Login-Page-Inhalt. 307-Redirect ist korrektes Auth-Verhalten, kein Ausfall |
| `https://ai-conversion.ai/api/widget/config?key=pub_OQ5vM7rpiwTgwik0` | **Rot (404)** | **PAUSIEREN** — Route existiert im Code, aber das aktive Production-Deployment ist aelter. Nach Deploy reaktivieren. Zusaetzlich: Public Key muss in Production-DB existieren |

### Alternativ fuer /dashboard

Statt den Monitor umzukonfigurieren, kann Better Stack auf HTTP-Statuscodes
konfiguriert werden:
- Erwarteter Status: **307** (statt default 200)
- Oder: Monitor auf `/dashboard/login` zeigen, dort wird 200 erwartet

## Empfehlung fuer Production-Deployment

**Prioritaet: HOCH**

Die Production-Version ist massiv veraltet — wahrscheinlich ~30+ Commits hinter
`origin/master`, und `origin/master` ist selbst 20 Commits hinter dem lokalen
Stand. Insgesamt fehlen in Production:

- Phase 5 (Embed-Script)
- Phase 6 (Dashboard Widget-Settings, Conversations-List, Settings-Sidebar)
- Phase 7 (Testing, Mobile-Fixes, Integration-Guide)
- Plus CSP-Nonce-Fix, Rate-Limit-Korrektur, und diverse Bug-Fixes

### Vorgeschlagener naechster Schritt fuer Philipp

1. **git push origin master** — bringt die 20 lokalen Commits auf GitHub
2. **Vercel-Dashboard pruefen:**
   - Ist Auto-Deploy fuer `master` aktiv?
   - Gibt es fehlgeschlagene Builds?
   - Welcher Commit ist das aktive Production-Deployment?
3. **Falls Auto-Deploy aktiv:** Push loest automatisch neuen Build aus
4. **Falls Auto-Deploy inaktiv:** Manuellen Deploy triggern
5. **Nach erfolgreichem Deploy:**
   - Better-Stack-Monitore reaktivieren
   - `/dashboard`-Monitor auf `/dashboard/login` umstellen (oder 307 als OK akzeptieren)
   - Pruefen ob `DATABASE_URL` in Vercel auf die richtige DB zeigt
   - `pub_OQ5vM7rpiwTgwik0` gegen Production-DB verifizieren
6. **Vercel Env-Vars pruefen:** Alle neuen Env-Vars die seit dem letzten Deploy
   hinzugekommen sind muessen in Vercel gesetzt sein (insbesondere falls
   neue Dependencies wie Upstash-Redis fuer Rate-Limiting hinzukamen)
