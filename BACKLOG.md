# Backlog — Feature-Ideen und nicht-dringliche Themen

Stand: 12.04.2026

## Admin-Tools
- **Admin-Dashboard Tenant-Widget-Uebersicht**
  Super-Admin-Sicht ueber alle Tenants mit Widget-Status, Public Keys,
  letzte Aktivitaet. Scope-Spec ausstehend.
- **Debug-Reset-Endpoint fuer Rate-Limiter**
  `POST /api/debug/reset-rate-limit`, dev-only, Dev-DX.

## Marketing / Lead-Generation
- **Wettbewerbs-Analyse / Marktrecherche**
  Strukturierter Block mit Claude-Research-Agent. DACH-spezifische
  WhatsApp-Lead-Qualifizierungs-Tools 2025/26. Feature-Matrix, Preise,
  Positionierung.
- **Demo-Bot auf Landing-Page** (Prioritaet: hoch)
  Besucher chattet live mit Qualifizierungs-Bot. Reuse der Widget-Infra.
- **WhatsApp-DSGVO-Checker als Lead-Magnet** (Prioritaet: hoch fuer DACH)
  10 Fragen → Score + PDF-Report.
- **ROI-Kalkulator fuer WhatsApp-Lead-Qualifizierung**
- **Lead-Score-Live-Demo**
- **Compliance-Whitepaper-Generator**

## Landing-Seite
- **v3-Landing Referenz-Klaerung**
  - Welche Landings findest du premium? (URLs sammeln)
  - Was war an v2 gut?
  - Neu aufziehen oder iterativ verbessern?
  - Aktueller Stash: `v3-landing-WIP-needs-redesign`

## Integration-Guide
- **Framework-spezifische Nonce-CSP-Anleitung**
  Aktuell nur generische Anleitung. Ergaenzung bei Bedarf (Next.js,
  WordPress, Shopify).

## Testing
- **E2E-Test-Szenarien aus Uebergabeprotokoll 12.04.2026**
  5 konkrete Flows, die vor Pilot-Akquise durchlaufen werden sollten:
  1. Widget-Session-Erstellung + Multi-Turn + Consent-Flow
  2. Rate-Limit-Verhalten (Session/Message/Poll)
  3. Tenant-Isolation (Cross-Tenant-Zugriff darf nicht moeglich sein)
  4. Mobile-Viewport-Rendering + Touch-Interaktion
  5. Cross-Origin-Embedding (Widget auf fremder Domain)

  Voraussetzung: Testing-Setup (Vitest + Playwright) muss erst gebaut
  werden. Aufwand nach Setup: 2-3h einmalig.

## Feedback-Prozess
- **Visual-Viewport-API-Trigger-Definition**
  Mobile-Tastatur-Tech-Debt: wer trackt Pilot-Feedback, wo wird es
  erfasst, welches Feedback zaehlt? Ohne Prozess-Definition bleibt
  der Eintrag dauerhaft offen.
