"use client";

// ============================================================
// YesterdayResults (Phase 2e)
//
// Dashboard-Section "Gestern" — zeigt die Tages-Bilanz der
// gestrigen Leads:
//   - Gesamt-Header mit Anzahl + Datum
//   - 4 Qualification-Bars (Visual-Bar + Count + Label),
//     je hoeher der Count, desto laenger die Bar
//   - actionableCount-Zeile (nur wenn > 0)
//   - topSignal-Zeile (nur wenn vorhanden)
//
// Self-contained — fetcht /api/dashboard/yesterday und
// /api/dashboard/labels parallel beim Mount. Loading-Skeleton
// + Empty-State + Error-State.
//
// Color-Palette: matched zu KpiCards.tsx SCORE_COLORS, damit
// Qualification-Stages dashboard-weit identisch farblich
// codiert sind. Lokal redefiniert (kein Import quer durch
// Components — ScoreBar in KpiCards ist intern).
//
// Mobile (<768px): Bar-Cards stacken vertikal (1 Spalte),
// gleiche Optik. Bar-Hoehe min 8px fuer Empty-Bars sichtbar.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { Sunrise } from "lucide-react";

// ---------- Types ----------

type Qualification =
  | "UNQUALIFIED"
  | "MARKETING_QUALIFIED"
  | "SALES_QUALIFIED"
  | "OPPORTUNITY"
  | "CUSTOMER";

interface YesterdayResponse {
  date: string;
  totalLeads: number;
  byQualification: Record<Qualification, number>;
  actionableCount: number;
  topSignal: { text: string; count: number } | null;
}

interface LabelsResponse {
  labels: Record<Qualification, string>;
}

// ---------- Konstanten ----------

// Reihenfolge der Bar-Cards von links nach rechts. CUSTOMER
// faellt fuer Yesterday-View bewusst weg (Kunden-Konversionen
// werden separat abgebildet, gestriger Lead-Trichter ist
// pre-Customer).
const DISPLAY_ORDER: Qualification[] = [
  "OPPORTUNITY",
  "SALES_QUALIFIED",
  "MARKETING_QUALIFIED",
  "UNQUALIFIED",
];

// Color-Mapping — gleiche Tailwind-Klassen wie
// `KpiCards.tsx:SCORE_COLORS` fuer dashboard-weite Konsistenz.
const BAR_COLORS: Record<Qualification, string> = {
  UNQUALIFIED: "bg-zinc-500/40",
  MARKETING_QUALIFIED: "bg-blue-400",
  SALES_QUALIFIED: "bg-purple-400",
  OPPORTUNITY: "bg-emerald-400",
  CUSTOMER: "bg-[var(--gold)]",
};

const BAR_MAX_HEIGHT_PX = 96;
const BAR_MIN_HEIGHT_PX = 8;

// ---------- Helpers ----------

function formatDate(iso: string): string {
  // ISO "YYYY-MM-DD" → "DD.MM.YYYY". Bewusst kein
  // toLocaleDateString, weil die ISO-Repraesentation bereits
  // tenant-Berlin-zeitlich aufgeloest ist (Server-Side).
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

// ---------- Skeleton ----------

function YesterdaySkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-6">
      <div className="mb-4 h-5 w-48 rounded bg-[var(--gold-border)]" />
      <div className="mb-6 h-3 w-24 rounded bg-[var(--gold-border)] opacity-60" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[var(--gold-border)] opacity-30 h-32" />
        ))}
      </div>
    </div>
  );
}

// ---------- Bar-Card ----------

