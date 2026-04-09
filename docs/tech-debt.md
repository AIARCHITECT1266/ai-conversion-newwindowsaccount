## Phase 1 — processMessage Extraktion

### Doppelter Tenant-Load in processMessage
- Status: bewusst akzeptiert in Phase 1a
- Problem: processMessage lädt den Tenant intern nochmal, obwohl der
  Caller ihn bereits geladen hat. Eine zusätzliche DB-Query pro
  Nachricht.
- Warum akzeptiert: Phase 1 ist semantikgleiche Extraktion. Interface-
  Änderung (tenant als Parameter) vermischt zwei Refactorings und
  erhöht Risiko.
- Wann fixen: In Phase 3, wenn ohnehin am Widget-Interface gearbeitet
  wird, oder früher falls Performance-Messungen es rechtfertigen.
- Aufwand: ca. 30 Minuten (Signatur erweitern, Caller anpassen,
  interne findUnique entfernen).

### Audit-Log enthält zusätzliches "channel"-Feld im neuen Pfad
- Status: bewusst akzeptiert, additive Erweiterung
- Problem: processMessage loggt channel in auditLog-Details, der alte
  Pfad nicht. Kein Breaking Change, aber streng genommen keine
  1:1-Semantik.
- Warum akzeptiert: Additive Audit-Erweiterungen sind rückwärts-
  kompatibel und helfen bei späterem Debugging.
- Wann fixen: Nicht fixen. Wird in Phase 2+ ohnehin Standard sein,
  wenn Web-Kanal produktiv läuft.

## Phase 2 — Schema-Migration

### Daten-Migration generate-widget-keys.ts nicht erstellt
- Status: bewusst verschoben auf Phase 3
- Grund: Das Skript wird erst benötigt, wenn der Widget-API-Endpoint
  tatsächlich den webWidgetPublicKey zur Tenant-Auflösung nutzt.
  Derzeit ist nur das Schema-Feld vorhanden, kein Code liest es.
- Wann erstellen: In Phase 3, zusammen mit der ersten Verwendung.
