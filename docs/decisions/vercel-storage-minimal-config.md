# ADR: Vercel-Storage-Konfiguration auf Production-only beschraenken

## Status
Akzeptiert (13.04.2026)

## Kontext
Nach DB-Split (teal-battery = Prod, red-mirror = Dev) stellte sich
die Frage: Sollen Preview und Development in Vercel separate
DATABASE_URL-Werte erhalten?

## Entscheidung
Nur Production hat DATABASE_URL in Vercel. Preview und Development
bleiben leer. Lokale Entwicklung laeuft ausschliesslich ueber
.env.local (zeigt auf red-mirror).

## Begruendung
- Reduziert Konfigurationsflaeche → weniger Drift-Risiko
- Preview-Builds scheitern absichtlich → kein versehentlicher
  Prod-DB-Zugriff durch Preview-Branches
- Status quo gespiegelt: niemand nutzt aktuell Preview-Deploys
- Solo-Founder-Kontext: kein Team, das Preview-Deploys braucht

## Reversibilitaet
Two-Way-Door. Bei Bedarf jederzeit ueber Vercel "Connect Project"
mit 10-15 Min Aufwand erweiterbar.

## Falsifikation
Sollte sich ein Preview-Deploy-Workflow etablieren ODER das Team
wachsen → Re-Evaluation, dann red-mirror als Preview/Dev verbinden.

## Verwandte Eintraege
- `docs/tech-debt.md` → TD-Infra-01
- `docs/tech-debt.md` → TD-Monitoring-01 (Better Stack ohne
  DB-Endpoint-Coverage)
