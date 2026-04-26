// ============================================================
// Dashboard-API: Yesterday-Results (Phase 2e)
//
// GET /api/dashboard/yesterday
//
// Liefert die Tages-Bilanz der gestrigen Leads (Berlin-Zeit,
// DST-aware) fuer das "Gestern"-Section-Widget der Dashboard-
// Uebersicht. Alle Counts sind tenant-isoliert via tenantId
// in jedem WHERE-Block.
//
// Response-Shape:
//   - date: ISO-Datum "YYYY-MM-DD" (gestern in Berlin-Zeit)
//   - totalLeads: int (Anzahl Leads in Yesterday-Window)
//   - byQualification: { UNQUALIFIED, MARKETING_QUALIFIED, ... }
//   - actionableCount: OPPORTUNITY + SALES_QUALIFIED-Summe
//   - topSignal: { text, count } oder null bei leerem Tag
//
// Berlin-Timezone-Pattern: Reuse von getBerlinDayWindow aus
// `@/lib/timezone-berlin` (in Phase 2e aus Phase 2c.3 extrahiert),
// daysOffset = -1 fuer den gestrigen Tag.
//
// topSignal-Aggregation: in-memory Counter ueber die
// scoringSignals der Yesterday-Leads. Defensive Type-Checks
// gegen Schema-Drift (Json? im Prisma-Schema, erwartet string[]).
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/shared/db";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import {
  getBerlinDayWindow,
  getBerlinDateIso,
} from "@/lib/timezone-berlin";
import { QUALIFICATION_ORDER_LOW_TO_HIGH } from "@/lib/scoring/qualification-order";
import type { LeadQualification } from "@/generated/prisma/enums";

// ---------- Konstanten ----------

// Defensive Index-Pruefung gegen Schema-Drift — Source of Truth
// fuer die Reihenfolge ist src/lib/scoring/qualification-order.ts
// (Phase: Qualification-Order-Centralization).
const QUALIFICATION_KEYS = QUALIFICATION_ORDER_LOW_TO_HIGH;

// ---------- Response-Types ----------

interface YesterdayResponse {
  date: string;
  totalLeads: number;
  byQualification: Record<LeadQualification, number>;
  actionableCount: number;
  topSignal: { text: string; count: number } | null;
}

// ---------- Handler ----------

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const tenantId = tenant.id;

  try {
    const now = new Date();
    // daysOffset = -1: gestriger Tag in Berlin-Zeit, DST-aware.
    const { start: yesterdayStart, end: yesterdayEnd } = getBerlinDayWindow(
      now,
      -1,
    );
    const dateIso = getBerlinDateIso(now, -1);

    // Tenant-Isolation: tenantId in jedem WHERE-Block.
    // Composite-Key-Pattern (Pflicht laut CLAUDE.md).
    const leadsYesterday = await db.lead.findMany({
      where: {
        tenantId,
        createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
      },
      select: { qualification: true, scoringSignals: true },
    });

    // Initialisiere alle Qualification-Keys mit 0, damit das
    // Frontend keine optionalen Lookups machen muss.
    const byQualification: Record<LeadQualification, number> = {
      UNQUALIFIED: 0,
      MARKETING_QUALIFIED: 0,
      SALES_QUALIFIED: 0,
      OPPORTUNITY: 0,
      CUSTOMER: 0,
    };

    const counter = new Map<string, number>();

    for (const lead of leadsYesterday) {
      // Qualification-Bucket inkrementieren — defensive
      // Index-Pruefung gegen Drift (theoretisch sollte das Enum
      // immer matchen, in der Praxis ein Sicherheitsnetz).
      if (QUALIFICATION_KEYS.includes(lead.qualification)) {
        byQualification[lead.qualification]++;
      }

      // topSignal-Aggregation analog signals/route.ts.
      const signals = lead.scoringSignals;
      if (!Array.isArray(signals)) continue;
      for (const sig of signals) {
        if (typeof sig !== "string") continue;
        const trimmed = sig.trim();
        if (trimmed.length === 0) continue;
        counter.set(trimmed, (counter.get(trimmed) ?? 0) + 1);
      }
    }

    const totalLeads = leadsYesterday.length;
    const actionableCount =
      byQualification.OPPORTUNITY + byQualification.SALES_QUALIFIED;

    // Top-Signal: haeufigster Eintrag, alphabetisch als Tiebreaker.
    let topSignal: { text: string; count: number } | null = null;
    if (counter.size > 0) {
      const sorted = [...counter.entries()].sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0], "de");
      });
      const [text, count] = sorted[0];
      topSignal = { text, count };
    }

    const response: YesterdayResponse = {
      date: dateIso,
      totalLeads,
      byQualification,
      actionableCount,
      topSignal,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[yesterday] DB-Fehler", {
      tenantId,
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
