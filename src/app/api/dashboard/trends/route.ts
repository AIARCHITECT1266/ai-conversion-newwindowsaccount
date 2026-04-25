// ============================================================
// Dashboard-API: Trend-Daten fuer Sparklines + Trend-Chart
//
// GET /api/dashboard/trends?range=7|14|30
//
// Liefert taegliche Buckets im UTC-Tag-Raster mit messages,
// newLeads, activeConversations und leadsByQualification fuer
// die Sparklines auf den KPI-Karten (range=7) und den grossen
// Trend-Chart (range=14|30).
//
// Performance: max. 4 DB-Queries pro Request:
//   1. Messages im Range (current+previous, fuer Vergleich)
//   2. Leads im Range (current+previous)
//   3. Aktueller ACTIVE-Stand
//   4. Approximation "ACTIVE vor range Tagen"
//
// Tenant-Isolation: jede Query hat tenantId im WHERE-Block.
// getDashboardTenant ist seit Phase 2b.5.1 mit react.cache
// gewrappt — pro Request nur ein DB-Read fuer Auth.
//
// Discovery-Referenz: docs/discovery-phase-2c-content.md
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import type { LeadQualification } from "@/generated/prisma/enums";

// ---------- Konstanten ----------

const ALLOWED_RANGES = [7, 14, 30] as const;
type Range = (typeof ALLOWED_RANGES)[number];
const DEFAULT_RANGE: Range = 7;

// ---------- Response-Types ----------

interface TrendBucket {
  date: string; // ISO-Date YYYY-MM-DD (UTC)
  messages: number;
  newLeads: number;
  activeConversations: number;
  leadsByQualification: Record<LeadQualification, number>;
}

interface TrendsSummary {
  messagesTotal: number;
  messagesPercentChange: number;
  newLeadsTotal: number;
  newLeadsPercentChange: number;
  activeConversationsCurrent: number;
  activeConversationsPercentChange: number;
}

interface TrendsResponse {
  range: Range;
  buckets: TrendBucket[];
  summary: TrendsSummary;
}

// ---------- Helpers ----------

function emptyQualMap(): Record<LeadQualification, number> {
  return {
    UNQUALIFIED: 0,
    MARKETING_QUALIFIED: 0,
    SALES_QUALIFIED: 0,
    OPPORTUNITY: 0,
    CUSTOMER: 0,
  };
}

// Round to 1 decimal. previous=0 → wenn current=0, return 0; sonst 100%.
function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  const pct = ((current - previous) / previous) * 100;
  return Math.round(pct * 10) / 10;
}

// UTC-Mitternacht der gegebenen Date-Instanz
function utcStartOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// ---------- Handler ----------

