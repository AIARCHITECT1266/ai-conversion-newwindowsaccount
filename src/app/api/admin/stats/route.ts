// ============================================================
// Admin-API: Lead-Pipeline-Statistiken
// GET: Aggregierte Pipeline-Daten pro Tenant + Global
// Hinweis: Keine Authentifizierung – nur für lokale Nutzung/Tests
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Globale Lead-Pipeline-Zahlen
    const pipeline = await db.lead.groupBy({
      by: ["qualification"],
      _count: { id: true },
    });

    // Lead-Status-Verteilung
    const statusDistribution = await db.lead.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    // Pro Tenant: Letzter Kontakt (neueste Nachricht)
    const tenants = await db.tenant.findMany({
      select: {
        id: true,
        conversations: {
          select: {
            messages: {
              select: { timestamp: true },
              orderBy: { timestamp: "desc" },
              take: 1,
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
        leads: {
          select: { qualification: true, status: true },
        },
      },
    });

    // Letzten Kontakt und Lead-Pipeline pro Tenant aufbereiten
    const tenantStats = tenants.map((t) => {
      const lastMessage = t.conversations[0]?.messages[0]?.timestamp ?? null;
      const leadPipeline = {
        UNQUALIFIED: 0,
        MARKETING_QUALIFIED: 0,
        SALES_QUALIFIED: 0,
        OPPORTUNITY: 0,
        CUSTOMER: 0,
      };
      for (const lead of t.leads) {
        leadPipeline[lead.qualification]++;
      }
      return {
        tenantId: t.id,
        lastContact: lastMessage,
        leadPipeline,
      };
    });

    return NextResponse.json({
      pipeline: Object.fromEntries(
        pipeline.map((p) => [p.qualification, p._count.id])
      ),
      statusDistribution: Object.fromEntries(
        statusDistribution.map((s) => [s.status, s._count.id])
      ),
      tenantStats,
    });
  } catch (error) {
    console.error("[Admin] Fehler beim Laden der Statistiken", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
