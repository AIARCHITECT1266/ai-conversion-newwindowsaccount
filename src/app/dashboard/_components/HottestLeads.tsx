"use client";

// ============================================================
// HottestLeads (Phase 2.5b Bonus)
//
// Top 3 Leads mit qualification = OPPORTUNITY, sortiert score desc.
// Demo-Drill-Down von Action-Board-Header ("X Leads warten") auf
// die heissesten Kandidaten.
//
// Self-contained Client Component — fetcht /api/dashboard/hottest-leads
// beim Mount. Loading-Skeleton, Empty-State, Error-State pro
// Component (Pattern-Konsistenz mit ActionBoard, TopSignals,
// YesterdayResults).
//
// Click-Through: Karte hat "In Konversation springen"-Link auf
// /dashboard/conversations/<conversationId>. Pattern aus Phase 2e
// Sub-Phase 5.4 (Letzte-Gespraeche-Click-Through).
//
// Mobile (<768px): Cards stacken vertikal (grid-cols-1).
// Desktop: drei Cards nebeneinander (md:grid-cols-3).
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, ArrowUpRight, MessageSquareDashed } from "lucide-react";

// ---------- Types ----------

interface HottestLead {
  id: string;
  score: number;
  qualification: string;
  displayIdentifier: string;
  topSignal: string | null;
  conversationId: string | null;
  createdAt: string;
}

interface HottestLeadsResponse {
  leads: HottestLead[];
}

// ---------- Helpers ----------

// Score-Tone identisch zu ActionBoard.tsx:scoreTone — gleiche
// Schwellenwerte (80/60/40), gleiche Tailwind-Klassen.
function scoreTone(score: number): string {
  if (score >= 80)
    return "border-emerald-500/40 text-emerald-400 bg-emerald-500/10";
  if (score >= 60)
    return "border-[var(--gold)]/50 text-[var(--gold)] bg-[var(--gold)]/10";
  if (score >= 40)
    return "border-amber-500/40 text-amber-400 bg-amber-500/10";
  return "border-slate-500/40 text-slate-400 bg-slate-500/10";
}

// ---------- Skeleton ----------

function HottestLeadsSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-6">
      <div className="mb-6 h-5 w-48 rounded bg-[var(--gold-border)]" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-xl bg-[var(--gold-border)] opacity-30"
          />
        ))}
      </div>
    </div>
  );
}

// ---------- Lead-Card ----------

function HottestLeadCard({ lead }: { lead: HottestLead }) {
  const cardInner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span
            className="block truncate font-medium text-sm text-[var(--text)]"
            title={lead.displayIdentifier || "Unbenannter Lead"}
          >
            {lead.displayIdentifier || "Unbenannter Lead"}
          </span>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Opportunity
          </p>
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

      {lead.topSignal ? (
        <p className="mt-3 line-clamp-2 text-xs italic text-[var(--text-muted)]">
          &laquo;{lead.topSignal}&raquo;
        </p>
      ) : (
        <p className="mt-3 text-xs italic text-[var(--text-muted)]/50">
          (Kein Top-Signal verfügbar)
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-[var(--gold-border)]/60 pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--gold)]">
          {lead.conversationId ? (
            <>
              In Konversation springen
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </>
          ) : (
            <>
              <MessageSquareDashed
                className="h-3.5 w-3.5 text-[var(--text-muted)]"
                aria-hidden
              />
              <span className="text-[var(--text-muted)]">
                Keine Konversation verknüpft
              </span>
            </>
          )}
        </span>
      </div>
    </>
  );

  // Bei verknuepfter Conversation: ganze Karte ist <Link>.
  // Edge-Case (sollte praktisch nicht vorkommen, weil Lead immer
  // einer Conversation gehoert): Karte als <div> mit Hinweis.
  if (lead.conversationId) {
    return (
      <li className="list-none">
        <Link
          href={`/dashboard/conversations/${lead.conversationId}`}
          className="group block rounded-xl border border-[var(--gold-border)] bg-white/[0.02] p-4 transition-all hover:border-[var(--gold)]/60 hover:bg-white/[0.04] hover:shadow-[0_0_0_1px_var(--gold-border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
        >
          {cardInner}
        </Link>
      </li>
    );
  }

  return (
    <li
      className="list-none rounded-xl border border-[var(--gold-border)] bg-white/[0.02] p-4 opacity-80"
      title="Keine Konversation verknüpft"
    >
      {cardInner}
    </li>
  );
}

// ---------- Default-Export ----------

export default function HottestLeads() {
  const [leads, setLeads] = useState<HottestLead[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchLeads() {
      try {
        const res = await fetch("/api/dashboard/hottest-leads");
        if (!res.ok) throw new Error("hottest-leads fetch failed");
        const data = (await res.json()) as HottestLeadsResponse;
        if (!cancelled) {
          setLeads(data.leads);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Heißeste Leads nicht verfügbar");
          setLoading(false);
        }
      }
    }
    fetchLeads();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <HottestLeadsSkeleton />;

  if (error || !leads) {
    return (
      <div className="rounded-2xl border border-[var(--gold-border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)]">
        {error ?? "Keine Daten"}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-2xl text-[var(--text)]">
            <Flame className="h-5 w-5 text-[var(--gold)]" aria-hidden />
            Heißeste Leads jetzt
          </h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {leads.length === 0
              ? "Heute noch keine Opportunity-Leads — schau vormittags wieder rein."
              : leads.length === 1
                ? "Top Opportunity, sortiert nach Score"
                : `Top ${leads.length} Opportunities, sortiert nach Score`}
          </p>
        </div>
      </div>

      {leads.length === 0 ? null : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {leads.map((lead) => (
            <HottestLeadCard key={lead.id} lead={lead} />
          ))}
        </ul>
      )}
    </section>
  );
}
