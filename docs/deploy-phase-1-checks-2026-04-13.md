# Deploy-Phase 1: Pre-Deploy-Checks

Datum: 2026-04-13
Basis-Commit: `1980034` (test(phase-7): complete pilot-ready state)

## Schritt 1.1: Env-Var-Diff

### Im Code referenziert UND in Production gesetzt (OK)

| Variable | Anmerkung |
|---|---|
| `ADMIN_SECRET` | Admin-Login |
| `ANTHROPIC_API_KEY` | Bot-Antworten (Claude) |
| `CRON_SECRET` | Cron-Job-Auth |
| `DATABASE_URL` | DB-Zugriff |
| `ENCRYPTION_KEY` | AES-256-GCM Message-Verschluesselung |
| `NOTION_API_KEY` | Session-Notes (Dev-Tooling) |
| `NOTION_SESSION_DB_ID` | Session-Notes DB |
| `OPENAI_API_KEY` | Lead-Scoring (GPT-4o) |
| `PADDLE_API_KEY` | Checkout |
| `PADDLE_ENVIRONMENT` | Sandbox/Prod |
| `PADDLE_PRICE_GROWTH_MONTHLY` | Pricing |
| `PADDLE_PRICE_GROWTH_SETUP` | Pricing |
| `PADDLE_PRICE_GROWTH_YEARLY` | Pricing |
| `PADDLE_PRICE_PRO_MONTHLY` | Pricing |
| `PADDLE_PRICE_PRO_SETUP` | Pricing |
| `PADDLE_PRICE_PRO_YEARLY` | Pricing |
| `PADDLE_PRICE_STARTER_MONTHLY` | Pricing |
| `PADDLE_PRICE_STARTER_SETUP` | Pricing |
| `PADDLE_PRICE_STARTER_YEARLY` | Pricing |
| `PADDLE_WEBHOOK_SECRET` | Webhook-Signatur |
| `RESEND_API_KEY` | E-Mail-Versand |
| `UPSTASH_REDIS_REST_TOKEN` | Rate-Limiting |
| `UPSTASH_REDIS_REST_URL` | Rate-Limiting |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API |
| `WHATSAPP_VERIFY_TOKEN` | Webhook-Verifikation |

**25/25 Production-Variablen werden im Code referenziert. Kein Ueberschuss.**

### Im Code referenziert ABER NICHT in Production

| Variable | Wo referenziert | Kritikalitaet | Bewertung |
|---|---|---|---|
| `WHATSAPP_APP_SECRET` | webhook/whatsapp/route.ts:17 | Niedrig | WhatsApp blockiert (Meta-Verifikation ausstehend). Kein Impact auf Widget-Flow |
| `WHATSAPP_PHONE_ID` | modules/whatsapp/client.ts:41 | Niedrig | Gleicher Grund wie oben |
| `BANANA_API_KEY` | modules/ai-asset-studio | Keine | Optionales Feature, nicht im Hauptpfad |
| `BANANA_MODEL_KEY` | modules/ai-asset-studio | Keine | Optionales Feature |
| `GOOGLE_AI_API_KEY` | api/multi-ai/route.ts | Keine | Optionales Feature, Guard mit `if (!process.env.*)` |
| `MISTRAL_API_KEY` | api/multi-ai/route.ts | Keine | Optionales Feature, Guard vorhanden |
| `REPLICATE_API_KEY` | modules/ai-asset-studio | Keine | Optionales Feature |
| `XAI_API_KEY` | modules/ai-asset-studio | Keine | Optionales Feature |
| `NEXT_PUBLIC_APP_URL` | paddle/webhook + checkout | Keine | Hat Fallback `"https://ai-conversion.ai"` |
| `NEXT_PUBLIC_CALENDLY_URL` | components/CalendarSection.tsx | Keine | Optionales Feature, Guard mit `{process.env.* ? ... : null}` |
| `ENABLE_PROCESS_MESSAGE_V2` | modules/bot/handler.ts:377 | Keine | Feature-Flag, Default false, alter WhatsApp-Pfad aktiv |
| `NODE_ENV` | middleware.ts, logout, etc. | Keine | Von Vercel automatisch gesetzt |

**Keine kritische Luecke.** Alle fehlenden Variablen sind entweder optionale
Features mit Guards, Feature-Flags mit sicheren Defaults, oder WhatsApp-
spezifisch (extern blockiert). Der Widget-Flow benoetigt keine einzige
der fehlenden Variablen.

**Ergebnis: GO**

## Schritt 1.2: Prisma-Migration-Status

### Lokale Migrations (chronologisch)

| Migration | Datum | Inhalt |
|---|---|---|
| `20260408000000_baseline` | 08.04. | Initiales Schema |
| `20260408012204_add_dashboard_token_expires_at` | 08.04. | Dashboard-Token-Expiry |
| `20260409090329_add_performance_indexes` | 09.04. | Performance-Indizes |
| `20260409111130_add_tenant_dpa_accepted` | 09.04. | DPA-Accepted-Feld |
| `20260409150000_add_web_widget_support` | 09.04. | Widget-Felder: webWidgetEnabled, webWidgetPublicKey, webWidgetConfig, channel-Enum, Composite-Index |
| `20260410120000_add_widget_session_fields` | 10.04. | widgetSessionToken, widgetVisitorMeta, externalId nullable, consentGiven, consentAt |

### Widget-relevante Schema-Aenderungen

