import { NextResponse } from "next/server";
import { db } from "@/shared/db";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { decryptText } from "@/modules/encryption/aes";
import { loadQualificationLabels } from "@/modules/bot/scoring";
import { QUALIFICATION_ORDER_LOW_TO_HIGH } from "@/lib/scoring/qualification-order";

// GET /api/dashboard/stats — Tenant wird aus dem Cookie aufgelöst
export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const tenantId = tenant.id;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    conversationsToday,
    activeConversations,
    newLeadsToday,
    totalLeads,
    customerLeads,
    recentConversations,
    pipelineRaw,
    messagesLast24h,
    appointmentsLast24h,
    tenantLabelConfig,
  ] = await Promise.all([
    // Conversations heute
    db.conversation.count({
      where: { tenantId, createdAt: { gte: todayStart } },
    }),

    // Aktive Conversations
    db.conversation.count({
      where: { tenantId, status: "ACTIVE" },
    }),

    // Neue Leads heute
    db.lead.count({
      where: { tenantId, createdAt: { gte: todayStart } },
    }),

    // Alle Leads (für Konversionsrate)
    db.lead.count({
      where: { tenantId },
    }),

    // Konvertierte Leads
    db.lead.count({
      where: { tenantId, qualification: "CUSTOMER" },
    }),

    // Letzte 5 Conversations mit letzter Nachricht
    db.conversation.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
          select: { contentEncrypted: true, timestamp: true },
        },
      },
    }),

    // Lead-Pipeline nach Qualification gruppiert
    db.lead.groupBy({
      by: ["qualification"],
      where: { tenantId },
      _count: { id: true },
    }),

    // Nachrichten letzte 24h
    db.message.count({
      where: {
        conversation: { tenantId },
        timestamp: { gte: last24h },
      },
    }),

    // Termine letzte 24h (Leads mit appointmentAt in den letzten 24h gesetzt)
    db.lead.count({
      where: {
        tenantId,
        status: "APPOINTMENT_SET",
        appointmentAt: { not: null },
      },
    }),

    // Tenant-Labels fuer Pipeline-Stufen (ADR-002 scoring-per-tenant).
    // Nur das Labels-Feld — Tenant-Identitaet ist bereits durch
    // getDashboardTenant() authentisiert; kein Cross-Tenant-Risiko.
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { qualificationLabels: true },
    }),
  ]);

  // Konversionsrate berechnen
  const conversionRate = totalLeads > 0
    ? Math.round((customerLeads / totalLeads) * 100)
    : 0;

  // Pipeline-Verteilung aufbereiten.
  // Labels kommen primaer aus tenant.qualificationLabels (ADR-002
  // scoring-per-tenant). Wenn Feld null oder unvollstaendig ist,
  // faellt loadQualificationLabels() feldweise auf DEFAULT_QUALIFICATION_LABELS
  // zurueck — kein Crash bei partieller Konfiguration.
  const qualificationLabels = loadQualificationLabels({
    qualificationLabels: tenantLabelConfig?.qualificationLabels,
  });

  // Reihenfolge der Pipeline-Stufen — Source of Truth in
  // src/lib/scoring/qualification-order.ts (Phase: Qualification-
  // Order-Centralization). API-Response bleibt low→high; Frontend
  // (LeadPipeline-Section in dashboard/page.tsx) dreht fuer Display um.
  const qualificationOrder = QUALIFICATION_ORDER_LOW_TO_HIGH;
  const pipelineMap = new Map<string, number>(
    pipelineRaw.map((p) => [p.qualification, p._count.id])
  );
  const pipeline = qualificationOrder.map((q) => ({
    qualification: q,
    label: qualificationLabels[q],
    count: pipelineMap.get(q) ?? 0,
  }));

  // Letzte Conversations formatieren – verschlüsselte Nachrichten entschlüsseln
  const conversations = recentConversations.map((c) => {
    let lastMessage: string | null = null;
    if (c.messages[0]?.contentEncrypted) {
      try {
        lastMessage = decryptText(c.messages[0].contentEncrypted);
      } catch {
        // Entschlüsselung fehlgeschlagen – Platzhalter anzeigen
        lastMessage = "[Nachricht nicht lesbar]";
      }
    }

    return {
      id: c.id,
      // externalId kann seit Phase 3a.5 null sein (WEB-Channel). ?? null
      // macht den API-Contract explizit und verhindert undefined-Drift.
      externalId: c.externalId ?? null,
      status: c.status,
      updatedAt: c.updatedAt.toISOString(),
      lastMessage,
      lastMessageAt: c.messages[0]?.timestamp.toISOString() ?? null,
    };
  });

  return NextResponse.json({
    kpis: {
      conversationsToday,
      activeConversations,
      newLeadsToday,
      conversionRate,
    },
    conversations,
    pipeline,
    botActivity: {
      messagesLast24h,
      appointments: appointmentsLast24h,
    },
  });
}
