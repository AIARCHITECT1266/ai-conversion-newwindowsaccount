"use client";

// ============================================================
// KpiCards (Phase 2c.2a)
//
// Vier KPI-Karten fuer das Dashboard:
// 1. Nachrichten heute (Sparkline)
// 2. Aktive Gespraeche (ScoreBar mit Qualification-Aufteilung)
// 3. Neue Leads (ScoreBar)
// 4. Konversionsrate (Sparkline)
//
// Fetcht /api/dashboard/trends?range=7 und /api/dashboard/labels
// selbststaendig beim Mount. Loading-Skeleton + Error-State.
//
// Sub-Components: AnimatedNumber, TrendIndicator, Sparkline,
// ScoreBar, KpiCardSkeleton — alle in dieser Datei (kein
// File-Split fuer diese Komponente).
//
// Discovery-Referenz: docs/discovery-phase-2c-content.md
// ============================================================

import { useEffect, useState } from "react";
import { useMotionValue, useTransform, animate } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  MessageSquare,
  Users,
  TrendingUp,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { QUALIFICATION_ORDER_LOW_TO_HIGH } from "@/lib/scoring/qualification-order";

// ---------- Types ----------

type Qualification =
  | "UNQUALIFIED"
  | "MARKETING_QUALIFIED"
  | "SALES_QUALIFIED"
  | "OPPORTUNITY"
  | "CUSTOMER";

interface TrendsResponse {
  range: number;
  buckets: Array<{
    date: string;
    messages: number;
    newLeads: number;
    activeConversations: number;
    leadsByQualification: Record<Qualification, number>;
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

interface LabelsResponse {
  labels: Record<Qualification, string>;
}

// ---------- Score-Color-Map (ADR-002-konform: stabile Enum-Keys) ----------

const SCORE_COLORS: Record<Qualification, { bar: string; dot: string }> = {
  UNQUALIFIED: { bar: "bg-zinc-500/40", dot: "bg-zinc-500" },
  MARKETING_QUALIFIED: { bar: "bg-blue-400", dot: "bg-blue-400" },
  SALES_QUALIFIED: { bar: "bg-purple-400", dot: "bg-purple-400" },
  OPPORTUNITY: { bar: "bg-emerald-400", dot: "bg-emerald-400" },
  CUSTOMER: { bar: "bg-[var(--gold)]", dot: "bg-[var(--gold)]" },
};

// Lokale Sortier-Konstante wurde nach src/lib/scoring/qualification-order.ts
// extrahiert (Phase: Qualification-Order-Centralization). Alias hier
// nur damit die bestehenden Render-Loop-Verwendungsstellen unveraendert
// bleiben — Diff-Minimierung.
const QUALIFICATION_ORDER = QUALIFICATION_ORDER_LOW_TO_HIGH;

// ---------- AnimatedNumber: Counter mit framer-motion ----------

function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format?: (n: number) => string;
}) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const [display, setDisplay] = useState<string>(
    format ? format(0) : "0"
  );

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.6,
      ease: "easeOut",
    });
    const unsubscribe = rounded.on("change", (latest) => {
      setDisplay(format ? format(latest) : latest.toString());
    });
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, motionValue, rounded, format]);

  return <span>{display}</span>;
}

// ---------- TrendIndicator: Pfeil + Percent ----------

