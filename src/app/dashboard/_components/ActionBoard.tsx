"use client";

// ============================================================
// ActionBoard (Phase 2c.3)
//
// Drei-Spalten-Board mit den wichtigsten anstehenden Lead-
// Aktionen, gefuettert von /api/dashboard/action-board:
//   1. waitingForFollowUp  Leads, die einen Follow-Up brauchen
//   2. recentlyContacted   Letzte 24h kontaktiert
//   3. appointmentsToday   Heute anstehende Termine (Berlin-Tag)
//
// Mobile-First: einspaltig stacked vertical, ab lg drei Spalten
// nebeneinander. Lead-Karten zeigen displayIdentifier, Score,
// Pipeline-Status und Top-Signal.
//
// "Als kontaktiert markieren"-Action ist im Pilot deaktiviert
// (Inline-Mutation kommt Post-Demo). Button bleibt visuell
// vorhanden, ist aber disabled mit "Im Pilot verfuegbar"-
// Tooltip — Demo-Storytelling: "Hier wird die Aktion live
// laufen, der Backend-Pfad ist da, das UI ist die naechste
// Iteration."
//
// Labels: pro-Tenant Qualification-Labels werden parallel von
// /api/dashboard/labels geladen (ADR scoring-per-tenant). Bei
// Fehler Fallback auf Enum-Keys — Component crasht nicht.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, MessageSquareDashed, Globe } from "lucide-react";

// ---------- Types ----------

interface LeadActionItem {
  id: string;
  displayIdentifier: string;
  score: number;
  qualification: string;
  status: string;
  pipelineStatus: string;
  channel: string;
  appointmentAt: string | null;
  lastFollowUpAt: string | null;
  followUpCount: number;
  topSignal: string | null;
  createdAt: string;
}

interface ActionBoardResponse {
  waitingForFollowUp: LeadActionItem[];
  recentlyContacted: LeadActionItem[];
  appointmentsToday: LeadActionItem[];
  counts: {
    waitingForFollowUp: number;
    recentlyContacted: number;
    appointmentsToday: number;
  };
}

interface LabelsResponse {
  labels: Record<string, string>;
}

type ColumnKey = keyof Pick<
  ActionBoardResponse,
  "waitingForFollowUp" | "recentlyContacted" | "appointmentsToday"
>;

// ---------- Konstanten ----------

const PIPELINE_LABELS: Record<string, string> = {
  NEU: "Neu",
  QUALIFIZIERT: "Qualifiziert",
  TERMIN: "Termin",
  ANGEBOT: "Angebot",
  GEWONNEN: "Gewonnen",
};

const COLUMNS: ReadonlyArray<{
  key: ColumnKey;
  title: string;
  subtitle: string;
  icon: typeof Clock;
  emptyText: string;
}> = [
  {
    key: "waitingForFollowUp",
    title: "Auf Follow-Up wartend",
    subtitle: "Letzte Nachricht > 24h her",
    icon: Clock,
    emptyText: "Alles im Fluss — kein Follow-Up offen.",
  },
  {
    key: "recentlyContacted",
    title: "Kürzlich kontaktiert",
    subtitle: "Letzte 24 Stunden",
    icon: MessageSquareDashed,
    emptyText: "Noch keine Kontakte in den letzten 24h.",
  },
  {
    key: "appointmentsToday",
    title: "Termine heute",
    subtitle: "Berlin-Zeit",
    icon: Calendar,
    emptyText: "Heute stehen keine Termine an.",
  },
];

