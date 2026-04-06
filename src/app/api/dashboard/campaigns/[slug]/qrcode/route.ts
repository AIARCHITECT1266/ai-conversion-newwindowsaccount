// ============================================================
// GET /api/dashboard/campaigns/[slug]/qrcode – QR-Code generieren
// Gibt QR-Code als Data-URL (PNG base64) zurück
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDashboardTenant } from "@/lib/dashboard-auth";
import { db } from "@/lib/db";
import QRCode from "qrcode";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { slug } = await params;

  const campaign = await db.campaign.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug } },
    select: { id: true, name: true, slug: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Kampagne nicht gefunden" }, { status: 404 });
  }

  // WhatsApp Phone-ID des Tenants für den Tracking-Link
  const tenantFull = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: { whatsappPhoneId: true, brandName: true },
  });

  const trackingLink = `https://wa.me/?text=campaign:${campaign.slug}`;

  // QR-Code als Data-URL generieren
  const qrDataUrl = await QRCode.toDataURL(trackingLink, {
    width: 512,
    margin: 2,
    color: { dark: "#1a1a2e", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });

  return NextResponse.json({
    qrDataUrl,
    trackingLink,
    campaignName: campaign.name,
    brandName: tenantFull?.brandName ?? tenant.name,
  });
}
