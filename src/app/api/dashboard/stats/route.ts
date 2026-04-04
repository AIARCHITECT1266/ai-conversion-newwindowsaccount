import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/dashboard/stats?tenantId=xxx
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId fehlt" }, { status: 400 });
  }

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
  ]);

  // Konversionsrate berechnen
  const conversionRate = totalLeads > 0
    ? Math.round((customerLeads / totalLeads) * 100)
    : 0;

  // Pipeline-Verteilung aufbereiten
  const qualificationLabels: Record<string, string> = {
    UNQUALIFIED: "Neu",
    MARKETING_QUALIFIED: "Kontaktiert",
    SALES_QUALIFIED: "Termin",
    OPPORTUNITY: "Konvertiert",
    CUSTOMER: "Verloren",
  };
  // Reihenfolge der Pipeline-Stufen
  const qualificationOrder = [
    "UNQUALIFIED",
    "MARKETING_QUALIFIED",
    "SALES_QUALIFIED",
    "OPPORTUNITY",
    "CUSTOMER",
  ];
  const pipelineMap = new Map<string, number>(
    pipelineRaw.map((p) => [p.qualification, p._count.id])
  );
  const pipeline = qualificationOrder.map((q) => ({
    qualification: q,
    label: qualificationLabels[q],
    count: pipelineMap.get(q) ?? 0,
  }));

  // Letzte Conversations formatieren
  const conversations = recentConversations.map((c) => ({
    id: c.id,
    externalId: c.externalId,
    status: c.status,
    updatedAt: c.updatedAt.toISOString(),
    lastMessage: c.messages[0]?.contentEncrypted ?? null,
    lastMessageAt: c.messages[0]?.timestamp.toISOString() ?? null,
  }));

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
