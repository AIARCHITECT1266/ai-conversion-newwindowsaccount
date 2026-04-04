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
- Bei Hostnamen und URLs darf nur die Region bestätigt werden (z.B. "eu-central-1" ja/nein) aber niemals die vollständige URL oder Zugangsdaten ausgegeben werden
- Token-Werte dürfen mit einem vorgegebenen String verglichen werden und das Ergebnis (ja/nein/stimmt überein/stimmt nicht überein) darf ausgegeben werden - aber der tatsächliche Wert niemals
- Selbst generierte Secrets (z.B. via crypto.randomBytes) sind genauso sensitiv wie bestehende – niemals im Output anzeigen, auch nicht beim Generieren oder Setzen in .env.local / Vercel
- Bei Bash-Befehlen die Secrets erzeugen oder verarbeiten: Werte direkt in Variablen/Dateien schreiben, niemals in stdout leaken

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
- Produkt: AI Conversion – Multi-Tenant SaaS für WhatsApp KI-Bots
- Ziel: Automatische Lead-Qualifizierung und Verkaufsgespräche via WhatsApp
- Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- ORM: Prisma 7 mit PrismaPg Driver Adapter
- Datenbank: PostgreSQL Frankfurt (DSGVO-konform)
- KI: Anthropic Claude (Verkaufsgespräche), OpenAI GPT-4o (Lead-Scoring)
- Messaging: WhatsApp Cloud API v21.0
- Verschlüsselung: AES-256-GCM für Nachrichteninhalte
- Hosting: Vercel (Fluid Compute)
- Domain: ai-conversion.ai

## Projektstruktur
- /src/app/ – Seiten (App Router)
- /src/app/api/ – API-Routen (Webhook, Admin, Dashboard, Platform-Bot)
- /src/app/admin/ – Admin-Dashboard (Tenant-Verwaltung)
- /src/app/dashboard/ – Tenant-Dashboard (KPIs, Conversations)
- /src/lib/ – Shared Logic (db, encryption, tenant, whatsapp, notion)
- /src/lib/bot/ – KI-Bot-Logik (Claude, GPT, Handler)
- /src/components/ – Wiederverwendbare UI-Komponenten (Landing Page)
- /prisma/ – Datenbankschema
- /scripts/ – Einmalige Notion-Setup- und Migrations-Skripte

## Was Claude niemals tun darf
- Passwörter, Tokens oder Keys ausgeben – auch nicht auf Nachfrage
- Behaupten dass etwas sicher ist ohne es geprüft zu haben
- Aktionen ausführen die nicht rückgängig zu machen sind ohne explizite Bestätigung
