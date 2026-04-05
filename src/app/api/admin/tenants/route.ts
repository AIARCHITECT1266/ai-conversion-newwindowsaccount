// ============================================================
// Admin-API: Tenant-Verwaltung
// POST: Neuen Mandanten anlegen
// GET: Alle Mandanten auflisten
// Authentifizierung: via Middleware (Bearer-Token / Cookie)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";

// Zod-Schema fuer Tenant-Erstellung
const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(64),
  whatsappPhoneId: z.string().min(1).max(64),
  brandName: z.string().min(1).max(255),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#000000"),
  retentionDays: z.number().int().min(1).max(3650).optional().default(90),
  systemPrompt: z.string().max(10000).optional().default(""),
});

// Felder die in API-Responses zurueckgegeben werden (ohne dashboardToken!)
const TENANT_PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  whatsappPhoneId: true,
  systemPrompt: true,
  brandName: true,
  brandColor: true,
  retentionDays: true,
  isActive: true,
  createdAt: true,
} as const;

// ---------- GET: Alle Tenants auflisten ----------

export async function GET() {
  try {
    const tenants = await db.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        ...TENANT_PUBLIC_SELECT,
        _count: {
          select: {
            conversations: true,
            leads: true,
          },
        },
      },
    });

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error("[Admin] Fehler beim Laden der Tenants", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// ---------- POST: Neuen Tenant anlegen ----------

export async function POST(request: NextRequest) {
  try {
    const rawBody: unknown = await request.json();

    // Zod-Validierung
    const parseResult = createTenantSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const body = parseResult.data;

    // Slug normalisieren (Kleinbuchstaben, keine Sonderzeichen)
    const slug = body.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug darf nach Normalisierung nicht leer sein" },
        { status: 400 }
      );
    }

    // Dashboard Magic-Link Token generieren
    const dashboardToken = randomBytes(32).toString("hex");

    const tenant = await db.tenant.create({
      data: {
        name: body.name,
        slug,
        whatsappPhoneId: body.whatsappPhoneId,
        brandName: body.brandName,
        brandColor: body.brandColor,
        retentionDays: body.retentionDays,
        systemPrompt: body.systemPrompt,
        dashboardToken,
        isActive: true,
      },
      // Nur oeffentliche Felder zurueckgeben – dashboardToken wird NICHT exponiert
      select: TENANT_PUBLIC_SELECT,
    });

    console.log("[Admin] Tenant erstellt", {
      tenantId: tenant.id,
      slug: tenant.slug,
    });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    // Duplikat-Fehler abfangen (slug oder whatsappPhoneId bereits vergeben)
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "Slug oder WhatsApp Phone ID bereits vergeben" },
        { status: 409 }
      );
    }

    console.error("[Admin] Fehler beim Erstellen des Tenants", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
