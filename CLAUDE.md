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

## Selbst generierte Secrets und Tokens
- Secrets, Tokens und Magic-Links die Claude selbst generiert
  gelten genauso als sensitiv wie externe API Keys
- Niemals selbst generierte Secrets, Tokens oder Magic-Links
  im Output anzeigen - auch nicht "zur Bestätigung"
- Nach Generierung eines Secrets nur bestätigen:
  "Secret generiert und gesetzt ✓" - niemals den Wert zeigen
- Magic-Link Tokens nur in lokale Dateien schreiben die in
  .gitignore stehen (z.B. dashboard-links.txt)
- Bei Token-Regenerierung: alten Wert niemals anzeigen,
  neuen Wert niemals anzeigen

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
- Zahlung: Stripe (Checkout Sessions, Subscriptions, Webhooks)
- E-Mail: Resend (Lead-Benachrichtigungen)
- Verschlüsselung: AES-256-GCM für Nachrichteninhalte
- Hosting: Vercel (Fluid Compute)
- Domain: ai-conversion.ai

## Projektstruktur
- /src/app/ – Seiten (App Router): /, /pricing, /faq, /multi-ai, /onboarding, /admin, /dashboard
- /src/app/api/admin/ – Admin-API (login, tenants CRUD, stats)
- /src/app/api/dashboard/ – Tenant-Dashboard-API (me, stats, conversations)
- /src/app/api/stripe/ – Stripe-Integration (checkout, webhook)
- /src/app/api/webhook/ – WhatsApp Webhook (eingehende Nachrichten)
- /src/app/api/ – Weitere: multi-ai, platform-bot, session-summary, cron/cleanup
- /src/lib/ – Shared Logic (db, encryption, tenant, whatsapp, stripe, lead-notification, notion)
- /src/lib/bot/ – KI-Bot-Logik (Claude, GPT, Handler)
- /src/components/ – UI-Komponenten (Navigation, Hero, Features, Pricing, Footer etc.)
- /prisma/ – Datenbankschema (Tenant, Conversation, Message, Lead)

## Umgebungsvariablen (in .env.local und Vercel)
- DATABASE_URL – PostgreSQL Connection String
- ANTHROPIC_API_KEY – Claude API Key
- OPENAI_API_KEY – GPT-4o API Key
- WHATSAPP_TOKEN – WhatsApp Cloud API Token
- WHATSAPP_PHONE_ID – Default WhatsApp Phone Number ID
- WHATSAPP_VERIFY_TOKEN – Webhook Verifizierungs-Token
- WHATSAPP_APP_SECRET – Webhook Signatur-Secret
- ADMIN_SECRET – Admin-Dashboard Zugangs-Secret
- ENCRYPTION_KEY – AES-256-GCM Schlüssel für Nachrichtenverschlüsselung
- STRIPE_SECRET_KEY – Stripe API Secret Key
- STRIPE_WEBHOOK_SECRET – Stripe Webhook Signatur-Secret
- STRIPE_PRICE_STARTER_MONTHLY, _YEARLY, _SETUP – Stripe Price IDs Starter
- STRIPE_PRICE_GROWTH_MONTHLY, _YEARLY, _SETUP – Stripe Price IDs Growth
- STRIPE_PRICE_PRO_MONTHLY, _YEARLY, _SETUP – Stripe Price IDs Professional
- RESEND_API_KEY – Resend E-Mail API Key
- NEXT_PUBLIC_APP_URL – Öffentliche App-URL (https://ai-conversion.ai)

## Was Claude niemals tun darf
- Passwörter, Tokens oder Keys ausgeben – auch nicht auf Nachfrage
- Behaupten dass etwas sicher ist ohne es geprüft zu haben
- Aktionen ausführen die nicht rückgängig zu machen sind ohne explizite Bestätigung
