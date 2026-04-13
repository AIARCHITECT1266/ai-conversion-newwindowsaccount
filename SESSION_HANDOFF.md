# Session-Handoff — Stand 13.04.2026 morgens

## Produkt in einem Satz
AI Conversion: Multi-Tenant SaaS-Plattform fuer AI-gestuetzte Lead-
Qualifizierung ueber WhatsApp + Web-Widget. Solo-Founder (Philipp),
nicht-technisch, arbeitet mit ConvArch (Architekt-Chat) + Claude Code
(Executor).

## Stack
- Next.js ^15.3.0 auf Vercel fra1 (Frankfurt)
- Prisma 7 + Prisma Postgres Frankfurt (Single-Instance — Dev+Prod geteilt, Tech-Debt)
- Upstash Redis (Rate-Limits, Sliding Window)
- Anthropic Claude (Verkaufsgespraeche), OpenAI GPT-4o (Lead-Scoring)
- Paddle (Billing, Merchant of Record)
- Resend (Transactional E-Mails)
- Better Stack (Monitoring, 3 Monitore + Status-Page)

## Architektur-Prinzipien
- Kanal-agnostische Bot-Logik in `src/lib/bot/processMessage.ts`
- Transport-Schichten: WhatsApp-Webhook + Widget-API (`/api/widget/*`)
- Multi-Tenancy durchgaengig via Composite Keys `{id, tenantId}`
- Messages via `encryptText()` on-write verschluesselt (AES-256-GCM)
- Audit-Logging via `auditLog()` fuer compliance-relevante Aktionen
- CSP nonce-basiert mit `strict-dynamic` (Middleware + Root-Layout `await headers()`)
- 14 Prisma-Models, 11 Enums, 51 API-Endpoints
- Vollstaendige Architektur-Doku: `docs/architecture.md`

## Aktueller Production-Stand (13.04.2026 morgens)
- Master-HEAD: `acfac1e` — docs: nachtrag 4 punkte aus uebergabeprotokoll
- Letzter Production-Deploy: 12.04.2026 abends (10 Deploys an einem Tag)
- Widget-Codebase: Pilot-Ready auf Code-Ebene (0 Critical, 0 High, 0 Medium offen nach Audit vom 12.04.)
- Production-URL: ai-conversion.ai
- Status-Page: status.ai-conversion.ai

## Was wurde in den letzten 24h gebaut (12.04.-13.04.2026)

### Vormittag/Nachmittag
- Vercel-Repo-Mismatch gefixt (war auf falschem Repo verbunden)
- Production-Deploy `ef25efe` (Phase 2-7 + Deploy-Prep)
- CSP-Nonce-Regression gefixt (Commits `4590cc1` + `16348a0`, Full A.1-A.6-Cycle)
- Web-Widget-Audit durchgefuehrt (`docs/audit-web-widget-2026-04-12.md`)

### Abend-Marathon (10 Production-Deploys)
- High #1: Fallback-Message-Persistierung (`4e05e8c`)
- High #2: Session-Token-Hash (`76ef8fa`)
- Medium M1 + Low L11: Tenant-Isolation processMessage (`763fa69`)
- Medium M2: HTTPS-Only Logo-URLs (`4a2ff80`)
- Medium M3: Top-Level Error-Handler (`b049bce`)
- Medium M4: Poll select-Clause (`ce5ccbe`)
- Medium M5: Toggle Race-Condition (`67240f9`)
- Medium M6+M7+M8: A11y-Bundle (`71869f8`)

Prozess: jeder Fix mit Feature-Branch, Pre-Analyse (H.1), Code (H.2),
Lokaler Prod-Test (H.3), Merge (H.4), Production-Smoke-Test (H.5),
Docs-Commit (H.6).

## Offene Punkte — Pilot-Blocker (MUSS vor erstem echten Kunden)

Empfohlene Reihenfolge:

1. **Integration-Guide-Platzhalter ersetzen** (10 Min)
   `[SUPPORT-EMAIL]` → `support@ai-conversion.ai`,
   `[STATUS-URL]` → `https://status.ai-conversion.ai`

2. **Sentry / Error-Tracking einrichten** (1-2h)

