"use client";

// ============================================================
// LivePulse (Phase 2c.4)
//
// Visueller Live-Indikator oben rechts auf der Dashboard-
// Hauptseite. Pulsierender gruener Dot + "Live"-Text +
// Sekunden-Counter seit Mount.
//
// Achtung — Semantik: Der Indikator zeigt nur die Zeit seit
// Mount, nicht echte Polling-Aktivitaet. Bewusste Demo-
// Vereinfachung. Der reale Auto-Refresh fuer KpiCards/
// TrendChart/TopSignals/ActionBoard ist Post-Demo geplant
// (TD-Post-Demo-Live-Pulse-Real, siehe docs/tech-debt.md).
//
// Mobile (<640px): Sekunden-Counter wird ausgeblendet
// (`hidden sm:inline`), nur Dot + "Live" sichtbar.
// ============================================================

import { useEffect, useState } from "react";

export default function LivePulse() {
  const [secondsSinceMount, setSecondsSinceMount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSinceMount((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--text-muted)]"
      aria-live="polite"
    >
      <span
        className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"
        aria-hidden="true"
      />
      <span>Live</span>
      <span className="hidden sm:inline">· {secondsSinceMount}s</span>
    </div>
  );
}
