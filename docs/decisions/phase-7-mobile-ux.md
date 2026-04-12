# ADR: Mobile-UX-Entscheidungen (Phase 7, Szenario B3)

**Datum:** 2026-04-12
**Phase:** Phase 7 — Testing & Hardening, Test-Gruppe B
**Status:** Umgesetzt (Commit `1980034`)
**Test-Geraet:** Echtes Smartphone (Brave Android) via LAN-URL

---

## Entscheidung 1: Close-X-Button nach oben-rechts auf Mobile

### Problem

Auf Mobile (<767px) oeffnet das Widget als Fullscreen-Overlay
(iframe `inset:0; width:100%; height:100%`). Die Floating-Bubble
morpht zum Close-X-Button, bleibt aber an ihrer Position
`right:18px; bottom:18px`. Der Senden-Button im iframe-Footer
sitzt ebenfalls rechts unten (44x44px). Beide Elemente
ueberlappen im selben ~60x60px-Bereich — der User trifft X
statt Senden, die Nachricht geht verloren.

### Entscheidung

Im Mobile-Media-Query (`@media (max-width:767px)`) bekommt
`.bubble.open` eine eigene CSS-Regel:

```css
.bubble.open {
  top: 12px;
  bottom: auto;
  right: 12px;
  width: 44px;
  height: 44px;
}
```

- Position springt sofort (kein animierter Slide — bei einem
  Close-Button ist sofortiges Erscheinen natuerlicher)
- 44x44px = WCAG 2.5.8 Minimum Touch-Target
- Desktop-Verhalten bleibt unveraendert (Bubble bleibt unten rechts)

### Alternativen (geprueft und verworfen)

- **Close-X ausblenden, Close via Swipe-Down:** Eleganter, aber
  aufwaendiger (Swipe-Gesture-Detection) und Risiko dass User
  keinen Weg findet den Chat zu schliessen.
- **Input-Feld mit `pr-16` (Platz reservieren):** Verschwendet
  permanent Platz im Input-Feld auf Mobile. Behandelt Symptom,
  nicht Ursache.

### Datei

`public/widget.js` — Mobile-Media-Query, Zeile 189
(Kommentar referenziert WEB_WIDGET_INTEGRATION.md Phase 5)

---

## Entscheidung 2: Auto-Fokus-Unterdrueckung auf Mobile

### Problem

Beim Oeffnen des Widgets fokussierte ein `useEffect` automatisch
das Input-Feld (`inputRef.current?.focus()`). Auf Mobile oeffnet
das sofort die virtuelle Tastatur (~50% des Viewports), der
Viewport schrumpft, und die Welcome-Message wird aus dem
sichtbaren Bereich geschoben. Der User sieht beim ersten Oeffnen
einen leeren Chat.

### Entscheidung

`matchMedia("(max-width: 767px)")` Guard im Fokus-useEffect:

```tsx
useEffect(() => {
  if (!sessionToken || showConsentModal) return;
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  if (isMobile) return;
  inputRef.current?.focus();
}, [sessionToken, showConsentModal]);
```

- Desktop: Auto-Fokus bleibt (physische Tastatur, kein Viewport-Problem)
- Mobile: Kein Auto-Fokus, User tippt manuell ins Feld wenn bereit

### Datei

`src/app/embed/widget/ChatClient.tsx` — Zeile 73-82

---

## Entscheidung 3: Chromium-Keyboard-Avoidance als Plattform-Standard akzeptiert

### Problem

Wenn der User auf Mobile aktiv ins Input-Feld tippt, scrollt
der Chromium-Keyboard-Avoidance-Algorithmus den fokussierten
Input ueber die Tastatur. Dabei werden Header und Welcome-Message
kurzzeitig aus dem Viewport geschoben. Das passiert unabhaengig
von unserem Code — es ist natives Browser-Verhalten.

### Versuchte und verworfene Loesungen

**`100dvh` statt `100vh` (Dynamic Viewport Height):**
Implementiert und getestet. Wirkungslos, weil der iframe in einem
`position:fixed; inset:0` Container sitzt (sowohl in `widget.js`
Host als auch in `embed/layout.tsx`). Fixed-Elemente reagieren
auf iOS/Android nicht auf die Tastatur. Vollstaendig revertiert.

**Smart-Scroll Guard (`overflow <= 100`):**
Implementiert als ergaenzende Massnahme. Verhindert
programmatisches Scroll-to-Bottom bei kurzen Message-Listen.
Hilft bei der initialen Oeffnung, nicht beim aktiven Tippen.

### Vollstaendige Loesung (bewusst aufgeschoben)

Visual Viewport API (`window.visualViewport`):
- `visualViewport.height` gibt die sichtbare Hoehe zurueck
  (exkl. Tastatur)
- `resize`-Event feuert bei Tastatur-Oeffnung/-Schliessung
- Container-Hoehe dynamisch auf `visualViewport.height` setzen

Geschaetzter Aufwand: 150-300 Zeilen mit iOS/Android-Edge-Cases
(Safari hat andere Timing-Semantik als Chrome fuer das
`resize`-Event).

### Entscheidung

Akzeptieren als Plattform-Standardverhalten. Identisches
Verhalten bei Intercom, Crisp, Drift und anderen Chat-Widgets.
Kein Pilot-Kunde wird das als Bug melden.

### Rueckzahlung

Nachfrage-getrieben: Visual Viewport API implementieren wenn
ein Pilot-Kunde explizit Feedback dazu gibt.

### Dokumentation

- `docs/tech-debt.md` — "Phase 7 — Mobile-Tastatur-Keyboard-
  Avoidance (Chromium-Default)"
- `PHASE_7_PLAN.md` — Sektion 11, B3 Mobile Detail

---

## Zusammenfassung

| Entscheidung | Typ | Reversibel | Impact |
|---|---|---|---|
| Close-X nach oben-rechts | CSS-Aenderung | Ja | Kein Overlap mehr |
| Auto-Fokus-Unterdrueckung | JS-Guard | Ja | Welcome-Message sichtbar |
| Chromium-Keyboard akzeptiert | Akzeptanz | Ja (Visual Viewport API) | Temporaerer Scroll beim Tippen |
