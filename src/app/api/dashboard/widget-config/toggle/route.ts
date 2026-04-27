// ============================================================
// POST /api/dashboard/widget-config/toggle
//
// Setzt webWidgetEnabled auf true oder false fuer den
// authentifizierten Tenant.
//
// Besonderheit: Wenn auf true geschaltet und noch kein
// Public-Key vorhanden ist, wird automatisch einer generiert.
// So kann der User mit einem einzigen Klick "Widget aktivieren"
// loslegen, ohne erst explizit einen Key zu beantragen.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { hasPlanFeature } from "@/lib/plan-limits";
import { generatePublicKey } from "@/lib/widget/publicKey";
import { auditLog } from "@/modules/compliance/audit-log";
import { getClientIp } from "@/shared/rate-limit";
import { db } from "@/shared/db";

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

const toggleSchema = z.object({
  enabled: z.boolean(),
});

export async function POST(req: NextRequest) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Plan-Gating via hasPlanFeature() - siehe widget-config/route.ts
  // Begruendungs-Kommentar.
  if (!hasPlanFeature(tenant.paddlePlan, "web_widget")) {
    return NextResponse.json(
      {
        error: "Web-Widget ist ab dem Growth-Plan verfügbar",
        code: "plan_upgrade_required",
      },
      { status: 403 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const parseResult = toggleSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Ungültige Eingabe",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { enabled } = parseResult.data;

  // Race-Safety: Key-Generierung atomar via updateMany mit
  // Conditional-Where. Zwei parallele Requests koennen nicht beide
  // einen neuen Key erzeugen, weil die where-Clause
  // `webWidgetPublicKey: null` nach dem ersten erfolgreichen Update
  // nicht mehr matched. Der zweite bekommt count=0 und faellt auf
  // enabled-only-Update zurueck.
  let publicKey: string | null = null;
  let keyGenerated = false;

  if (enabled) {
    const newKey = generatePublicKey();
    const keyResult = await db.tenant.updateMany({
      where: { id: tenant.id, webWidgetPublicKey: null },
      data: { webWidgetPublicKey: newKey, webWidgetEnabled: true },
    });

    if (keyResult.count > 0) {
      // Neuer Key wurde atomar erzeugt und gesetzt
      publicKey = newKey;
      keyGenerated = true;
    } else {
      // Key existiert bereits — nur enabled-Flag setzen
      await db.tenant.update({
        where: { id: tenant.id },
        data: { webWidgetEnabled: true },
      });
      // Bestehenden Key fuer Response laden
      const existing = await db.tenant.findUnique({
        where: { id: tenant.id },
        select: { webWidgetPublicKey: true },
      });
      publicKey = existing?.webWidgetPublicKey ?? null;
    }
  } else {
    await db.tenant.update({
      where: { id: tenant.id },
      data: { webWidgetEnabled: false },
    });
  }

  // Audit-Log: zwei Events wenn neuer Key erzeugt wurde.
  if (keyGenerated) {
    auditLog("widget.public_key_generated", {
      tenantId: tenant.id,
      ip: hashIp(getClientIp(req)),
    });
  }

  auditLog("widget.toggled", {
    tenantId: tenant.id,
    ip: hashIp(getClientIp(req)),
    details: { enabled, keyGenerated },
  });

  return NextResponse.json({
    success: true,
    enabled,
    publicKey,
    keyGenerated,
  });
}
