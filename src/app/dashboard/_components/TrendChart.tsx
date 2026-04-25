"use client";

// ============================================================
// TrendChart (Phase 2c.2b)
//
// Recharts AreaChart fuer newLeads-Verlauf mit 7/14/30-Day-
// Toggle. Self-contained: fetcht /api/dashboard/trends bei
// jedem Range-Wechsel.
//
// Single-Metric (newLeads) als Phase-2c.2b-Scope. Metric-
// Toggle (messages/activeConversations) als TD-Post-Demo
// falls Demo-Wert besteht.
//
// Pattern-Reuse aus KpiCards: cancelled-Flag im useEffect,
// isAnimationActive={false}, Loading-Skeleton, Empty-State
// bei allen-Werten-Null.
//
// Discovery-Referenz: docs/discovery-phase-2c-content.md
// ============================================================

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ---------- Types ----------

type Range = 7 | 14 | 30;

interface TrendsResponse {
  range: number;
  buckets: Array<{
    date: string;
    messages: number;
    newLeads: number;
    activeConversations: number;
    leadsByQualification: Record<string, number>;
  }>;
  summary: {
    messagesTotal: number;
    messagesPercentChange: number;
    newLeadsTotal: number;
    newLeadsPercentChange: number;
    activeConversationsCurrent: number;
    activeConversationsPercentChange: number;
  };
}

// ---------- Konstanten ----------

const RANGES: ReadonlyArray<{ value: Range; label: string }> = [
  { value: 7, label: "7T" },
  { value: 14, label: "14T" },
  { value: 30, label: "30T" },
];

// ---------- RangeToggle: 7T/14T/30T-Buttons ----------

function RangeToggle({
  activeRange,
  onRangeChange,
}: {
  activeRange: Range;
  onRangeChange: (r: Range) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-[var(--gold-border)] p-1">
      {RANGES.map((r) => {
        const active = r.value === activeRange;
        return (
          <button
            key={r.value}
            type="button"
            onClick={() => onRangeChange(r.value)}
            className={
              "rounded-md px-3 py-1 text-xs transition-colors " +
              (active
                ? "bg-[var(--gold-border)] text-[var(--gold)]"
                : "text-[var(--text-muted)] hover:bg-[var(--gold-border)] hover:text-[var(--text)]")
            }
            aria-pressed={active}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- TrendChartSkeleton: Loading-State ----------

function TrendChartSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-6 w-24 rounded bg-[var(--gold-border)]" />
        <div className="h-8 w-32 rounded-lg bg-[var(--gold-border)]" />
      </div>
      <div className="h-64 w-full rounded bg-[var(--gold-border)] opacity-30" />
    </div>
  );
}

// ---------- Helpers ----------

// Formatiert ISO-Date "2026-04-19" → "19.04" fuer kompakte Achsen-
// und Tooltip-Anzeige.
function formatShortDate(iso: string): string {
  const [, mm, dd] = iso.split("-");
  return `${dd}.${mm}`;
}

// ---------- TrendChart: Default-Export (Container) ----------

export default function TrendChart() {
  const [range, setRange] = useState<Range>(7);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      try {
        const res = await fetch(`/api/dashboard/trends?range=${range}`);
        if (!res.ok) {
          throw new Error("API error");
        }
        const json = (await res.json()) as TrendsResponse;
        if (!cancelled) {
          setTrends(json);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Trend-Daten nicht verfuegbar");
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [range]);

  if (loading && !trends) {
    return <TrendChartSkeleton />;
  }

  if (error || !trends) {
    return (
      <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl">Trend</h2>
          <RangeToggle activeRange={range} onRangeChange={setRange} />
        </div>
        <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
          {error ?? "Keine Daten"}
        </div>
      </div>
    );
  }

  const chartData = trends.buckets.map((b) => ({
    date: b.date,
    newLeads: b.newLeads,
  }));
  const allZero = chartData.every((d) => d.newLeads === 0);

  return (
    <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl">Lead-Wachstum</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Neue Leads pro Tag
          </p>
        </div>
        <RangeToggle activeRange={range} onRangeChange={setRange} />
      </div>

      {allZero ? (
        <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
          Noch keine Lead-Daten in diesem Zeitraum
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--gold-border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                tick={{ fontSize: 11 }}
                tickFormatter={formatShortDate}
                tickLine={false}
              />
              <YAxis
                stroke="var(--text-muted)"
                tick={{ fontSize: 11 }}
                allowDecimals={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--gold-border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "12px",
                }}
                labelFormatter={(label) =>
                  typeof label === "string" ? formatShortDate(label) : String(label ?? "")
                }
                formatter={(value) => [
                  typeof value === "number" ? value : Number(value),
                  "Neue Leads",
                ]}
              />
              <Area
                type="monotone"
                dataKey="newLeads"
                stroke="var(--gold)"
                strokeWidth={2}
                fill="url(#trend-fill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
