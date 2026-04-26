"use client";

// ============================================================
// ChannelTeaser (Phase 2.5b Bonus)
//
// Coming-Soon-Card fuer Channel-Performance. Demo-Hook fuer
// "Wisst ihr, welcher Channel die qualifizierbaren Leads liefert?".
//
// Pattern-Konsistenz mit ConversationAnalyticsTeaser.tsx
// (Phase 2c.4) — gleiche Card-Struktur, gleiche gestrichelte
// Border, gleiches Hourglass-Icon.
//
// Statische Component, kein Daten-Fetch, keine Props.
// Kompletter Spec-Text aus Build-Prompt 5b 1:1 uebernommen.
//
// Mobile: Card stacked, gleiche Optik. Channel-Pillen wrappen
// auf <640px (flex-wrap).
// ============================================================

import { Hourglass } from "lucide-react";

const CHANNELS = [
  "Meta",
  "TikTok",
  "Google",
  "YouTube",
  "LinkedIn",
  "Direct",
  "Print",
];

export default function ChannelTeaser() {
  return (
    <div
      className="rounded-2xl border border-dashed border-[var(--gold-border)] bg-[var(--surface)]/40 p-6"
      aria-label="Bald verfuegbar — Channel-Performance"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <Hourglass className="h-4 w-4 text-[var(--gold)]/60" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gold)]/70">
          Bald verfuegbar
        </p>
      </div>

      <h2
        className="mb-3 text-lg font-semibold text-[var(--text)]"
        style={{ fontFamily: "var(--serif)" }}
      >
        Channel-Performance
      </h2>

      <p className="mb-4 text-sm text-[var(--text-muted)]">
        Welche Werbe-Channels bringen euch die qualifizierbaren Leads —
        und welche kostet euch nur Budget?
      </p>

      {/* Channel-Pillen */}
      <div className="mb-4 flex flex-wrap gap-2">
        {CHANNELS.map((channel) => (
          <span
            key={channel}
            className="rounded-full border border-[var(--gold-border)] bg-white/[0.02] px-3 py-1 text-xs text-[var(--text-muted)]"
          >
            {channel}
          </span>
        ))}
      </div>

      <p className="mb-3 text-sm text-[var(--text-muted)]">
        Vergleicht Channels nach Tag, Woche, Monat —
        <br />
        mit Conversion-Rate und Top-Signal pro Quelle.
      </p>

      <p className="text-xs italic text-[var(--text-muted)]/70">
        Im Pilot konfigurieren wir das Tracking
        mit eurem aktuellen Marketing-Setup.
      </p>
    </div>
  );
}
