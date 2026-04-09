# Dokumentations-Übersicht

## Projekt-Wissen

| Datei | Zweck | Wann lesen? |
|---|---|---|
| /PROJECT_STATUS.md | Aktueller Stand, Blocker, nächster Schritt | Immer zuerst |
| /WEB_WIDGET_INTEGRATION.md | Spec des aktuellen Projekts | Beim Start jeder Phase |
| /ARCHITECTURE_REPORT.md | Pre-Analyse mit Findings und Zeilenangaben | Wenn Code-Kontext gebraucht wird |
| /CLAUDE.md | Projekt-Konventionen (Code-Stil, Patterns) | Beim ersten Code-Kontakt |

## Entscheidungen

| Datei | Zweck |
|---|---|
| decisions/phase-0-decisions.md | Sechs Entscheidungen aus der Pre-Analyse |
| adr/README.md | ADR-Prozess für spätere Revisionen |
| adr/NNN-*.md | Konkrete ADRs (aktuell leer) |

## Schuld & Workflows

| Datei | Zweck |
|---|---|
| tech-debt.md | Bewusst eingegangene technische Schuld mit Rückzahlungsplan |
| test-debt.md | Nicht getestete Pfade mit Test-Plan |
| migration-workflow.md | Prisma-Migration in Claude-Code-Sessions |

## Regeln

1. Neue Entscheidungen → neue Datei unter decisions/
2. Neue Tech-Debt → Eintrag in tech-debt.md
3. Nicht getestete Pfade → Eintrag in test-debt.md
4. ADRs nur bei Revision bereits getroffener Entscheidungen
   (siehe adr/README.md)
