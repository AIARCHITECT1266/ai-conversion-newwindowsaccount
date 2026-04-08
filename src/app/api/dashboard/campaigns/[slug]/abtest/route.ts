// ============================================================
// A/B Test API für Kampagnen-Opener
// POST: Test erstellen, GET: Aktiven Test + Ergebnisse laden
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { slug } = await params;
  const campaign = await db.campaign.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug } },
    select: { id: true },
  });
  if (!campaign) return NextResponse.json({ error: "Kampagne nicht gefunden" }, { status: 404 });

  const abTests = await db.abTest.findMany({
    where: { campaignId: campaign.id },
    orderBy: { startedAt: "desc" },
  });

  // Gewinner-Vorschlag für aktive Tests > 14 Tage
  const enriched = abTests.map((test) => {
    const daysSinceStart = (Date.now() - new Date(test.startedAt).getTime()) / (1000 * 60 * 60 * 24);
    const rateA = test.sendsA > 0 ? (test.responsesA / test.sendsA) * 100 : 0;
    const rateB = test.sendsB > 0 ? (test.responsesB / test.sendsB) * 100 : 0;
    const suggestedWinner = daysSinceStart >= 14 && !test.winnerId
      ? (rateA > rateB ? "A" : rateB > rateA ? "B" : null)
      : null;

    return {
      ...test,
      rateA: Math.round(rateA * 10) / 10,
      rateB: Math.round(rateB * 10) / 10,
      daysSinceStart: Math.round(daysSinceStart),
      suggestedWinner,
    };
  });

  return NextResponse.json({ abTests: enriched });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { slug } = await params;
  const campaign = await db.campaign.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug } },
    select: { id: true },
  });
  if (!campaign) return NextResponse.json({ error: "Kampagne nicht gefunden" }, { status: 404 });

  const body = await request.json();
  const { variantA, variantB } = body;

  if (!variantA?.trim() || !variantB?.trim()) {
    return NextResponse.json({ error: "Beide Varianten sind erforderlich" }, { status: 400 });
  }

  // Vorherigen aktiven Test deaktivieren
  await db.abTest.updateMany({
    where: { campaignId: campaign.id, isActive: true },
    data: { isActive: false, endedAt: new Date() },
  });

  const abTest = await db.abTest.create({
    data: {
      campaignId: campaign.id,
      variantA: variantA.trim(),
      variantB: variantB.trim(),
    },
  });

  return NextResponse.json({ abTest }, { status: 201 });
}
