# Vercel-Deployment-Diagnose 12.04.2026

## Zusammenfassung

Der lokale Build gegen `origin/master` ist **gruen** — alle Widget-Routes
(`/api/widget/config`, `/session`, `/message`, `/poll`, `/embed/widget`)
sind im Build-Manifest enthalten. Das Problem ist NICHT ein kaputter Build,
sondern dass Vercel das aktive Production-Deployment offenbar nicht auf den
aktuellen `origin/master`-Stand aktualisiert hat. Entweder Auto-Deploy ist
deaktiviert, der Build ist auf Vercel an einer fehlenden Env-Variable
gescheitert (z.B. `UPSTASH_REDIS_*`), oder die Git-Integration zeigt auf
einen anderen Branch/Commit.

## Lokaler Build-Test gegen origin/master

| Kriterium | Ergebnis |
|---|---|
| Commit | `dfeb349` (docs: status update after architecture.md) |
| `npx next build` | **Gruen** — keine Fehler |
| Widget-Routes im Manifest | Alle 5 vorhanden: config, session, message, poll, embed/widget |
| Fehlende Routes vs. Production | `/widget.js` fehlt (erst Phase 5, nicht in origin/master) |
| Build-Zeit | Normal (~30s) |

**Erkenntnis:** origin/master baut lokal sauber. Falls Vercel denselben
Code baut, sollten die Widget-API-Routes in Production verfuegbar sein.
Das 404 in Production deutet darauf hin, dass Vercel einen AELTEREN Commit
deployed hat als `origin/master`.

## Env-Variablen-Stand

### Im Code referenzierte Variablen vs. lokal gesetzte

| Variable | Lokal (.env.local) | Kritisch fuer Build | Kritisch fuer Runtime |
|---|---|---|---|
| `DATABASE_URL` | Gesetzt | Nein (nur Runtime) | **Ja** — DB-Zugriff |
| `UPSTASH_REDIS_REST_URL` | Gesetzt | Nein | **Ja** — Rate-Limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Gesetzt | Nein | **Ja** — Rate-Limiting |
| `ANTHROPIC_API_KEY` | Gesetzt | Nein | **Ja** — Bot-Antworten |
| `OPENAI_API_KEY` | Nicht gesetzt | Nein | Ja — Lead-Scoring |
| `ENCRYPTION_KEY` | Gesetzt | Nein | **Ja** — Message-Verschluesselung |
| `ADMIN_SECRET` | Gesetzt | Nein | Ja — Admin-Login |
| `WHATSAPP_TOKEN` | Gesetzt | Nein | Ja — WhatsApp (blockiert) |
| `WHATSAPP_VERIFY_TOKEN` | Gesetzt | Nein | Ja — Webhook-Verifikation |
| `WHATSAPP_PHONE_ID` | Nicht gesetzt | Nein | Ja — WhatsApp |
| `WHATSAPP_APP_SECRET` | Nicht gesetzt | Nein | Ja — Webhook-Signatur |
| `CRON_SECRET` | Gesetzt | Nein | Ja — Cron-Job-Auth |
| `RESEND_API_KEY` | Gesetzt | Nein | Ja — E-Mail-Versand |
| `NOTION_API_KEY` | Gesetzt | Nein | Nein — nur Dev-Tooling |
| `NOTION_SESSION_DB_ID` | Gesetzt | Nein | Nein — nur Dev-Tooling |
| `PADDLE_API_KEY` | Nicht gesetzt | Nein | Ja — Checkout |
| `PADDLE_WEBHOOK_SECRET` | Nicht gesetzt | Nein | Ja — Webhook-Signatur |
| `PADDLE_ENVIRONMENT` | Nicht gesetzt | Nein | Ja — Sandbox/Prod |
| `PADDLE_PRICE_*` (9 Vars) | Nicht gesetzt | Nein | Ja — Pricing |
| `GOOGLE_AI_API_KEY` | Nicht gesetzt | Nein | Nein — optionales Feature |
| `MISTRAL_API_KEY` | Nicht gesetzt | Nein | Nein — optionales Feature |
| `XAI_API_KEY` | Nicht gesetzt | Nein | Nein — optionales Feature |
| `REPLICATE_API_KEY` | Nicht gesetzt | Nein | Nein — optionales Feature |
| `NEXT_PUBLIC_APP_URL` | Nicht gesetzt | Nein | Nein — hat Fallback |
| `NEXT_PUBLIC_CALENDLY_URL` | Nicht gesetzt | Nein | Nein — optionales Feature |
| `ENABLE_PROCESS_MESSAGE_V2` | Nicht gesetzt | Nein | Nein — Feature-Flag |
| `VERCEL_OIDC_TOKEN` | Gesetzt | Nein | Nein — Vercel-intern |

