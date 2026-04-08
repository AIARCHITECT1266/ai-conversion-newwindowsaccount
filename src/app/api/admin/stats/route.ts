// ============================================================
// Admin-API: Lead-Pipeline-Statistiken
// GET: Aggregierte Pipeline-Daten pro Tenant + Global
// Authentifizierung: via Middleware (Bearer-Token / Cookie)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import type { LeadQualification } from "@/generated/prisma/enums";

// Gueltige Qualifikationsstufen fuer typsichere Indexierung
const VALID_QUALIFICATIONS: LeadQualification[] = [
  "UNQUALIFIED",
  "MARKETING_QUALIFIED",
  "SALES_QUALIFIED",
  "OPPORTUNITY",
  "CUSTOMER",
];

export async function GET(request: NextRequest) {
  try {
    // Pagination: Standardmäßig max. 50 Tenants
    const take = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10) || 50,
      100
    );
    const skip = parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10) || 0;

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

    // Pro Tenant: Letzter Kontakt (paginiert)
    const [tenants, totalTenants] = await Promise.all([
      db.tenant.findMany({
        take,
        skip,
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
      }),
      db.tenant.count(),
    ]);

    // Letzten Kontakt und Lead-Pipeline pro Tenant aufbereiten
    const tenantStats = tenants.map((t) => {
      const lastMessage = t.conversations[0]?.messages[0]?.timestamp ?? null;
      const leadPipeline: Record<LeadQualification, number> = {
        UNQUALIFIED: 0,
        MARKETING_QUALIFIED: 0,
        SALES_QUALIFIED: 0,
        OPPORTUNITY: 0,
        CUSTOMER: 0,
      };
      for (const lead of t.leads) {
        // Typsichere Indexierung: Nur gueltige Qualifikationen zaehlen
        if (VALID_QUALIFICATIONS.includes(lead.qualification)) {
          leadPipeline[lead.qualification]++;
        }
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
      pagination: {
        total: totalTenants,
        limit: take,
        offset: skip,
      },
    });
  } catch (error) {
    console.error("[Admin] Fehler beim Laden der Statistiken", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
