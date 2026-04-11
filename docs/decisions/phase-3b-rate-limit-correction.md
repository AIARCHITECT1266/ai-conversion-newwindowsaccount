# ADR Phase 3b — Session-Rate-Limit Spec-Drift-Korrektur

**Datum:** 2026-04-12
**Status:** Entschieden und umgesetzt
**Owner:** Project Owner + ConvArch
**Betroffene Datei:** `src/app/api/widget/session/route.ts`

---

## Befund

Im Phase-5-Done-Kriterien-Audit am 2026-04-12 wurde eine
Spec-Drift entdeckt: `/api/widget/session` hatte ein
Rate-Limit von **30 Sessions pro IP pro Stunde** konfiguriert,
obwohl `WEB_WIDGET_INTEGRATION.md` § "Phase 3: Widget-API-
Endpoints", Abschnitt 3.3 (Session-Endpoint), wörtlich
**10 Sessions/IP/Stunde** vorschreibt — markiert mit
`"Rate-Limit STRENG"` in Großbuchstaben.

Der Befund war exakt 3× höher als die Spec-Vorgabe, also
das Dreifache des erlaubten anonymen Session-Erstellungs-
Budgets.

## Root-Cause-Analyse

Drei ineinandergreifende Faktoren haben die Drift unsichtbar
gemacht, bis ein Spec-Re-Audit sie empirisch ans Licht brachte:

### 1. Irreführender Code-Kommentar

Die betroffene Zeile trug folgenden Kommentar:

```typescript
// Rate-Limit: 30 Sessions pro Stunde pro IP (strenger als Config)
```

Der Kommentar war **plausibel**, aber **nicht spec-referenziert**.
Er verglich den Wert nur gegen eine andere Route (`/api/widget/config`
mit 100/h), nicht gegen die Spec-Vorgabe. Ein reviewender Entwickler,
der nur die Datei las, hätte den Kommentar als Bestätigung dafür
genommen, dass 30/h "schon streng" sei — ohne zu merken, dass
die Spec tatsächlich nochmal 3× strenger ist.

**Das ist die gefährliche Form von Spec-Drift:** nicht offensichtlich
falsch, sondern plausibel klingend und kontextlos.

### 2. Keine ADR-Begründung

Ein Phase-3b-ADR, der diese Entscheidung (oder Abweichung)
dokumentiert hätte, existierte nicht. `docs/decisions/` enthielt
bis zu diesem Audit nur `phase-0-decisions.md` und
`phase-5-embed-script.md`. Die Session-Rate-Limit-Entscheidung
ist also nie durch einen Review-Prozess gelaufen, der die
Spec-Abweichung bemerkt hätte.

### 3. Pre-Analyse war korrekt, wurde aber nicht durchgesetzt

`ARCHITECTURE_REPORT.md` § 3c ("Web-Erweiterung") hatte vor der
Implementation explizit den spec-konformen Wert empfohlen:

> `POST /api/widget/session` — `widget-session:{ip}` — 10/3600s
> — Streng, verhindert Session-Flooding

Die Pre-Analyse stimmte also mit der Spec überein. Bei der
tatsächlichen Implementation in Phase 3b (Commit `83e99d9`)
wurde der Wert dann auf 30/h gesetzt, ohne dass ein Diff-Review
oder ein Pre-Analyse-Abgleich den Drift bemerkt hätte.

## Korrektur

Eine Datei, zwei Zeilen-Änderungen:

### Zeile 80 — Wert korrigieren

```diff
-    max: 30,
+    max: 10,
```

### Zeilen 78-81 — Kommentar mit Spec-Bezug ersetzen

```diff
-  // Rate-Limit: 30 Sessions pro Stunde pro IP (strenger als Config)
+  // Rate-Limit STRENG laut WEB_WIDGET_INTEGRATION.md Phase 3 § 3.3:
+  // 10 Sessions/IP/h. Verhindert Session-Flooding durch anonyme
+  // Web-Besucher. Strenger als Config (100/h), weil Session-Erstellung
+  // mehr Server-Ressourcen kostet (DB-Insert + Token-Generierung).
```

Keine weiteren Änderungen in der Datei. `npx next build` grün,
Diff manuell sichtkontrolliert.

## Lessons Learned

**Spec-Drift kann durch Code-Kommentare unsichtbar werden, wenn
der Kommentar plausibel klingt aber keinen Spec-Bezug herstellt.**

Das ist eine bisher nicht in CLAUDE.md erfasste Gefahren-Klasse.
Die bestehenden Regeln decken sie nur indirekt ab:

- **Regel 2 (Konsumenten-Audit bei Schema-Migrationen)** zielt
  auf Schema-Änderungen, nicht auf numerische Config-Werte
- **Regel 3 (Diagnose vor Code-Change)** zielt auf Bug-Fixes,
  nicht auf Feature-Implementation

Die naheliegende Verschärfung wäre eine zusätzliche Convention:
**"Jeder numerische Config-Wert, der aus einer Spec stammt,
referenziert in seinem Code-Kommentar den exakten Spec-Abschnitt
(Datei + §-Nummer + wörtliches Zitat, wenn kurz genug)."**

Diese Verschärfung würde die Kommentar-Lücke von Phase 3b
geschlossen haben. Empfehlung: als eigenständiges Briefing
vom User einholen, ob CLAUDE.md um eine fünfte Regel
("Spec-Referenzen in Code-Kommentaren") erweitert werden soll —
nicht Teil dieser Fix-Phase.

### Zweite Beobachtung

Die Spec-Drift wurde **nicht** durch Code-Review, sondern durch
einen **dedizierten Spec-Done-Kriterien-Audit nach Abschluss
der Phase** entdeckt. Das ist ein Argument dafür, solche Audits
nicht als optionale Übung, sondern als Pflicht-Abschluss jeder
Phase zu betrachten — analog zum bereits existierenden
Konsumenten-Audit bei Schema-Migrationen.

## Reversibilität

**Two-Way.** Die Zeile ist trivial rückbaubar, falls sich im
Live-Betrieb zeigt, dass 10/h zu streng ist. In diesem Fall
MUSS der neue Wert jedoch durch einen ADR-Nachtrag begründet
und die Spec gleichzeitig aktualisiert werden (nicht nur der
Code) — sonst entsteht die gleiche Drift-Situation erneut.

## Konsistenz-Check

Die drei anderen Widget-Rate-Limits wurden im selben Audit
parallel verifiziert und matchen die Spec:

| Endpoint | Spec | Code | Status |
|---|---|---|---|
| `/api/widget/config` | 100/IP/h | 100 | ✅ |
| `/api/widget/session` | **10**/IP/h | **10** (nach Korrektur) | ✅ |
| `/api/widget/message` | 60/Session/h | 60 | ✅ |
| `/api/widget/poll` | 1/Sek/Session (3600/h) | 3600 | ✅ |

Nach dieser Korrektur ist das gesamte Widget-Rate-Limit-Layer
spec-konform.
