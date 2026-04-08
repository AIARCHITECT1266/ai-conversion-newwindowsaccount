// ============================================================
// GET /api/dashboard/campaigns/[slug]/qrcode – QR-Code generieren
// Gibt PNG (Data-URL), SVG und QR-Tracking-Link zurueck
// QR-Link nutzt "qr:" Prefix fuer Source-Tracking
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";
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

  const tenantFull = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: { brandName: true },
  });

  // QR-Link mit "qr:" Prefix fuer Source-Tracking (unterscheidet von "campaign:" Link)
  const trackingLink = `https://wa.me/?text=qr:${campaign.slug}`;
  const linkTrackingUrl = `https://wa.me/?text=campaign:${campaign.slug}`;

  // PNG als Data-URL (512px, hohe Fehlerkorrektur)
  const qrDataUrl = await QRCode.toDataURL(trackingLink, {
    width: 512,
    margin: 2,
    color: { dark: "#1a1a2e", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });

  // SVG als String
  const qrSvg = await QRCode.toString(trackingLink, {
    type: "svg",
    margin: 2,
    color: { dark: "#1a1a2e", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });

  return NextResponse.json({
    qrDataUrl,
    qrSvg,
    trackingLink,
    linkTrackingUrl,
    campaignName: campaign.name,
    brandName: tenantFull?.brandName ?? tenant.name,
  });
}
