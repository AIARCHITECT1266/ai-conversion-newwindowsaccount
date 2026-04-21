// ============================================================
// GET /api/dashboard/campaigns – Kampagnen-Liste
// POST /api/dashboard/campaigns – Kampagne anlegen
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";
import { checkLimit } from "@/lib/plan-limits";

const campaignSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().max(2048).optional(),
  isTemplate: z.boolean().optional(),
  templateData: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const campaigns = await db.campaign.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 200,
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
  const result = campaignSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", details: result.error.flatten() },
      { status: 400 }
    );
  }
  const { name, description, isTemplate, templateData } = result.data;

  // Plan-Limit pruefen
  const gate = await checkLimit(tenant.id, tenant.paddlePlan, "campaigns");
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Plan-Limit erreicht", current: gate.current, limit: gate.limit, upgrade: true },
      { status: 403 },
    );
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
