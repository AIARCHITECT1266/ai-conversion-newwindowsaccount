"use client";

// ============================================================
// TopSignals (Phase 2c.3)
//
// Self-contained Client-Component, die /api/dashboard/signals
// fetcht und die haeufigsten Lead-Scoring-Signale als Premium-
// Liste rendert. Reuses pattern aus TrendChart: cancelled-Flag
// im useEffect, Loading-Skeleton, Empty-State.
//
// Datenquelle: Lead.scoringSignals (ADR scoring-per-tenant) —
// pro Lead 1-6 String-Eintraege, ueber alle Tenant-Leads
// aggregiert mit Count.
// ============================================================

import { useEffect, useState } from "react";

// ---------- Types ----------

interface SignalCount {
  signal: string;
  count: number;
}

interface SignalsResponse {
  signals: SignalCount[];
  totalLeads: number;
  leadsWithSignals: number;
}

// ---------- Konstanten ----------

const FETCH_LIMIT = 10;

// ---------- Skeleton ----------

function TopSignalsSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-6">
      <div className="mb-4 h-6 w-32 rounded bg-[var(--gold-border)]" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg bg-[var(--gold-border)] opacity-30 px-3 py-2"
            style={{ width: `${100 - i * 8}%` }}
          >
            <div className="h-4 w-3/4 rounded bg-[var(--gold-border)]" />
            <div className="h-4 w-6 rounded bg-[var(--gold-border)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- TopSignals: Default-Export ----------

export default function TopSignals() {
  const [data, setData] = useState<SignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      try {
        const res = await fetch(`/api/dashboard/signals?limit=${FETCH_LIMIT}`);
        if (!res.ok) {
          throw new Error("API error");
        }
        const json = (await res.json()) as SignalsResponse;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Signale nicht verfuegbar");
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !data) {
    return <TopSignalsSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-6">
        <h2 className="mb-2 font-serif text-xl">Top-Signale</h2>
        <div className="flex h-32 items-center justify-center text-sm text-[var(--text-muted)]">
          {error ?? "Keine Daten"}
        </div>
      </div>
    );
  }

  const maxCount = data.signals[0]?.count ?? 1;
  const coverage =
    data.totalLeads > 0
      ? Math.round((data.leadsWithSignals / data.totalLeads) * 100)
      : 0;

  return (
    <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="font-serif text-xl">Top-Signale</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Haeufigste Beobachtungen aus dem Lead-Scoring
          </p>
        </div>
        {data.totalLeads > 0 && (
          <span className="text-xs text-[var(--text-muted)]">
            {data.leadsWithSignals} von {data.totalLeads} Leads ({coverage}%)
          </span>
        )}
      </div>

      {data.signals.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-[var(--text-muted)]">
          Noch keine Signale erfasst
        </div>
      ) : (
        <ul className="space-y-1.5">
          {data.signals.map((entry) => {
            const widthPct = Math.max(8, (entry.count / maxCount) * 100);
            return (
              <li
                key={entry.signal}
                className="group relative overflow-hidden rounded-lg border border-[var(--gold-border)] px-3 py-2 transition-colors hover:border-[var(--gold)]"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-[var(--gold)] opacity-[0.08] transition-opacity group-hover:opacity-[0.14]"
                  style={{ width: `${widthPct}%` }}
                  aria-hidden
                />
                <div className="relative flex items-center justify-between gap-3">
                  <span
                    className="truncate text-sm text-[var(--text)]"
                    title={entry.signal}
                  >
                    {entry.signal}
                  </span>
                  <span className="shrink-0 rounded-md bg-[var(--gold-border)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--gold)]">
                    {entry.count}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