### Zusammenfassung Env-Stand

- **14 von ~30 Variablen lokal gesetzt** — ausreichend fuer den Widget-Flow
- **Keine Variable ist build-kritisch** — Next.js baut ohne Runtime-Env-Vars
- **Kritisch fuer Widget-Runtime:** `DATABASE_URL`, `UPSTASH_REDIS_*`,
  `ENCRYPTION_KEY`, `ANTHROPIC_API_KEY` muessen in Vercel gesetzt sein
- **Paddle-Vars fehlen lokal** — in Vercel vermutlich gesetzt (Billing
  funktioniert in Production)

## Git-Remote-Konfiguration

| Feld | Wert |
|---|---|
| Remote origin (fetch) | `https://github.com/AIARCHITECT1266/ai-conversion-newwindowsaccount.git` |
| Remote origin (push) | Gleich wie fetch |
| master tracks | origin |
| Branches auf origin | `origin/HEAD -> origin/master`, `origin/master` (nur einer) |
| Letzter Push | **2026-04-11 13:45:19 +0200** (gestern) |
| Commits ahead (lokal) | 20 |

## Vercel-Konfiguration

### vercel.json
- 2 Crons: `/api/cron/cleanup` (03:00 UTC), `/api/cron/followup` (09:00 UTC)
- 4 Header-Blocks: globale Security-Headers, Widget-API-Headers (ohne
  X-Frame-Options), Embed-Headers (ohne X-Frame-Options), WhatsApp-CORS
- Keine Redirects, keine Rewrites
- Kein `buildCommand`-Override, kein `framework`-Override

### next.config.ts
- Minimal: nur `reactStrictMode: true`
- Keine experimentellen Features, keine Build-Error-Ignorierung
- Kein `output: 'standalone'` oder andere spezielle Konfiguration

### .vercel/project.json
- `projectId: prj_wK7ThwrDt6cOPK3b4UygWCr98h6E`
- `orgId: team_xLTWj3ck5U8ZhcCWGKS8QtAh`
- `projectName: ai-conversion`
- Gitignored (`.vercel/` in `.gitignore`)

### package.json build-Script
```json
"build": "prisma generate && next build"
```
- `prisma generate` laeuft VOR `next build` — das ist korrekt und
  notwendig fuer den Prisma-Client
- Next.js Version: `^15.3.0`
- Prisma Version: `^7.6.0`

## Vermuteter Root Cause

**Haupthypothese: Vercel hat den letzten Push (2026-04-11) nicht deployed,
weil entweder Auto-Deploy deaktiviert ist oder der Build fehlgeschlagen
ist — vermutlich wegen fehlender `UPSTASH_REDIS_*` Env-Variablen in Vercel.**

Begruendung:
1. Der lokale Build gegen `origin/master` ist gruen — der Code ist nicht
   kaputt
2. Die Production-CSP ist `script-src 'self' 'unsafe-inline'` — das ist
   die Version VOR Commit `2087f4f` (CSP-Nonce-Fix), der in `origin/master`
   enthalten ist
3. `/api/widget/config` gibt 404 in Production, obwohl die Route in
   `origin/master` existiert und lokal sauber baut
4. Das Deployment-ID `dpl_9x2BU3B2BxgkbgYNipdd8uCCTmut` in der Production-
   Response ist stabil (mehrere Requests, gleiche ID) — es gibt kein
   neueres Deployment

**Alternative Hypothese:** Auto-Deploy ist deaktiviert worden (bewusst oder
versehentlich), und Production laeuft auf einem manuell gedeployten Stand
von vor Wochen.

**Dritte Hypothese:** Vercel's Git-Integration zeigt auf ein anderes Repo
oder einen anderen Branch als `master` von
`github.com/AIARCHITECT1266/ai-conversion-newwindowsaccount.git`.

## Empfohlene Fix-Reihenfolge

