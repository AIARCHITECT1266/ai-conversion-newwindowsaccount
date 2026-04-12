# Deploy-Plan 13.04.2026 (vorgezogen auf 12.04. abends)

**STATUS: ABGESCHLOSSEN am 12.04.2026 18:35 Uhr**

Deploy war nicht so gross wie befuerchtet. Root Cause war ein Repo-Mismatch
bei Vercel (falscher Repo verbunden), nicht ein tatsaechliches Deploy-Problem.
Nach Reconnect + Push lief alles innerhalb 5 Min durch.

Deployed Commit: ef25efe
Verified Production: ai-conversion.ai alle Widget-Routes 200 OK
Siehe PROJECT_STATUS.md fuer Details.

---

## Urspruenglicher Plan (zu historischen Zwecken belassen)

## Ausgangslage (Stand 12.04.2026, Abend)

- Production läuft auf Commit `debe389` (9. April) — massiv veraltet
- Lokal: 20 Commits ahead von origin/master, mehrere Commits in origin/master 
  aber noch nie deployed (vermutlich kein Push seit 9. April)
- Vercel-Pipeline: intakt, Auto-Deploy aktiv, GitHub-App verbunden
- Env-Vars in Production: 25 Variablen, alle kritischen vorhanden
- Function-Region: fra1 (Frankfurt) konfiguriert, wird bei nächstem Deploy aktiv
- Better Stack: 1 Monitor aktiv (/), 3 pausiert

**Root Cause des Deploy-Drifts:** Keine Git-Pushes seit 9. April.
**Kein Pipeline-Problem, kein Build-Fehler, kein Config-Problem.**

## Voraussetzungen vor Deploy

- [ ] Frischer Kopf (nicht müde, nicht abgelenkt)
- [ ] Mindestens 90 Min Zeitfenster ohne Unterbrechung
- [ ] Keine offenen ungespeicherten Änderungen außerhalb des Repos
- [ ] Backup-Plan: Vercel erlaubt Instant-Rollback auf vorherigen Deploy 
      über "Promote to Production"-Button beim alten Deploy `9x2BU3B2B`

## Phase 1: Pre-Deploy-Checks (Claude Code, 15 Min)

### Schritt 1.1: Env-Var-Diff
- Claude Code listet alle `process.env.*`-Referenzen im Code
- Gleicht ab mit Production-Env-Liste (siehe unten)
- Meldet: welche Variablen referenziert der Code, die nicht in Production sind?
- Entscheidung: fehlt etwas → manuell in Vercel ergänzen VOR Push

### Schritt 1.2: Prisma-Migration-Status
- `npx prisma migrate status` lokal ausführen
- Prüfen: welche Migrations existieren lokal, welche sind deployed?
- Kritisch: Production-DB (Neon main-Branch) hat vermutlich alte Migrations
- Entscheidung: `npx prisma migrate deploy` gegen Production-DB VOR Push nötig
- ACHTUNG: Das erfordert DATABASE_URL der Production-DB (nicht Dev-Branch)

### Schritt 1.3: Build-Verifikation
- `npx next build` lokal — muss grün sein
- Build-Size-Check, keine Warnings die auf fehlende Module hindeuten

### Schritt 1.4: Git-Status-Check
- `git status` — nur erwartete uncommitted Changes (Logo-Cleanup, v3-Landing)
- Diese SIND NICHT Teil des Deploys — entweder vorher committen oder stashen
- Entscheidung: v3-Landing nicht deployen (war "garnicht gut geworden"), 
  also: `git stash -u` vor Push

## Phase 2: Push und Auto-Deploy (5 Min)

### Schritt 2.1: Push
```bash
git push origin master
```

### Schritt 2.2: Vercel beobachten
- Vercel-Dashboard → Deployments
- Neuer Deploy erscheint sofort mit Commit-Hash `1980034` 
  (oder neuer falls zwischenzeitlich committed wurde)
- Status-Übergänge: Queued → Building → Ready
- Erwartete Dauer: 2-4 Minuten
- BEI "Failed": Build-Logs ansehen, melden, NICHT weitermachen

### Schritt 2.3: fra1-Aktivierung verifizieren
- Deploy-Details → Functions-Tab
- Region sollte fra1 sein
- Banner "Redeploy necessary" verschwindet automatisch

## Phase 3: Post-Deploy-Smoke-Tests (Claude Code + manuell, 15 Min)