function TrendIndicator({ percentChange }: { percentChange: number }) {
  // TD-Pre-Demo-3 Hotfix: Tooltip "vs. Vorwoche" am Pfeil — der
  // percentChange in /api/dashboard/trends vergleicht current-7-Tage
  // gegen previous-7-Tage. Title-Attribut ist Hover-only und fuegt
  // keine sichtbare Anzeige-Aenderung hinzu.
  if (percentChange === 0) {
    return (
      <span
        className="flex items-center gap-1 text-xs text-[var(--text-muted)]"
        title="vs. Vorwoche"
      >
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }
  const isPositive = percentChange > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const colorClass = isPositive ? "text-emerald-400" : "text-rose-400";
  return (
    <span
      className={`flex items-center gap-1 text-xs ${colorClass}`}
      title="vs. Vorwoche"
    >
      <Icon className="h-3 w-3" />
      {Math.abs(percentChange).toFixed(1)}%
    </span>
  );
}

// ---------- Sparkline: recharts AreaChart ----------

function Sparkline({ data }: { data: Array<{ value: number }> }) {
  // Wenn alle Werte 0: visuell ehrlicher Hint statt leerer Linie
  const allZero = data.every((d) => d.value === 0);
  if (allZero) {
    return (
      <div className="flex h-8 w-full items-center text-[10px] text-[var(--text-muted)]">
        Noch keine Vergleichsdaten
      </div>
    );
  }
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--gold)"
            strokeWidth={1.5}
            fill="url(#spark-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- ScoreBar: Stacked Bar mit Qualification-Aufteilung ----------

interface ScoreBarProps {
  breakdown: Record<Qualification, number>;
  total: number;
  labels: Record<Qualification, string>;
}

function ScoreBar({ breakdown, total, labels }: ScoreBarProps) {
  if (total === 0) {
    return (
      <div className="flex h-8 w-full items-center text-[10px] text-[var(--text-muted)]">
        Noch keine Vergleichsdaten
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--gold-border)]">
        {QUALIFICATION_ORDER.map((q) => {
          const count = breakdown[q] ?? 0;
          if (count === 0) return null;
          return (
            <div
              key={q}
              className={SCORE_COLORS[q].bar}
              style={{ width: `${(count / total) * 100}%` }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]">
        {QUALIFICATION_ORDER.map((q) => {
          const count = breakdown[q] ?? 0;
          if (count === 0) return null;
          return (
            <span key={q} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${SCORE_COLORS[q].dot}`} />
              {count} {labels[q]}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ---------- KpiCard: einzelne Karte (Discriminated Union) ----------

// TD-Pre-Demo-3 Hotfix: percentChange ist `number | null`. Bei null
// wird der TrendIndicator NICHT gerendert — sauberer als ein
// "−0%"-Platzhalter fuer KPIs ohne Vergleichswert (z.B. clientseitig
// berechnete Konversionsrate ohne Wochen-vs-Wochen-Diff).
type KpiCardProps =
  | {
      kind: "sparkline";
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      value: number;
      format?: (n: number) => string;
      percentChange: number | null;
      sparklineData: Array<{ value: number }>;
    }
  | {
      kind: "scorebar";
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      value: number;
      format?: (n: number) => string;
      percentChange: number | null;
      breakdown: Record<Qualification, number>;
      total: number;
      labels: Record<Qualification, string>;
    };

function KpiCard(props: KpiCardProps) {
  const Icon = props.icon;
  return (
    <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--gold-border-hover)]">
      <div className="mb-2 flex items-center justify-between">
        <Icon className="h-5 w-5 text-[var(--gold)]" />
        {props.percentChange !== null && (
          <TrendIndicator percentChange={props.percentChange} />
        )}
      </div>
      <div className="font-serif text-4xl text-[var(--text)]">
        <AnimatedNumber value={props.value} format={props.format} />
      </div>
      <div className="mb-3 mt-1 text-xs uppercase tracking-wider text-[var(--text-muted)]">
        {props.label}
      </div>
      {props.kind === "sparkline" ? (
        <Sparkline data={props.sparklineData} />
      ) : (
        <ScoreBar
          breakdown={props.breakdown}
          total={props.total}
          labels={props.labels}
        />
      )}
    </div>
  );
}

// ---------- KpiCardSkeleton: Loading-State ----------

function KpiCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-5">
      <div className="mb-2 h-5 w-5 rounded bg-[var(--gold-border)]" />
      <div className="mb-2 h-10 w-20 rounded bg-[var(--gold-border)]" />
      <div className="mb-3 h-3 w-32 rounded bg-[var(--gold-border)]" />
      <div className="h-8 w-full rounded bg-[var(--gold-border)]" />
    </div>
  );
}

// ---------- KpiCards: Default-Export (Container) ----------

export default function KpiCards() {
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [labels, setLabels] = useState<Record<Qualification, string> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [trendsRes, labelsRes] = await Promise.all([
          fetch("/api/dashboard/trends?range=7"),
          fetch("/api/dashboard/labels"),
        ]);
        if (!trendsRes.ok || !labelsRes.ok) {
          throw new Error("API error");
        }
        const trendsJson = (await trendsRes.json()) as TrendsResponse;
        const labelsJson = (await labelsRes.json()) as LabelsResponse;
        if (!cancelled) {
          setTrends(trendsJson);
          setLabels(labelsJson.labels);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Daten nicht verfuegbar");
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error || !trends || !labels) {
    return (
      <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-5 text-sm text-[var(--text-muted)]">
        {error ?? "Daten konnten nicht geladen werden"}
      </div>
    );
  }

  // Sparkline-Data: Karte 1 (Nachrichten) und Karte 4 (Konversionsrate)
  const messagesSparkline = trends.buckets.map((b) => ({ value: b.messages }));

  // Konversionsrate (Karte 4): OPPORTUNITY+CUSTOMER / newLeads im Range
  const totalLeads = trends.buckets.reduce((sum, b) => sum + b.newLeads, 0);
  const conversionLeads = trends.buckets.reduce(
    (sum, b) =>
      sum +
      (b.leadsByQualification.OPPORTUNITY ?? 0) +
      (b.leadsByQualification.CUSTOMER ?? 0),
    0
  );
  const conversionRate = totalLeads > 0 ? (conversionLeads / totalLeads) * 100 : 0;
  const conversionSparkline = trends.buckets.map((b) => {
    const total = b.newLeads;
    const conv =
      (b.leadsByQualification.OPPORTUNITY ?? 0) +
      (b.leadsByQualification.CUSTOMER ?? 0);
    return { value: total > 0 ? (conv / total) * 100 : 0 };
  });

  // ScoreBar-Data: Karte 2 (Aktive Gespraeche)
  // Approximation: Aufteilung folgt der heutigen Lead-Verteilung im
  // letzten Bucket. Genauer waere ein eigener API-Call, aber fuer
  // Demo-Realitaet ausreichend.
  const lastBucket = trends.buckets[trends.buckets.length - 1];
  const activeBreakdown = lastBucket.leadsByQualification;
  const activeTotal = trends.summary.activeConversationsCurrent;

  // ScoreBar-Data: Karte 3 (Neue Leads, Summe ueber Range)
  const newLeadsBreakdown: Record<Qualification, number> = {
    UNQUALIFIED: 0,
    MARKETING_QUALIFIED: 0,
    SALES_QUALIFIED: 0,
    OPPORTUNITY: 0,
    CUSTOMER: 0,
  };
  trends.buckets.forEach((b) => {
    QUALIFICATION_ORDER.forEach((q) => {
      newLeadsBreakdown[q] += b.leadsByQualification[q] ?? 0;
    });
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        kind="sparkline"
        icon={MessageSquare}
        label="Nachrichten · letzte 7 Tage"
        value={trends.summary.messagesTotal}
        percentChange={trends.summary.messagesPercentChange}
        sparklineData={messagesSparkline}
      />
      <KpiCard
        kind="scorebar"
        icon={Users}
        label="Aktive Gespraeche"
        value={trends.summary.activeConversationsCurrent}
        percentChange={trends.summary.activeConversationsPercentChange}
        breakdown={activeBreakdown}
        total={activeTotal}
        labels={labels}
      />
      <KpiCard
        kind="scorebar"
        icon={TrendingUp}
        label="Neue Leads · letzte 7 Tage"
        value={trends.summary.newLeadsTotal}
        percentChange={trends.summary.newLeadsPercentChange}
        breakdown={newLeadsBreakdown}
        total={trends.summary.newLeadsTotal}
        labels={labels}
      />
      <KpiCard
        kind="sparkline"
        icon={Zap}
        label="Lead-Qualifizierungs-Quote · letzte 7 Tage"
        value={conversionRate}
        format={(n) => `${n.toFixed(0)}%`}
        percentChange={null}
        sparklineData={conversionSparkline}
      />
    </div>
  );
}
