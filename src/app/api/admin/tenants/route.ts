// ============================================================
// Admin-API: Tenant-Verwaltung
// POST: Neuen Mandanten anlegen
// GET: Alle Mandanten auflisten
// Hinweis: Keine Authentifizierung – nur für lokale Nutzung/Tests
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ---------- GET: Alle Tenants auflisten ----------

export async function GET() {
  try {
    const tenants = await db.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        whatsappPhoneId: true,
        brandName: true,
        brandColor: true,
        retentionDays: true,
        isActive: true,
        createdAt: true,
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

interface CreateTenantBody {
  name: string;
  slug: string;
  whatsappPhoneId: string;
  brandName: string;
  brandColor?: string;
  retentionDays?: number;
  systemPrompt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateTenantBody;

    // Pflichtfelder prüfen
    if (!body.name || !body.slug || !body.whatsappPhoneId || !body.brandName) {
      return NextResponse.json(
        { error: "Pflichtfelder: name, slug, whatsappPhoneId, brandName" },
        { status: 400 }
      );
    }

    // Slug normalisieren (Kleinbuchstaben, keine Sonderzeichen)
    const slug = body.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-");

    const tenant = await db.tenant.create({
      data: {
        name: body.name,
        slug,
        whatsappPhoneId: body.whatsappPhoneId,
        brandName: body.brandName,
        brandColor: body.brandColor || "#000000",
        retentionDays: body.retentionDays || 90,
        systemPrompt: body.systemPrompt || "",
        isActive: true,
      },
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