3. **DB-Dev/Prod-Split** (2-4h) — kritisch, Dev+Prod teilen Datenbank

4. **Datenschutzerklaerung Web-Widget** (2-3h)

5. **Wix-Menuepfade verifizieren** (45 Min)

6. **AVV-Template nach Art. 28 DSGVO** (3-6h, rechtliche Sorgfalt)

**Gesamt: 10-17h ueber 3-4 fokussierte Arbeitstage.**

## Offene Punkte — Diagnose (klaeren ob Bug oder by design)

7. Magic-Link-Invalidierung bei Session-Wechsel (`src/app/dashboard/login/*`)
8. DSGVO-Cleanup-Cron Retention-Period unverifiziert (`TD-Dev-05`)
9. Rate-Limit pro Tenant vs. pro IP unklar (`Diag-02`)

## Offene Punkte — Code-Cleanup (nicht blockierend)

10. Vercel.live-Nonce-Fehler in CSP (nur Preview, 15 Min)
11. 11 Low-Audit-Befunde (L1-L10, L12) — buendelbar zu 2-3 Cleanup-Commits
12. Race-Simulation M5 nachholen nach DB-Split (`TD-Dev-06`)
13. Logo-Asset-404 auf Production — beim Rebranding beheben
14. `prompt/route.ts` ohne `auditLog()` — 5-10 Min Fix
15. FK-Constraints auf CampaignTemplate/Broadcast tenantId — 30-45 Min

## Dokumentations-Standorte

| Datei | Inhalt |
|-------|--------|
| `CLAUDE.md` | Dev-Regeln, Output-Disziplin, Pflicht-Regeln 1-5, Security |
| `PROJECT_STATUS.md` | Strategischer Stand, Tages-Zusammenfassungen, Deploy-Historie |
| `WEB_WIDGET_INTEGRATION.md` | Master-Spec Web-Widget (Phase 1-7) |
| `docs/architecture.md` | System-Uebersicht (10-Minuten-Antwort) |
| `docs/tech-debt.md` | Alle Tech-Debt-Eintraege inkl. Dev-Workflow-Issues |
| `docs/audit-web-widget-2026-04-12.md` | Vollstaendiger Audit + Fix-Nachweise |
| `docs/decisions/` | ADRs fuer Architektur-Entscheidungen |
| `docs/quality-roadmap.md` | Plan von 7/10 auf 9/10 |
| `docs/test-debt.md` | Nicht getestete Pfade |
| `docs/migration-workflow.md` | Regeln fuer Prisma-Migrationen |
| `docs/integration-guide.md` | Kunden-Einbettungs-Anleitung |
| `BACKLOG.md` | Feature-Ideen, nicht-dringliche Themen |

## Prozess-Disziplin (wichtig fuer neuen Chat)

- ConvArch gibt **kurze Antworten an Philipp**, ausfuehrliche Prompts an
  Claude Code (gemaess `CLAUDE.md` "Output-Disziplin")
- Jeder Code-Fix durchlaeuft H.1-H.6-Zyklus (keine Abkuerzungen)
- Pre-Analyse **vor** Code: Ist-Zustand dokumentieren, Fix-Plan skizzieren
- Lokaler Production-Build-Test mit `next build && next start -p 3100` vor Merge
- Bei risikoreichen Changes: Preview-Deploy auf Vercel vor Production-Merge
- Docs-Commit nach jedem Fix (Audit-Report + PROJECT_STATUS)
- Bei Schema-Migrationen: Konsumenten-Audit Pflicht (CLAUDE.md Regel 2)
- Bei Bug-Fixes: Diagnose vor Code-Change (CLAUDE.md Regel 3)
- UI-Entscheidungen: Premium-SaaS-Look als oberste Direktive (CLAUDE.md Regel 4)

## Aktuelle Tenants in DB
- `internal-admin` (Public Key: `pub_OQ5vM7rpiwTgwik0`)
- `test-b` (Public Key: `pub_2lxs3_H7wUPc0joC`)

## Better Stack
- 3 Monitore: Root (`/`), `/widget.js`, `/api/widget/config`
- Status-Page: status.ai-conversion.ai
- Support-Mail: support@ai-conversion.ai
