// ============================================================
// Dashboard-API: Hottest Leads (Phase 2.5b Bonus)
//
// GET /api/dashboard/hottest-leads
//
// Liefert die Top 3 Leads des Tenants mit qualification =
// OPPORTUNITY, sortiert score desc, fuer das HottestLeads-Widget
// auf der Dashboard-Uebersicht.
//
// Use-Case: Sales-Team-Drill-Down auf die heissesten Kandidaten —
// "Wer ist gerade ready zum Anrufen?"
//
// Tenant-Isolation: tenantId aus getDashboardTenant(), in jeder
// Query als Filter (Pflicht laut Architektur-Doku).
//
// Display-Identifier-Resolution: pro Lead via
// resolveLeadDisplayIdentifier() aus @/lib/widget/publicKey
// (Single Source of Truth — Pattern aus action-board).
//
// scoringSignals → topSignal: erstes valides String-Element.
// Defensive Type-Checks gegen Schema-Drift (Json? in Prisma).
//
// Limit: hartkodiert 3. Threshold-Konfigurierbarkeit ist
// TD-Post-Demo-Hottest-Leads-Threshold (🟢, post-demo).
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/shared/db";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { resolveLeadDisplayIdentifier } from "@/lib/widget/publicKey";
import type { LeadQualification } from "@/generated/prisma/enums";

// ---------- Konstanten ----------

const RESULT_LIMIT = 3;

// ---------- Response-Types ----------

interface HottestLead {
  id: string;
  score: number;
  qualification: LeadQualification;
  displayIdentifier: string;
  topSignal: string | null;
  conversationId: string | null;
  createdAt: string;
}

interface HottestLeadsResponse {
  leads: HottestLead[];
}

// ---------- Helpers ----------

// Erstes valides Signal aus Lead.scoringSignals extrahieren —
// identische Logik wie in action-board/route.ts (Defense-in-Depth
// gegen Json-Drift, kein Crash bei Object oder gemischten Arrays).
function pickTopSignal(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  for (const sig of raw) {
    if (typeof sig !== "string") continue;
    const trimmed = sig.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

// ---------- Handler ----------

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const tenantId = tenant.id;

  try {
    // Tenant-Isolation: tenantId als ERSTES Feld im WHERE.
    // Composite-Key-Pattern (Pflicht laut CLAUDE.md).
    const leads = await db.lead.findMany({
      where: {
        tenantId,
        qualification: "OPPORTUNITY",
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: RESULT_LIMIT,
      select: {
        id: true,
        score: true,
        qualification: true,
        scoringSignals: true,
        createdAt: true,
        conversation: {
          select: {
            id: true,
            externalId: true,
            widgetVisitorMeta: true,
          },
        },
      },
    });

    const response: HottestLeadsResponse = {
      leads: leads.map((lead) => ({
        id: lead.id,
        score: lead.score,
        qualification: lead.qualification,
        displayIdentifier: resolveLeadDisplayIdentifier({
          widgetVisitorMeta: lead.conversation.widgetVisitorMeta,
          externalId: lead.conversation.externalId,
        }),
        topSignal: pickTopSignal(lead.scoringSignals),
        conversationId: lead.conversation.id ?? null,
        createdAt: lead.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    // Logging nur Counts und Fehlermeldung, KEIN Lead-PII
    // (DSGVO-Konform: kein displayName, keine Tokens).
    console.error("[hottest-leads] DB-Fehler", {
      tenantId,
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