### Schritt 3.1: HTTP-Checks
Claude Code führt aus:
- `curl -I https://ai-conversion.ai/` → 200
- `curl -I https://ai-conversion.ai/widget.js` → 200 (war vorher 404)
- `curl -I https://ai-conversion.ai/dashboard/login` → 200 (oder 307 ok)
- `curl -s "https://ai-conversion.ai/api/widget/config?key=pub_OQ5vM7rpiwTgwik0"` 
  → JSON-Response mit primaryColor/logoUrl/welcomeMessage

### Schritt 3.2: CSP-Check
- Response-Header von `/` prüfen
- `Content-Security-Policy` sollte Nonce enthalten (`'nonce-...'`), NICHT `'unsafe-inline'`
- Wenn noch unsafe-inline: Deploy hat nicht den neuen Code übernommen → debuggen

### Schritt 3.3: Manuelle Smoke-Tests (Philipp)
- Widget-Demo auf Production öffnen: `https://ai-conversion.ai/widget-demo.html`
  (falls diese Datei deployed wurde — sonst auslassen)
- Dashboard-Login testen
- Widget in Settings → Widget konfigurieren, Embed-Code kopieren
- Embed-Code in einer lokalen HTML-Testdatei einbauen, Browser öffnen
- Konversation starten, Bot muss antworten

### Schritt 3.4: Better Stack reaktivieren
- Monitore entpausieren: /widget.js, /dashboard/login, /api/widget/config?key=...
- Nach 3-5 Min sollten alle grün sein
- Status-Page verifizieren: status.ai-conversion.ai

## Phase 4: Dokumentation und Commit

- `PROJECT_STATUS.md` aktualisieren: "Production deployed auf Commit X, 
  Pilot-Ready-Status jetzt auch in Production erreicht"
- Neuer Eintrag in `docs/tech-debt.md`: "Deploy-Prozess nicht automatisiert 
  über CI, manuell per Push — akzeptiert für Solo-Founder-Phase, 
  Rückzahlung bei 3+ Teammitgliedern"
- Commit: `docs(deploy): post-deploy status update 2026-04-13`

## Rollback-Strategie

### Wenn Phase 2 (Deploy) fehlschlägt:
- Production bleibt auf `9x2BU3B2B` (alter Zustand) — kein Impact
- Build-Logs analysieren, fehlende Env-Var oder Code-Bug identifizieren
- Fix committen, nochmal pushen
- KEIN manueller Redeploy eines funktionierenden Builds

### Wenn Phase 3 (Smoke-Tests) Fehler zeigt:
- Vercel-Dashboard → Deployments → alter Deploy `9x2BU3B2B` → 
  "..." → "Promote to Production"
- Production läuft wieder auf altem Stand innerhalb 30 Sekunden
- Danach: Fehler offline debuggen, nicht unter Zeitdruck

### Wenn Prisma-Migration in Phase 1 fehlschlägt:
- Neon-Dashboard → Branches → aktuellen main-Branch Snapshot erstellen
- Migration manuell nachziehen
- NICHT pushen bevor Migration durch ist (sonst Runtime-Errors in Production)

## Checkliste vor Go

- [ ] Alle Phase-1-Checks grün
- [ ] Env-Var-Diff zeigt keine kritischen Lücken
- [ ] Prisma-Migration-Status sauber
- [ ] `git status` clean (bis auf bewusst gestashte Änderungen)
- [ ] Vercel-Dashboard geöffnet in anderem Tab, bereit zum Beobachten
- [ ] Better-Stack-Dashboard geöffnet in drittem Tab
- [ ] Zeit im Kalender freigehalten, keine andere Verpflichtungen

## Was heute NICHT passiert

- Keine neue Feature-Entwicklung
- Keine Widget-UI-Änderungen
- Keine Env-Var-Änderungen außer wenn Phase 1.1 das zeigt
- Kein Push ohne vorherige Phase-1-Verifikation

## Erfolgs-Kriterien

- Alle 4 Better-Stack-Monitore grün
- Widget-Config-Endpoint gibt JSON zurück (nicht HTML-404)
- Dashboard-Login funktioniert
- CSP zeigt Nonce (nicht unsafe-inline)
- `/widget.js` ist erreichbar
- Manuelle Widget-Konversation auf Production läuft durch

Nach erfolgreichen Kriterien: Production ist tatsächlich Pilot-Ready.
