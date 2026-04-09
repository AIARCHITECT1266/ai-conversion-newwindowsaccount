// ============================================================
// Onboarding-API: Oeffentlicher Endpoint fuer Tenant-Erstellung
// Separiert vom Admin-API, mit eigenem Rate-Limiting.
// POST: Tenant erstellen (oeffentlich, rate-limited)
// Updates erfolgen ueber /api/dashboard/settings (Dashboard-Auth)
// oder /api/admin/tenants/[id] (Admin-Auth).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/shared/db";
import { checkRateLimit, getClientIp } from "@/shared/rate-limit";
import { hashToken, MAGIC_LINK_EXPIRY_MS } from "@/modules/auth/dashboard-auth";
import { auditLog } from "@/modules/compliance/audit-log";

// Zod-Schema fuer Tenant-Erstellung
const createSchema = z.object({
  dpaAccepted: z.literal(true, {
    message: "DPA muss akzeptiert werden",
  }),
  name: z.string().min(1, "Firmenname fehlt").max(255),
  slug: z.string().min(1, "Slug fehlt").max(64),
  whatsappPhoneId: z.string().min(1, "WhatsApp Phone ID fehlt").max(64),
  brandName: z.string().min(1, "Markenname fehlt").max(255),
  systemPrompt: z.string().max(10000).optional().default(""),
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
  dpaAcceptedAt: true,
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

    const rawToken = randomBytes(32).toString("hex");

    const tenant = await db.tenant.create({
      data: {
        name: body.name,
        slug,
        whatsappPhoneId: body.whatsappPhoneId,
        brandName: body.brandName,
        systemPrompt: body.systemPrompt,
        dashboardToken: hashToken(rawToken),
        dashboardTokenExpiresAt: new Date(Date.now() + MAGIC_LINK_EXPIRY_MS),
        dpaAcceptedAt: new Date(),
        isActive: false, // Onboarding: Standardmaessig inaktiv bis explizit aktiviert
      },
      select: PUBLIC_SELECT,
    });

    auditLog("gdpr.dpa_accepted", {
      tenantId: tenant.id,
      details: { acceptedAt: tenant.dpaAcceptedAt },
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

// PATCH entfernt – Tenant-Updates nur ueber authentifizierte Endpoints:
// - /api/dashboard/settings (Dashboard-Auth via Cookie)
// - /api/admin/tenants/[id] (Admin-Auth via Session)