### 1. Vercel-Dashboard pruefen (5 Min)
- Im Vercel-Dashboard `ai-conversion` Projekt oeffnen
- Tab "Deployments": welcher Commit ist "Production"?
- Gibt es fehlgeschlagene Deployments nach dem letzten erfolgreichen?
- Tab "Settings > Git": ist Auto-Deploy fuer `master` aktiviert?
- Tab "Settings > Git": zeigt die Git-Integration auf das korrekte Repo?

### 2. Env-Variablen in Vercel pruefen (10 Min)
- Tab "Settings > Environment Variables"
- Pruefen ob diese Variablen fuer "Production" gesetzt sind:
  - `DATABASE_URL` (kritisch)
  - `UPSTASH_REDIS_REST_URL` (kritisch — Rate-Limiting)
  - `UPSTASH_REDIS_REST_TOKEN` (kritisch)
  - `ENCRYPTION_KEY` (kritisch — Message-Verschluesselung)
  - `ANTHROPIC_API_KEY` (kritisch — Bot-Antworten)
  - `ADMIN_SECRET` (noetig — Admin-Login)
  - `CRON_SECRET` (noetig — Cron-Jobs)
  - `OPENAI_API_KEY` (noetig — Lead-Scoring)
  - `RESEND_API_KEY` (noetig — E-Mails)

### 3. Fehlende Env-Vars setzen (falls noetig) (10 Min)
- Besonders `UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN`:
  diese wurden erst in Phase 3b eingefuehrt (Rate-Limiting) und koennten
  in Vercel fehlen
- Werte aus `.env.local` uebernehmen oder neue Upstash-Instanz fuer
  Production erstellen

### 4. Lokale Commits pushen (2 Min)
```bash
git push origin master
```
20 Commits, bringt Production auf Phase-7-Stand inkl. Widget, Dashboard-
Settings, Mobile-Fixes, Integration-Guide

### 5. Deployment verifizieren (5 Min)
- Vercel-Dashboard: neuer Build sollte automatisch starten
- Falls Auto-Deploy deaktiviert: manuell via "Redeploy" oder
  `vercel --prod` (CLI muesste installiert werden)
- Nach Deploy die 4 Better-Stack-URLs erneut pruefen:
  - `/` → 200 erwartet
  - `/widget.js` → 200 erwartet (jetzt in Code enthalten)
  - `/dashboard` → 307 erwartet (Auth-Redirect, Monitor anpassen)
  - `/api/widget/config?key=...` → 200 oder 404 erwartet (abhaengig
    davon ob der Key in der Production-DB existiert)

### 6. Production-DB-Key verifizieren (5 Min)
Falls `/api/widget/config` nach Deploy 404 liefert (Tenant nicht gefunden):
- `generate-widget-keys.ts` gegen Production-DB ausfuehren, oder
- Im Dashboard einen neuen Public Key generieren
- Dann Better-Stack-Monitor-URL mit dem Production-Key aktualisieren

## Risiken beim Fix

| Risiko | Wahrscheinlichkeit | Mitigation |
|---|---|---|
| Build scheitert auf Vercel wegen fehlender Env-Var | Mittel | Env-Vars VOR Push pruefen und setzen |
| DB-Migration-Drift (lokale Migrationen nicht in Prod) | Hoch | `prisma migrate deploy` manuell gegen Prod-DB oder in Build-Script |
| Rate-Limiter crasht weil Upstash-Vars fehlen | Hoch | Upstash-Vars als erstes in Vercel setzen |
| Landing-Page verschwindet nach Deploy | Niedrig | Rollback via Vercel "Promote to Production" auf vorheriges Deployment |
| WhatsApp-Webhook bricht | Niedrig | WhatsApp ist eh blockiert (Meta-Verifikation ausstehend) |

### Rollback-Strategie
Vercel bietet "Instant Rollback" auf jedes vorherige Deployment. Falls der
neue Deploy Probleme verursacht, kann das alte Deployment innerhalb von
Sekunden wieder als Production promotet werden.

### Prisma-Migrations-Risiko
`origin/master` enthaelt Migrations die moeglicherweise noch nicht gegen
die Production-DB gelaufen sind (Phase 2 Schema, Phase 3a.5 externalId).
Falls `prisma generate` im Build-Step laeuft aber die DB-Schema-Aenderungen
nicht applyed sind, koennen Runtime-Fehler auftreten.

**Empfehlung:** Vor dem Push pruefen ob `prisma migrate deploy` gegen die
Production-DB noetig ist. Das erfordert `DATABASE_URL` der Production-DB.