Die letzten zwei Migrations (`20260409150000` und `20260410120000`) sind
kritisch fuer den Widget-Flow:
- Ohne sie: `/api/widget/config` crasht (Feld `webWidgetPublicKey` nicht
  in DB), `/api/widget/session` crasht (Feld `widgetSessionToken` nicht
  in DB)
- Production-DB hat vermutlich nur die ersten 4 Migrations (Stand 09.04.
  morgens, vor Widget-Support)

### Migration-Deploy-Status

`npx prisma migrate status` wurde NICHT ausgefuehrt, weil unklar ist ob
`.env.local` auf die Production-DB oder einen Dev-Branch zeigt. Falsches
Ausfuehren koennte ungewollt gegen die falsche DB laufen.

**Manueller Check noetig:** Philipp muss im Neon-Dashboard pruefen welche
Migrations in der Production-DB (main-Branch) applied sind. Falls die
letzten zwei fehlen, muss `npx prisma migrate deploy` mit der
Production-`DATABASE_URL` ausgefuehrt werden BEVOR der Code deployed wird.

**Ergebnis: MANUELL-CHECK-NOETIG**

Empfehlung: Im Neon-Dashboard den main-Branch oeffnen, SQL-Console:
```sql
SELECT migration_name FROM _prisma_migrations ORDER BY started_at;
```
Falls `20260409150000_add_web_widget_support` und
`20260410120000_add_widget_session_fields` fehlen: `prisma migrate deploy`
mit Production-DATABASE_URL ausfuehren.

## Schritt 1.3: Build-Verifikation

| Kriterium | Ergebnis |
|---|---|
| Exit-Code | **0** (gruen) |
| Widget-Routes im Manifest | Alle 9: config, session, message, poll, embed/widget, dashboard/widget-config (GET/generate-key/toggle), dashboard/settings/widget |
| Kritische Warnings | Keine |
| First-Load JS shared | **102 kB** (unter 300 kB Limit) |
| Groesste Seiten | /onboarding 16.2 kB, /pricing 13.3 kB, /dashboard/crm 13.2 kB |
| public/widget.js | Im Build enthalten (statische Datei) |

**Ergebnis: GO**

## Schritt 1.4: Git-Status-Check

### Uncommitted Changes

| Datei | Typ | Klassifikation | Empfehlung |
|---|---|---|---|
| `CLAUDE.md` | Modified | **Deploy-kritisch** — enthält neuen "Output-Disziplin"-Abschnitt | Committen vor Push |
| `DEPLOY_PLAN_2026-04-13.md` | Untracked | Deploy-irrelevant (Doku) | Committen oder stashen |
| `docs/production-diagnose-2026-04-12.md` | Untracked | Deploy-irrelevant (Doku) | Committen oder stashen |
| `docs/vercel-diagnose-2026-04-12.md` | Untracked | Deploy-irrelevant (Doku) | Committen oder stashen |
| `public/logo.png` | Deleted | Deploy-relevant (altes Logo entfernt) | Committen vor Push |
| `public/logo1.jpg` | Deleted | Deploy-relevant (altes Logo entfernt) | Committen vor Push |
| `public/logo1.png` | Deleted | Deploy-relevant (altes Logo entfernt) | Committen vor Push |
| `public/logo.jpg` | Untracked | Deploy-relevant (neues Logo) | Committen vor Push |
| `src/app/v3/` | Untracked | **Nicht deployen** | Stashen oder .gitignore |

### Push-Umfang (origin/master..HEAD)

- **20 Commits** (Phase 5 bis Phase 7)
- **43 Dateien, +6704 / -36 Zeilen**
- Phasen abgedeckt: 5 (Embed-Script), 3b-Fixes (Rate-Limit, Spec-Drift),
  6.2-6.5 (Dashboard Widget-Settings, Conversations, Sidebar),
  7 (Testing, Mobile-Fixes, Integration-Guide)

### Empfehlung zum Handling

1. **Vor Push committen:**
   - CLAUDE.md (Output-Disziplin-Abschnitt)
   - Logo-Cleanup (delete altes, add neues)
   - Deploy-Plan + Diagnose-Docs (optional, schadet nicht)
2. **Stashen (nicht deployen):**
   - `src/app/v3/` (v3-Landing, "garnicht gut geworden")
3. **Alternativ:** v3 in `.gitignore` eintragen statt stashen

**Ergebnis: GO-MIT-VORBEREITUNG** (CLAUDE.md + Logo committen, v3 stashen)

## Gesamt-Empfehlung

### GO-MIT-VORBEREITUNG

Drei Schritte vor `git push`:

1. **Prisma-Migration-Check:** Im Neon-Dashboard pruefen ob die letzten
   zwei Migrations (`add_web_widget_support`, `add_widget_session_fields`)
   in der Production-DB applied sind. Falls nicht: `prisma migrate deploy`
   mit Production-DATABASE_URL ausfuehren.

2. **Uncommitted Changes committen:**
   ```bash
   git add CLAUDE.md public/logo.jpg DEPLOY_PLAN_2026-04-13.md \
     docs/production-diagnose-2026-04-12.md docs/vercel-diagnose-2026-04-12.md
   git rm public/logo.png public/logo1.jpg public/logo1.png
   git commit -m "docs(deploy): pre-deploy prep — CLAUDE.md output rules, logo cleanup, diagnose docs"
   ```

3. **v3-Landing stashen oder gitignoren:**
   ```bash
   echo "src/app/v3/" >> .gitignore
   ```
   Oder vor Push: `git stash push -u -- src/app/v3/`

Danach: `git push origin master` → Vercel Auto-Deploy → Phase 2+3 aus
Deploy-Plan.
