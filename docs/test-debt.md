## Phase 2 — Schema-Migration

### WhatsApp-Flow nicht mit echter Nachricht getestet
- Status: Test-Debt wegen fehlender Meta-Verifizierung
- Wann testen: Sobald US-LLC + Meta Business Verification durch.
- Konkrete Regression-Schritte: siehe Phase 1b Abschluss-Zusammenfassung
  (6 Schritte, Flag on/off).

### Connection-Pool-Verhalten bei Migrations nicht durchgespielt
- Status: DATABASE_URL-Variante nicht geprüft (pooled vs direct)
- Risiko: Bei späteren Migrationen mit vielen Änderungen könnten
  Pool-Probleme auftreten. Aktuell unkritisch wegen rein additiver
  Migration und geringer Datenmenge.

### Rollback-Script nicht praktisch getestet
- Status: Rollback-SQL für Phase 2 Migration existiert, wurde aber nie testweise ausgeführt.
- Risiko: Im Notfall könnte das Script Fehler enthalten, die wir nicht kennen.
- Wann testen: Einmalig vor dem ersten echten Pilot-Kunden. Bei einem einzigen Test-Tenant ist der Schaden im Fehlerfall noch reparierbar.
- Wie testen: migrate deploy rückgängig, Rollback-SQL manuell einspielen, bestehendes Dashboard aufrufen, wieder vorwärts migrieren.
