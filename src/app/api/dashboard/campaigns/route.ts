// ============================================================
// GET /api/dashboard/campaigns – Kampagnen-Liste
// POST /api/dashboard/campaigns – Kampagne anlegen
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getDashboardTenant } from "@/lib/dashboard-auth";
import { db } from "@/lib/db";

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const campaigns = await db.campaign.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
      isTemplate: true,
      templateData: true,
      createdAt: true,
      _count: { select: { leads: true } },
    },
  });

  return NextResponse.json({ campaigns });
}

export async function POST(request: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, isTemplate, templateData } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Name ist erforderlich (min. 2 Zeichen)" }, { status: 400 });
  }

  // Slug aus Name generieren
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Prüfen ob Slug bereits existiert
  const existing = await db.campaign.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug } },
  });

  if (existing) {
    return NextResponse.json({ error: "Kampagne mit diesem Namen existiert bereits" }, { status: 409 });
  }

  const campaign = await db.campaign.create({
    data: {
      tenantId: tenant.id,
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      isTemplate: isTemplate === true,
      templateData: templateData ? JSON.stringify(templateData) : null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