export async function GET(req: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const tenantId = tenant.id;

  // Range-Param parsen + validieren
  const rangeParam = req.nextUrl.searchParams.get("range");
  let range: Range = DEFAULT_RANGE;
  if (rangeParam !== null) {
    const parsed = Number.parseInt(rangeParam, 10);
    if (!ALLOWED_RANGES.includes(parsed as Range)) {
      return NextResponse.json({ error: "invalid_range" }, { status: 400 });
    }
    range = parsed as Range;
  }

  // Date-Boundaries in UTC
  const todayUtc = utcStartOfDay(new Date());
  // current period: [startCurrent, endCurrent) — inclusive heute, range Tage
  const startCurrent = new Date(todayUtc);
  startCurrent.setUTCDate(startCurrent.getUTCDate() - (range - 1));
  const endCurrent = new Date(todayUtc);
  endCurrent.setUTCDate(endCurrent.getUTCDate() + 1); // exklusiv: morgen 00:00 UTC
  // previous period: [startPrev, startCurrent) — die range Tage davor
  const startPrev = new Date(startCurrent);
  startPrev.setUTCDate(startPrev.getUTCDate() - range);

  try {
    const [messagesRange, leadsRange, currentActive, pastActive] =
      await Promise.all([
        // 1. Messages im current+previous Range
        db.message.findMany({
          where: {
            conversation: { tenantId },
            timestamp: { gte: startPrev, lt: endCurrent },
          },
          select: { timestamp: true },
        }),
        // 2. Leads im current+previous Range
        db.lead.findMany({
          where: {
            tenantId,
            createdAt: { gte: startPrev, lt: endCurrent },
          },
          select: { createdAt: true, qualification: true },
        }),
        // 3. Aktueller ACTIVE-Stand
        db.conversation.count({
          where: { tenantId, status: "ACTIVE" },
        }),
        // 4. Approximation "ACTIVE-Stand vor range Tagen": Conversations,
        //    die heute noch ACTIVE sind und vor dem Current-Range erstellt
        //    wurden. Approximation, weil ein echter historischer Snapshot
        //    nur mit Audit-Trail rekonstruierbar waere.
        db.conversation.count({
          where: {
            tenantId,
            status: "ACTIVE",
            createdAt: { lt: startCurrent },
          },
        }),
      ]);

    // Buckets initialisieren — einer pro Tag im current Range
    const buckets: TrendBucket[] = [];
    for (let i = 0; i < range; i++) {
      const bucketDate = new Date(startCurrent);
      bucketDate.setUTCDate(bucketDate.getUTCDate() + i);
      buckets.push({
        date: bucketDate.toISOString().slice(0, 10),
        messages: 0,
        newLeads: 0,
        activeConversations: 0,
        leadsByQualification: emptyQualMap(),
      });
    }

    // Bucket-Index-Helper. Datum vor startCurrent liefert -1 (=> Previous Period).
    const startCurrentMs = startCurrent.getTime();
    const bucketIndexFor = (date: Date): number => {
      const dayMs = utcStartOfDay(date).getTime();
      const idx = Math.floor((dayMs - startCurrentMs) / 86_400_000);
      if (idx < 0 || idx >= range) return -1;
      return idx;
    };

    // Messages bucketten + Previous-Period-Counter
    let messagesPrevTotal = 0;
    for (const msg of messagesRange) {
      if (msg.timestamp < startCurrent) {
        messagesPrevTotal++;
        continue;
      }
      const idx = bucketIndexFor(msg.timestamp);
      if (idx >= 0) buckets[idx].messages++;
    }

    // Leads bucketten + Previous-Period-Counter
    let newLeadsPrevTotal = 0;
    for (const lead of leadsRange) {
      if (lead.createdAt < startCurrent) {
        newLeadsPrevTotal++;
        continue;
      }
      const idx = bucketIndexFor(lead.createdAt);
      if (idx >= 0) {
        buckets[idx].newLeads++;
        buckets[idx].leadsByQualification[lead.qualification]++;
      }
    }

    // activeConversations pro Bucket: Snapshot-historisch nicht
    // rekonstruierbar ohne Audit-Trail. Pragmatisch: nur der letzte
    // Bucket (heute) bekommt den aktuellen Stand. Aeltere Buckets
    // bleiben 0 — die Sparkline zeigt also einen aufsteigenden
    // Treppen-Effekt am letzten Tag, was visuell ehrlicher ist als
    // konstante Linien.
    if (buckets.length > 0) {
      buckets[buckets.length - 1].activeConversations = currentActive;
    }

    // Summary
    const messagesTotal = buckets.reduce((s, b) => s + b.messages, 0);
    const newLeadsTotal = buckets.reduce((s, b) => s + b.newLeads, 0);
    const summary: TrendsSummary = {
      messagesTotal,
      messagesPercentChange: pctChange(messagesTotal, messagesPrevTotal),
      newLeadsTotal,
      newLeadsPercentChange: pctChange(newLeadsTotal, newLeadsPrevTotal),
      activeConversationsCurrent: currentActive,
      activeConversationsPercentChange: pctChange(currentActive, pastActive),
    };

    const response: TrendsResponse = { range, buckets, summary };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[trends] DB-Fehler", {
      tenantId,
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
