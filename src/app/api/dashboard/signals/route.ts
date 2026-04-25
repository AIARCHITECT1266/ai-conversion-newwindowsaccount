// ============================================================
// Dashboard-API: Top-Scoring-Signals-Aggregation
//
// GET /api/dashboard/signals?limit=10
//
// Aggregiert Lead.scoringSignals ueber alle Leads des Tenants
// und liefert die haeufigsten Signal-Strings mit Counts. Wird
// vom Top-Signals-Widget auf der Dashboard-Uebersicht genutzt.
//
// Performance: Eine DB-Query (alle Leads des Tenants mit
// scoringSignals-Feld), dann in-memory Counter-Map. Bei
// aktueller Tenant-Groesse (<100 Leads) trivial. Post-Demo
// koennte DB-side-Aggregation via raw SQL unnest() sinnvoll
// werden — TD-Eintrag, nicht jetzt.
//
// scoringSignals-Format laut ADR-002: Json? im Schema, in der
// Praxis ein Array of Strings (1-6 Eintraege pro Lead, je
// 1-200 Zeichen). Defensive Runtime-Type-Checks gegen Drift.
//
// Tenant-Isolation: Query mit tenantId im WHERE-Block.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";

// ---------- Konstanten ----------

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

// ---------- Response-Types ----------

interface SignalCount {
  signal: string;
  count: number;
}

interface SignalsResponse {
  signals: SignalCount[];
  totalLeads: number;
  leadsWithSignals: number;
}

// ---------- Handler ----------

export async function GET(req: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const tenantId = tenant.id;

  // Limit-Param parsen + validieren
  const limitParam = req.nextUrl.searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (limitParam !== null) {
    const parsed = Number.parseInt(limitParam, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      return NextResponse.json({ error: "invalid_limit" }, { status: 400 });
    }
    limit = parsed;
  }

  try {
    // Query 1: Total-Lead-Count fuer den Anteils-Vergleich
    // Query 2: Leads mit Signals — wir filtern null-Werte clientseitig,
    //   weil Prisma-Json-Filter (`{ not: null }`) bei Json-Feldern
    //   versionsabhaengig ist. Pragmatisch + sicher.
    const [totalLeads, leadsRaw] = await Promise.all([
      db.lead.count({ where: { tenantId } }),
      db.lead.findMany({
        where: { tenantId },
        select: { scoringSignals: true },
        // Cap auf 1000 Leads als Performance-Sicherung. Bei aktuellen
        // Tenant-Groessen (~32 Leads) irrelevant; ab Pilot-Skalierung
        // sollte die Aggregation DB-seitig laufen (Post-Demo-TD).
        take: 1000,
      }),
    ]);

    const counter = new Map<string, number>();
    let leadsWithSignals = 0;

    for (const lead of leadsRaw) {
      const signals = lead.scoringSignals;
      // Defensive Runtime-Type-Checks: das Feld ist Json? in Prisma,
      // erwartet ist string[]. Bei Drift (Object, null, falsche Strings)
      // skip statt crash — Console-Warn fuer Debugging.
      if (!Array.isArray(signals)) continue;

      let hasValidSignal = false;
      for (const sig of signals) {
        if (typeof sig !== "string") continue;
        const trimmed = sig.trim();
        if (trimmed.length === 0) continue;
        counter.set(trimmed, (counter.get(trimmed) ?? 0) + 1);
        hasValidSignal = true;
      }
      if (hasValidSignal) leadsWithSignals++;
    }

    // Top-N nach count desc, dann Signal-String alphabetisch als
    // Tiebreaker fuer deterministische Outputs.
    const sorted: SignalCount[] = [...counter.entries()]
      .map(([signal, count]) => ({ signal, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.signal.localeCompare(b.signal, "de");
      })
      .slice(0, limit);

    const response: SignalsResponse = {
      signals: sorted,
      totalLeads,
      leadsWithSignals,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[signals] DB-Fehler", {
      tenantId,
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