// ---------- Helpers ----------

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std`;
  const days = Math.round(hours / 24);
  return `vor ${days} T`;
}

function scoreTone(score: number): string {
  if (score >= 80) return "border-emerald-500/40 text-emerald-400 bg-emerald-500/10";
  if (score >= 60) return "border-[var(--gold)]/50 text-[var(--gold)] bg-[var(--gold)]/10";
  if (score >= 40) return "border-amber-500/40 text-amber-400 bg-amber-500/10";
  return "border-slate-500/40 text-slate-400 bg-slate-500/10";
}

// ---------- Skeleton ----------

function ColumnSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-5">
      <div className="mb-4 h-5 w-40 rounded bg-[var(--gold-border)]" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-[var(--gold-border)] opacity-30"
          />
        ))}
      </div>
      <span className="sr-only">Lade {title}</span>
    </div>
  );
}

// ---------- LeadCard ----------

function LeadCard({
  lead,
  columnKey,
  qualificationLabels,
}: {
  lead: LeadActionItem;
  columnKey: ColumnKey;
  qualificationLabels: Record<string, string>;
}) {
  const qualLabel = qualificationLabels[lead.qualification] ?? lead.qualification;
  const pipelineLabel = PIPELINE_LABELS[lead.pipelineStatus] ?? lead.pipelineStatus;
  const ChannelIcon = lead.channel === "WEB" ? Globe : null;

  let metaLine: string | null = null;
  if (columnKey === "appointmentsToday" && lead.appointmentAt) {
    metaLine = `${formatTime(lead.appointmentAt)} Uhr`;
  } else if (columnKey === "recentlyContacted" && lead.lastFollowUpAt) {
    metaLine = formatRelative(lead.lastFollowUpAt);
  } else if (columnKey === "waitingForFollowUp") {
    metaLine =
      lead.followUpCount > 0
        ? `${lead.followUpCount}/3 Follow-Ups gesendet`
        : "Noch kein Follow-Up";
  }

  return (
    <li className="group relative rounded-xl border border-[var(--gold-border)] bg-white/[0.02] p-4 transition-all hover:border-[var(--gold)]/60 hover:shadow-[0_0_0_1px_var(--gold-border)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {ChannelIcon ? (
              <ChannelIcon
                className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]"
                aria-label="Web-Widget"
              />
            ) : (
              <span
                className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400"
                aria-label="WhatsApp"
              >
                WA
              </span>
            )}
            <span
              className="truncate font-medium text-sm text-[var(--text)]"
              title={lead.displayIdentifier || "Unbenannter Lead"}
            >
              {lead.displayIdentifier || "Unbenannter Lead"}
            </span>
          </div>

          {metaLine && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">{metaLine}</p>
          )}
        </div>

        <span
          className={
            "shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums " +
            scoreTone(lead.score)
          }
          title={`Lead-Score: ${lead.score}/100`}
        >
          {lead.score}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px]">
        <span className="rounded-md border border-[var(--gold-border)] px-1.5 py-0.5 text-[var(--text-muted)]">
          {pipelineLabel}
        </span>
        <span className="rounded-md border border-[var(--gold-border)] px-1.5 py-0.5 text-[var(--text-muted)]">
          {qualLabel}
        </span>
      </div>

      {lead.topSignal && (
        <p className="mt-3 line-clamp-2 text-xs italic text-[var(--text-muted)]">
          &laquo;{lead.topSignal}&raquo;
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-[var(--gold-border)]/60 pt-3">
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-md bg-[var(--gold-border)]/40 px-3 py-1 text-xs text-[var(--text-muted)] opacity-60"
          title="Im Pilot verfügbar"
        >
          Als kontaktiert markieren
        </button>
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          Im Pilot
        </span>
      </div>
    </li>
  );
}

// ---------- Column ----------

function ActionColumn({
  column,
  leads,
  qualificationLabels,
}: {
  column: (typeof COLUMNS)[number];
  leads: LeadActionItem[];
  qualificationLabels: Record<string, string>;
}) {
  const Icon = column.icon;
  return (
    <div className="flex flex-col rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[var(--gold)]" />
            <h3 className="font-serif text-base text-[var(--text)]">
              {column.title}
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {column.subtitle}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-[var(--gold-border)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--gold)]">
          {leads.length}
        </span>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--gold-border)] py-10 text-center text-xs text-[var(--text-muted)]">
          {column.emptyText}
        </div>
      ) : (
        <ul className="space-y-2">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              columnKey={column.key}
              qualificationLabels={qualificationLabels}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- ActionBoard: Default-Export ----------

export default function ActionBoard() {
  const [data, setData] = useState<ActionBoardResponse | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchAll() {
      try {
        const [boardRes, labelsRes] = await Promise.all([
          fetch("/api/dashboard/action-board"),
          fetch("/api/dashboard/labels"),
        ]);
        if (!boardRes.ok) throw new Error("board fetch failed");
        const board = (await boardRes.json()) as ActionBoardResponse;
        // Labels-Fehler ist nicht kritisch — Fallback auf Enum-Keys.
        const labelsJson = labelsRes.ok
          ? ((await labelsRes.json()) as LabelsResponse)
          : { labels: {} };

        if (!cancelled) {
          setData(board);
          setLabels(labelsJson.labels ?? {});
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Action-Board nicht verfügbar");
          setLoading(false);
        }
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  // Phase 2e: drei separate Counts statt aggregierter Total —
  // Tages-Bilanz im Header zeigt Status pro Bucket.
  const summaryLine = useMemo(() => {
    if (loading) return "Lade nächste Schritte ...";
    if (error || !data) return "Daten temporär nicht verfügbar";
    return null;
  }, [loading, error, data]);

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl text-[var(--text)]">
            Action-Board
          </h2>
          {summaryLine ? (
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              {summaryLine}
            </p>
          ) : data ? (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-muted)]">
              <span>
                {data.counts.waitingForFollowUp}{" "}
                {data.counts.waitingForFollowUp === 1
                  ? "Lead wartet"
                  : "Leads warten"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {data.counts.recentlyContacted} in den letzten 24h kontaktiert
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {data.counts.appointmentsToday}{" "}
                {data.counts.appointmentsToday === 1
                  ? "Termin heute"
                  : "Termine heute"}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {COLUMNS.map((c) => (
            <ColumnSkeleton key={c.key} title={c.title} />
          ))}
        </div>
      ) : error || !data ? (
        <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--text-muted)]">
          {error ?? "Keine Daten"}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => (
            <ActionColumn
              key={column.key}
              column={column}
              leads={data[column.key]}
              qualificationLabels={labels}
            />
          ))}
        </div>
      )}
    </section>
  );
}
