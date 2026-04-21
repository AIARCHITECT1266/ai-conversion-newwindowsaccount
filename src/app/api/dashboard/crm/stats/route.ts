// ============================================================
// GET /api/dashboard/crm/stats – CRM-Erfolgsmetriken
// Berechnet Conversion-Rates, Durchschnittszeit bis Qualifiziert,
// Pipeline-Werte pro Stufe.
// ============================================================

import { NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Alle Leads des Tenants mit Conversation-Daten laden
  const leads = await db.lead.findMany({
    where: { tenantId: tenant.id },
    take: 1000,
    select: {
      id: true,
      pipelineStatus: true,
      dealValue: true,
      createdAt: true,
      conversation: {
        select: { createdAt: true },
      },
    },
  });

  // Pipeline-Counts pro Status
  const counts: Record<string, number> = {
    NEU: 0, QUALIFIZIERT: 0, TERMIN: 0, ANGEBOT: 0, GEWONNEN: 0,
  };
  // Deal-Werte pro Status
  const values: Record<string, number> = {
    NEU: 0, QUALIFIZIERT: 0, TERMIN: 0, ANGEBOT: 0, GEWONNEN: 0,
  };

  for (const lead of leads) {
    counts[lead.pipelineStatus]++;
    values[lead.pipelineStatus] += lead.dealValue ?? 0;
  }

  const total = leads.length;

  // Conversion-Rates pro Stufe
  // "Qualifiziert" = alle die QUALIFIZIERT oder weiter sind
  const reachedQualifiziert = total - counts.NEU;
  const reachedTermin = reachedQualifiziert - counts.QUALIFIZIERT;
  const reachedAngebot = reachedTermin - counts.TERMIN;
  const reachedGewonnen = counts.GEWONNEN;

  const conversionRates = {
    neuToQualifiziert: total > 0 ? Math.round((reachedQualifiziert / total) * 100) : 0,
    qualifiziertToTermin: reachedQualifiziert > 0 ? Math.round((reachedTermin / reachedQualifiziert) * 100) : 0,
    terminToAngebot: reachedTermin > 0 ? Math.round((reachedAngebot / reachedTermin) * 100) : 0,
    angebotToGewonnen: reachedAngebot > 0 ? Math.round((reachedGewonnen / reachedAngebot) * 100) : 0,
  };

  // Durchschnittszeit bis Qualifiziert (Conversation-Start → Lead wurde qualifiziert)
  // Wir messen die Zeit von Conversation-Erstellung bis Lead-Erstellung
  // für alle Leads die mindestens QUALIFIZIERT erreicht haben
  const qualifiedLeads = leads.filter(
    (l) => l.pipelineStatus !== "NEU"
  );

  let avgTimeToQualifyMs = 0;
  if (qualifiedLeads.length > 0) {
    const totalMs = qualifiedLeads.reduce((sum, lead) => {
      const convStart = new Date(lead.conversation.createdAt).getTime();
      const leadCreated = new Date(lead.createdAt).getTime();
      return sum + (leadCreated - convStart);
    }, 0);
    avgTimeToQualifyMs = totalMs / qualifiedLeads.length;
  }

  // In Stunden und Minuten umrechnen
  const avgHours = Math.floor(avgTimeToQualifyMs / (1000 * 60 * 60));
  const avgMinutes = Math.floor((avgTimeToQualifyMs % (1000 * 60 * 60)) / (1000 * 60));

  // Pipeline-Gesamtwert
  const totalPipelineValue = leads.reduce((sum, l) => sum + (l.dealValue ?? 0), 0);
  const gewonnenValue = values.GEWONNEN;

  return NextResponse.json({
    totalLeads: total,
    counts,
    values,
    conversionRates,
    avgTimeToQualify: {
      hours: avgHours,
      minutes: avgMinutes,
      totalMs: avgTimeToQualifyMs,
    },
    totalPipelineValue,
    gewonnenValue,
  });
}