function BarCard({
  count,
  maxCount,
  label,
  qualification,
}: {
  count: number;
  maxCount: number;
  label: string;
  qualification: Qualification;
}) {
  // Bar-Hoehe proportional zu maxCount, MIN-Hoehe damit Empty-
  // Bars als "Spur" sichtbar bleiben (Demo-Polish).
  const barHeight = useMemo(() => {
    if (maxCount === 0) return BAR_MIN_HEIGHT_PX;
    const ratio = count / maxCount;
    const pixels = Math.round(ratio * BAR_MAX_HEIGHT_PX);
    return Math.max(pixels, BAR_MIN_HEIGHT_PX);
  }, [count, maxCount]);

  return (
    <div className="flex flex-col items-stretch rounded-xl border border-[var(--gold-border)] bg-white/[0.02] p-4">
      <div
        className="flex items-end"
        style={{ height: `${BAR_MAX_HEIGHT_PX}px` }}
      >
        <div
          className={`w-full rounded-md transition-all ${BAR_COLORS[qualification]}`}
          style={{ height: `${barHeight}px` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-3 font-serif text-3xl text-[var(--text)] tabular-nums">
        {count}
      </div>
      <div className="mt-0.5 line-clamp-2 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
    </div>
  );
}

// ---------- Default-Export ----------

export default function YesterdayResults() {
  const [data, setData] = useState<YesterdayResponse | null>(null);
  const [labels, setLabels] = useState<Record<Qualification, string> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        const [yesterdayRes, labelsRes] = await Promise.all([
          fetch("/api/dashboard/yesterday"),
          fetch("/api/dashboard/labels"),
        ]);
        if (!yesterdayRes.ok) throw new Error("yesterday fetch failed");
        const yesterday = (await yesterdayRes.json()) as YesterdayResponse;
        const labelsJson = labelsRes.ok
          ? ((await labelsRes.json()) as LabelsResponse)
          : { labels: {} as Record<Qualification, string> };
        if (!cancelled) {
          setData(yesterday);
          setLabels(labelsJson.labels ?? null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Yesterday-Daten nicht verfuegbar");
          setLoading(false);
        }
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  // Loading
  if (loading) return <YesterdaySkeleton />;

  // Error
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
        {error ?? "Keine Daten"}
      </div>
    );
  }

  // Empty-State (gestern keine Leads)
  if (data.totalLeads === 0) {
    return (
      <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-6">
        <div className="mb-2 flex items-center gap-2">
          <Sunrise className="h-4 w-4 text-[var(--gold)]" />
          <h2 className="font-serif text-xl text-[var(--text)]">Gestern</h2>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {formatDate(data.date)} war ruhig — keine neuen Leads.
        </p>
      </div>
    );
  }

  // Maximum fuer Bar-Hoehen-Skalierung
  const maxCount = Math.max(
    ...DISPLAY_ORDER.map((q) => data.byQualification[q] ?? 0),
    1,
  );

  // Labels-Resolver mit Fallback auf Enum-Key
  const labelFor = (q: Qualification) => labels?.[q] ?? q;

  return (
    <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-6">
      {/* Header */}
      <div className="mb-1 flex items-center gap-2">
        <Sunrise className="h-4 w-4 text-[var(--gold)]" />
        <h2 className="font-serif text-xl text-[var(--text)]">
          Gestern: {data.totalLeads}{" "}
          {data.totalLeads === 1 ? "neuer Lead" : "neue Leads"}
        </h2>
      </div>
      <p className="mb-5 text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {formatDate(data.date)}
      </p>

      {/* 4 Bar-Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DISPLAY_ORDER.map((q) => (
          <BarCard
            key={q}
            count={data.byQualification[q] ?? 0}
            maxCount={maxCount}
            label={labelFor(q)}
            qualification={q}
          />
        ))}
      </div>

      {/* Actionable-Zeile */}
      {data.actionableCount > 0 && (
        <p className="mt-5 border-t border-[var(--gold-border)] pt-4 text-sm text-[var(--text)]">
          → {data.actionableCount}{" "}
          {data.actionableCount === 1
            ? "Lead fuer Sales heute"
            : "Leads fuer Sales heute"}{" "}
          <span className="text-[var(--text-muted)]">
            ({labelFor("OPPORTUNITY")} + {labelFor("SALES_QUALIFIED")})
          </span>
        </p>
      )}

      {/* topSignal-Zeile */}
      {data.topSignal && (
        <p className="mt-2 text-sm italic text-[var(--text-muted)]">
          Top-Anker: &laquo;{data.topSignal.text}&raquo; ({data.topSignal.count}x)
        </p>
      )}
    </div>
  );
}
