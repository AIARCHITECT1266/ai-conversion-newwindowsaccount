// ============================================================
// Onboarding-API: Oeffentlicher Endpoint fuer Tenant-Erstellung
// Separiert vom Admin-API, mit eigenem Rate-Limiting.
// POST: Tenant erstellen
// PATCH: Tenant aktualisieren (System-Prompt, Aktivierung)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Zod-Schemas
const createSchema = z.object({
  name: z.string().min(1, "Firmenname fehlt").max(255),
  slug: z.string().min(1, "Slug fehlt").max(64),
  whatsappPhoneId: z.string().min(1, "WhatsApp Phone ID fehlt").max(64),
  brandName: z.string().min(1, "Markenname fehlt").max(255),
  systemPrompt: z.string().max(10000).optional().default(""),
});

const updateSchema = z.object({
  tenantId: z.string().min(1, "Tenant-ID fehlt"),
  systemPrompt: z.string().max(10000).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => data.systemPrompt !== undefined || data.isActive !== undefined, {
  message: "Mindestens systemPrompt oder isActive muss angegeben werden",
});

// Oeffentliche Felder (ohne dashboardToken)
const PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  whatsappPhoneId: true,
  brandName: true,
  brandColor: true,
  systemPrompt: true,
  isActive: true,
  createdAt: true,
} as const;

// ---------- POST: Neuen Tenant erstellen ----------

export async function POST(request: NextRequest) {
  // Strenges Rate-Limiting: 3 Tenant-Erstellungen pro Stunde pro IP
  const ip = getClientIp(request);
  const limit = await checkRateLimit(`onboarding-create:${ip}`, { max: 3, windowMs: 3600_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Zu viele Versuche. Bitte spaeter erneut probieren." },
      { status: 429 }
    );
  }

  try {
    const rawBody: unknown = await request.json();
    const parseResult = createSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const body = parseResult.data;

    // Slug normalisieren
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

    const dashboardToken = randomBytes(32).toString("hex");

    const tenant = await db.tenant.create({
      data: {
        name: body.name,
        slug,
        whatsappPhoneId: body.whatsappPhoneId,
        brandName: body.brandName,
        systemPrompt: body.systemPrompt,
        dashboardToken,
        isActive: false, // Onboarding: Standardmaessig inaktiv bis explizit aktiviert
      },
      select: PUBLIC_SELECT,
    });

    console.log("[Onboarding] Tenant erstellt", {
      tenantId: tenant.id,
      slug: tenant.slug,
    });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "Slug oder WhatsApp Phone ID bereits vergeben" },
        { status: 409 }
      );
    }

    console.error("[Onboarding] Fehler beim Erstellen", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

// ---------- PATCH: Tenant aktualisieren (System-Prompt / Aktivierung) ----------

export async function PATCH(request: NextRequest) {
  // Rate-Limiting: 10 Updates pro Minute pro IP
  const ip = getClientIp(request);
  const limit = await checkRateLimit(`onboarding-update:${ip}`, { max: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen" },
      { status: 429 }
    );
  }

  try {
    const rawBody: unknown = await request.json();
    const parseResult = updateSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { tenantId, ...data } = parseResult.data;

    const tenant = await db.tenant.update({
      where: { id: tenantId },
      data,
      select: PUBLIC_SELECT,
    });

    console.log("[Onboarding] Tenant aktualisiert", {
      tenantId: tenant.id,
      fields: Object.keys(data),
    });

    return NextResponse.json({ tenant });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json(
        { error: "Tenant nicht gefunden" },
        { status: 404 }
      );
    }

    console.error("[Onboarding] Fehler beim Aktualisieren", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
