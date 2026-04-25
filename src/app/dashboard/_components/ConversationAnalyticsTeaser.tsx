"use client";

// ============================================================
// ConversationAnalyticsTeaser (Phase 2c.4)
//
// Coming-Soon-Teaser-Card am Ende des Dashboards. Demo-Narrativ-
// Element fuer den MOD-Demo-Call 29.04.2026 — signalisiert
// "wir bauen weiter, das ist erst der Anfang".
//
// Pattern-Konsistenz mit SettingsSidebar.tsx (Coming-Soon-Section):
// gestrichelte Border, dezente Opacity, kein Klick-Handler,
// rein informativ.
//
// Mobile: Card stacked, gleiche Optik. Die Card-Struktur ist
// nativ flex-stack (keine Spalten), funktioniert auf <640px ohne
// gesonderte Breakpoints.
// ============================================================

import { Hourglass } from "lucide-react";

export default function ConversationAnalyticsTeaser() {
  return (
    <div
      className="rounded-2xl border border-dashed border-[var(--gold-border)] bg-[var(--surface)]/40 p-6"
      aria-label="Bald verfuegbar — Konversations-Analytics"
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
        Konversations-Analytics
      </h2>

      <ul className="mb-4 space-y-1.5 text-sm text-[var(--text-muted)]">
        <li>Welche Themen treiben deine Conversion?</li>
        <li>Welche Botantworten fuehren zu Terminen?</li>
      </ul>

      <p className="text-xs italic text-[var(--text-muted)]/70">
        Im Pilot wird dieser Bereich gemeinsam mit dir entwickelt.
      </p>
    </div>
  );
}
