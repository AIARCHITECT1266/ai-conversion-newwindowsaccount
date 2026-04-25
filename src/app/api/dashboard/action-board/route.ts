// ============================================================
// Dashboard-API: Action-Board (Phase 2c.3)
//
// GET /api/dashboard/action-board
//
// Liefert drei tenant-isolierte Lead-Buckets fuer das
// Action-Board-Widget:
//   1. waitingForFollowUp  Leads, die einen Follow-Up brauchen
//                          (status NEW/CONTACTED, kein Termin,
//                          followUpCount < 3, lastFollowUpAt
//                          aelter als 24h oder noch nie)
//   2. recentlyContacted   Leads, die in den letzten 24h einen
//                          Follow-Up bekommen haben
//   3. appointmentsToday   Leads mit appointmentAt im heutigen
//                          Berlin-Tag (00:00-23:59 lokale Zeit)
//
// Display-Identifier-Resolution: pro Lead via
// resolveLeadDisplayIdentifier() aus @/lib/widget/publicKey
// (Single Source of Truth — kein lokaler Mask-Helper).
//
// Tenant-Isolation: tenantId aus getDashboardTenant(), in jeder
// findMany-Query als Filter. Pflicht laut Architektur-Doku.
//
// Limit pro Bucket: 25 Eintraege. Bei aktueller Tenant-Groesse
// (<100 Leads) trivial; Post-Demo-Skalierung via Pagination.
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/shared/db";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { resolveLeadDisplayIdentifier } from "@/lib/widget/publicKey";
import type {
  Channel,
  LeadQualification,
  LeadStatus,
  PipelineStatus,
} from "@/generated/prisma/enums";

// ---------- Konstanten ----------

const BUCKET_LIMIT = 25;
const FOLLOW_UP_GAP_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_FOLLOW_UPS = 3;

// ---------- Response-Types ----------

interface LeadActionItem {
  id: string;
  displayIdentifier: string;
  score: number;
  qualification: LeadQualification;
  status: LeadStatus;
  pipelineStatus: PipelineStatus;
  channel: Channel;
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

// ---------- Helpers ----------

// Berlin-Tag-Fenster: Mitternacht heute bis Mitternacht morgen,
// als UTC-Date. Nutzt Intl.DateTimeFormat mit longOffset, damit
// CET/CEST automatisch korrekt aufgeloest wird (kein DST-Drift).
function getBerlinDayWindow(now: Date): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZoneName: "longOffset",
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const offset = get("timeZoneName").replace("GMT", "") || "+00:00";
  const start = new Date(`${dateStr}T00:00:00${offset}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

// Erstes valides Signal aus Lead.scoringSignals extrahieren.
// scoringSignals ist Json? in Prisma, in der Praxis string[] (laut
// ADR-002). Defensive Type-Checks gegen Drift — kein Crash bei
// Object oder gemischten Arrays, sondern null-Fallback.
function pickTopSignal(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  for (const sig of raw) {
    if (typeof sig !== "string") continue;
    const trimmed = sig.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

// Prisma-Lead mit Conversation-Join → LeadActionItem.
type LeadWithConversation = {
  id: string;
  score: number;
  qualification: LeadQualification;
  status: LeadStatus;
  pipelineStatus: PipelineStatus;
  appointmentAt: Date | null;
  lastFollowUpAt: Date | null;
  followUpCount: number;
  scoringSignals: unknown;
  createdAt: Date;
  conversation: {
    externalId: string | null;
    channel: Channel;
    widgetVisitorMeta: unknown;
  };
};

function toActionItem(lead: LeadWithConversation): LeadActionItem {
  return {
    id: lead.id,
    displayIdentifier: resolveLeadDisplayIdentifier({
      widgetVisitorMeta: lead.conversation.widgetVisitorMeta,
      externalId: lead.conversation.externalId,
    }),
    score: lead.score,
    qualification: lead.qualification,
    status: lead.status,
    pipelineStatus: lead.pipelineStatus,
    channel: lead.conversation.channel,
    appointmentAt: lead.appointmentAt?.toISOString() ?? null,
    lastFollowUpAt: lead.lastFollowUpAt?.toISOString() ?? null,
    followUpCount: lead.followUpCount,
    topSignal: pickTopSignal(lead.scoringSignals),
    createdAt: lead.createdAt.toISOString(),
  };
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
    const followUpThreshold = new Date(now.getTime() - FOLLOW_UP_GAP_MS);
    const recentThreshold = new Date(now.getTime() - FOLLOW_UP_GAP_MS);
    const { start: berlinDayStart, end: berlinDayEnd } = getBerlinDayWindow(now);

    const conversationSelect = {
      externalId: true,
      channel: true,
      widgetVisitorMeta: true,
    } as const;

    const leadSelect = {
      id: true,
      score: true,
      qualification: true,
      status: true,
      pipelineStatus: true,
      appointmentAt: true,
      lastFollowUpAt: true,
      followUpCount: true,
      scoringSignals: true,
      createdAt: true,
      conversation: { select: conversationSelect },
    } as const;

    // Drei Queries parallel — alle tenant-isoliert via tenantId im WHERE.
    const [waitingRaw, recentRaw, appointmentsRaw] = await Promise.all([
      db.lead.findMany({
        where: {
          tenantId,
          status: { in: ["NEW", "CONTACTED"] },
          appointmentAt: null,
          followUpCount: { lt: MAX_FOLLOW_UPS },
          OR: [
            { lastFollowUpAt: null },
            { lastFollowUpAt: { lt: followUpThreshold } },
          ],
        },
        select: leadSelect,
        orderBy: [{ score: "desc" }, { createdAt: "desc" }],
        take: BUCKET_LIMIT,
      }),
      db.lead.findMany({
        where: {
          tenantId,
          status: "CONTACTED",
          lastFollowUpAt: { gte: recentThreshold },
        },
        select: leadSelect,
        orderBy: { lastFollowUpAt: "desc" },
        take: BUCKET_LIMIT,
      }),
      db.lead.findMany({
        where: {
          tenantId,
          appointmentAt: { gte: berlinDayStart, lt: berlinDayEnd },
        },
        select: leadSelect,
        orderBy: { appointmentAt: "asc" },
        take: BUCKET_LIMIT,
      }),
    ]);

    const response: ActionBoardResponse = {
      waitingForFollowUp: waitingRaw.map(toActionItem),
      recentlyContacted: recentRaw.map(toActionItem),
      appointmentsToday: appointmentsRaw.map(toActionItem),
      counts: {
        waitingForFollowUp: waitingRaw.length,
        recentlyContacted: recentRaw.length,
        appointmentsToday: appointmentsRaw.length,
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[action-board] DB-Fehler", {
      tenantId,
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
