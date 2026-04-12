# ADR Phase 7 — CORS `*` auf Public Widget Endpoints

**Datum:** 2026-04-12
**Status:** Entschieden
**Owner:** Project Owner
**Betroffene Dateien:**
- `src/app/api/widget/config/route.ts` (Zeile 27)
- `src/app/api/widget/session/route.ts` (Zeile 33)
- `src/app/api/widget/message/route.ts` (Zeile 32)
- `src/app/api/widget/poll/route.ts` (Zeile 29)

---

## Kontext

Die Sicherheits-Checkliste in `WEB_WIDGET_INTEGRATION.md`
fordert woertlich: *"CORS explizit gesetzt, nicht `*` fuer
sensitive Endpoints"*.

Alle 4 Widget-Endpoints setzen `Access-Control-Allow-Origin: *`.
Im Phase-7-Pre-Analyse-Audit wurde dies als einziger offener
Gap identifiziert.

---

## Analyse

### Warum `*` architekturbedingt korrekt ist

Widget-Endpoints werden per Definition von **beliebigen
Kunden-Domains** aufgerufen — jeder Pilot-Kunde hat eine
andere Domain, und wir kennen diese Domains zur Build-Zeit
nicht. Eine statische Allowlist ist nicht moeglich.

Die Spec-Formulierung "nicht `*` fuer sensitive Endpoints"
zielt auf Endpoints mit Cookie-basierter Auth oder internen
Daten (Admin-API, Dashboard-API). Widget-Endpoints sind
**public-facing by design**:

- Kein Cookie, kein Session-Header — Auth laeuft ueber
  Session-Token im Request-Body (POST) oder Query-Param (GET)
- Rate-Limiting schuetzt gegen Missbrauch (10 Sessions/IP/h,
  60 Messages/Session/h, 100 Config-Fetches/IP/h, 1 Poll/s)
- Zod-Validierung auf allen Inputs
- Kein tenantId oder Secret im Response

### Industrie-Vergleich

Intercom, Crisp, Drift, HubSpot Chat, Zendesk Widget —
alle nutzen `Access-Control-Allow-Origin: *` auf ihren
oeffentlichen Widget-Endpoints. Der Token (nicht CORS) ist
die Auth-Boundary.

### Erwogene Alternativen

| Alternative | Pro | Contra | Entscheidung |
|---|---|---|---|
| **(A) Akzeptieren + ADR (gewaehlt)** | Kein Code-Change, ehrliche Doku, Industry-Standard | Spec-Wortlaut-Abweichung | Gewaehlt |
| **(B) Dynamischer Origin-Reflect** | Sieht in Audits "sauberer" aus | Schuetzt nicht besser als `*`, da jede Origin akzeptiert wird. Taeuscht eine Einschraenkung vor die nicht existiert. ~30 Min Aufwand ohne Security-Gewinn | Verworfen |
| **(C) Tenant-basierte Origin-Allowlist** | Eleganteste Loesung, echte Einschraenkung | Schema-Aenderung + Dashboard-UI + Validierung. v2.0-Scope, ueberproportionaler Aufwand fuer v1.0 | Verworfen (v2.0-Kandidat) |

---

## Entscheidung

**Option A: `Access-Control-Allow-Origin: *` bleibt auf allen
4 Widget-Endpoints. Kein Code-Change.**

Die Absicherung gegen Missbrauch laeuft ueber:
1. Rate-Limiting (IP-basiert fuer config/session,
   Token-basiert fuer message/poll)
2. Session-Token-Validierung gegen DB
   (`verifySessionToken()` mit TTL + channel + status-Check)
3. Zod-Schema-Validierung auf allen Inputs
4. Audit-Logging mit IP-Hash auf 3 von 4 Endpoints
   (Poll ausgenommen per ADR `phase-3b-spec-reconciliation.md`)

Die Spec-Formulierung wird als auf Admin/Dashboard-Endpoints
bezogen interpretiert — dort bleibt CORS restriktiv (kein
`Access-Control-Allow-Origin`-Header gesetzt, Same-Origin-
Policy greift).

---

## Spec-Bezug (CLAUDE.md Regel 5)

Abweichung von `WEB_WIDGET_INTEGRATION.md` Sicherheits-
Checkliste Punkt 9: *"CORS explizit gesetzt, nicht `*` fuer
sensitive Endpoints"*.

Begruendung: Widget-Endpoints sind **nicht** "sensitive
Endpoints" im Sinne der Spec — sie sind oeffentlich
erreichbar, haben keine Cookie-Auth, und muessen von
beliebigen Kunden-Domains aufrufbar sein. Die
Sicherheits-Boundary ist der Session-Token + Rate-Limiting,
nicht CORS. Siehe Abschnitt "Analyse" oben.

---

## Reversibilitaet

**Two-Way-Door.** Falls in v2.0 eine Tenant-basierte
Origin-Allowlist eingefuehrt wird (Option C), ist der
Umbau auf dynamisches `Access-Control-Allow-Origin: <tenant-origin>`
ein isolierter Change in den 4 Route-Dateien (~20 LOC je Datei).
Schema-Erweiterung: ein `allowedOrigins String[]`-Feld auf dem
Tenant-Model.
