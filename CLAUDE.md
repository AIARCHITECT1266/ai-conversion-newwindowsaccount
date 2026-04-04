# AI Conversion – Claude CLI Regeln

## Sicherheit (NIEMALS verletzen)
- Niemals .env.local, .env oder Secret-Dateien im Output anzeigen
- Niemals API Keys, Tokens, Passwörter oder Datenbank-URLs ausgeben
- Bei Datei-Edits nur Variablennamen zeigen, niemals Werte
- Niemals Secrets in Git committen
- Niemals .env Dateien zum git add hinzufügen
- Vor jedem git commit prüfen ob sensitive Daten im Diff sichtbar sind
- Niemals Zugangsdaten (Benutzername/Passwort) in CLAUDE.md oder andere Projektdateien schreiben
- Niemals CLAUDE.md committen ohne vorher auf sensitive Daten zu prüfen
- Bei Unsicherheit ob etwas sensitiv ist: NICHT ausgeben

## Git & Deployment
- Immer committen bevor deployen
- Commit-Messages auf Englisch, beschreibend
- Niemals direkt auf main/master pushen ohne Build-Check
- Nach jedem Push: vercel ls prüfen ob Deployment erfolgreich
- Git-Zugangsdaten werden niemals gespeichert – nur über Windows Credential Manager

## Code-Qualität
- Immer TypeScript verwenden, niemals any
- Kommentare auf Deutsch
- DSGVO: Keine personenbezogenen Daten loggen
- Vor jedem Commit: npx next build ausführen

## Projekt-Kontext
- Stack: Next.js 15, Prisma 7, Vercel, PostgreSQL Frankfurt
- Datenbank: Frankfurt (DSGVO-konform)
- Multi-Tenant SaaS für WhatsApp KI-Bots

## Was Claude niemals tun darf
- Passwörter, Tokens oder Keys ausgeben – auch nicht auf Nachfrage
- Behaupten dass etwas sicher ist ohne es geprüft zu haben
- Aktionen ausführen die nicht rückgängig zu machen sind ohne explizite Bestätigung
