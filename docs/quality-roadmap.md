# Quality Roadmap — Weg von 7/10 zu 9/10

Diese Datei dokumentiert die noch offenen Punkte, die das Projekt
von "solide" (7/10) auf "production-ready für kleine Teams" (9/10)
bringen. Stand: 2026-04-10, nach Phase 3b komplett.

## Aktuelle Bewertung
**7 von 10** als Senior-Dev-/Architect-Bewertung.
- Architektur, Doku, Tech-Debt-Tracking, Disziplin: stark
- Tests, Observability, Schema-Hygiene-Audit: schwach

## Harte Lücken (3) — vor erstem echten Pilot-Kunden zu schließen

### 1. Keine automatisierten Tests
**Status:** Null Tests. Alles wird manuell per curl smoke-getestet.
**Risiko:** Jeder zukünftige Refactor ist ein Blindflug. Wachsende
Codebase macht manuelles Testen unzuverlässig.
**Fix:** Erste E2E-Test-Suite mit Vitest oder Playwright. 5-10 Tests
für die Widget-Pipeline (Session erstellen, Message senden, Polling,
Bot-Antwort, abgelaufene Session, ungültiger Token, Closed-Conv).
**Aufwand:** 2-3 Stunden initial, dann ~10 Min pro neuem Feature.
**Wann:** Nach Phase 5, vor Phase 6.

### 2. Kein Error-Tracking jenseits console.log
**Status:** Nur strukturiertes JSON über auditLog auf stdout.
**Risiko:** Bugs in Production werden nicht aktiv gemeldet, du musst
sie zufällig in Vercel-Logs finden. Fatal sobald echte Kunden live.
**Fix:** Sentry-Integration (Free-Tier reicht). Wraps fatal errors,
aggregiert, sendet Alerts bei neuen Issues.
**Aufwand:** 30 Minuten.
**Wann:** Nach Phase 4, vor Phase 5.

### 3. Schema-Hygiene nicht systematisch auditiert
**Status:** Wir haben zufällig zwei FK-Lücken gefunden
(CampaignTemplate, Broadcast). Unbekannt wie viele weitere existieren.
**Risiko:** Cascade-Lücken, fehlende Indizes, semantische
Inkonsistenzen werden erst bei der Nutzung gefunden.
**Fix:** Systematische Schema-Audit-Session. Jedes Model durchgehen.
Ergebnis: Audit-Bericht plus eventuell eine Migration-Phase.
**Aufwand:** 1 Stunde Audit, ggf. 30-60 Min Migration.
**Wann:** Nach Phase 7, vor erstem Pilot-Kunden.

## Weiche Lücken (3) — vor mehreren parallelen Pilot-Kunden

### 4. Keine Performance-Beobachtung
**Fix:** Vercel Analytics oder console.time an strategischen Stellen.
**Aufwand:** 30 Minuten.
**Wann:** Nach Phase 7.

### 5. Kein getesteter Backup-/Restore-Plan
**Fix:** Einmal Restore aus Prisma-Postgres-Snapshot in Test-DB üben,
Schritte dokumentieren.
**Aufwand:** 1 Stunde.
**Wann:** Nach Phase 7.

### 6. Kein dokumentierter Onboarding-Prozess für neue Tenants
**Fix:** docs/onboarding.md mit klaren Schritten. Optional Admin-UI
in Phase 6.
**Aufwand:** 30 Minuten Doku, optional 1 Stunde UI.
**Wann:** Mit Phase 6 (Dashboard).

## Gesamt-Mehraufwand
6-8 Stunden, verteilt über zwei Wochen, parallel zu den verbleibenden
Build-Phasen.

## Bewertungs-Stufen
- Aktuell (Stand heute): 7/10
- Nach harten Lücken 1-3: 8/10
- Nach allen sechs Lücken: 9/10
- 10/10 ist Phantasie und sollte nicht angestrebt werden

## Wer pflegt diese Datei?
ConvArch (Claude im Chat) erinnert bei jedem Phasen-Übergang an
relevante Punkte. Diese Datei wird in CLAUDE.md als Reading-Order-
Pflicht ergänzt, sobald die ersten Lücken angegangen werden.
