# Phase 0 — Getroffene Entscheidungen

Datum: 2026-04-09
Basis: ARCHITECTURE_REPORT.md + ConvArch-Audit

## Entscheidung 1: crypto.randomBytes statt nanoid
Public-Key und Session-Token werden via
crypto.randomBytes(12).toString('base64url') bzw. (16) generiert.
Keine neue Dependency.

## Entscheidung 2: Modell A für Session-vs-Conversation
Siehe ARCHITECTURE_REPORT.md Abschnitt 2g.

## Entscheidung 3: Persistenz vor Transport
Siehe ARCHITECTURE_REPORT.md Abschnitt 1d.

## Entscheidung 4: Test-Modus wird nicht gefixt
/test/[slug] bleibt wie er ist (authentifiziert). Dead Code in
src/lib/test-mode.ts wird mit Widget-Launch entfernt, nicht vorher.

## Entscheidung 5: CSP-Nonce vor Phase 4
Die CSP-unsafe-inline Tech-Debt wird VOR Phase 4 (iframe-UI) adressiert,
nicht parallel, nicht danach. Phase 4 baut direkt gegen die neue CSP.

## Entscheidung 6: Cleanup-Cron Stufe 4 vor Pilot-Launch
Wird nach Phase 3, vor Phase 7 gefixt. Kein Blocker für Phasen 1-6.
