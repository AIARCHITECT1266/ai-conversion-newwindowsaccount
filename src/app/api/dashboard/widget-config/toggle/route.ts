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
        error: "Web-Widget ist ab dem Growth-Plan verfuegbar",
        code: "plan_upgrade_required",
      },
      { status: 403 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungueltige Eingabe" }, { status: 400 });
  }

  const parseResult = toggleSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Ungueltige Eingabe",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { enabled } = parseResult.data;

  // Wenn aktiviert wird und noch kein Key existiert: einen erzeugen.
  // Wir inlinen die Generator-Logik statt fetch() aufs andere Route
  // zu machen - vermeidet einen zusaetzlichen HTTP-Hop und haelt
  // die Transaktion intakt.
  const existing = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: { webWidgetPublicKey: true },
  });

  let publicKey = existing?.webWidgetPublicKey ?? null;
  let keyGenerated = false;

  if (enabled && !publicKey) {
    publicKey = generatePublicKey();
    keyGenerated = true;
  }

  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      webWidgetEnabled: enabled,
      // Nur setzen, wenn wir tatsaechlich einen neuen Key erzeugt
      // haben. Sonst laufen wir nicht Gefahr, bestehende Keys zu
      // ueberschreiben.
      ...(keyGenerated && publicKey ? { webWidgetPublicKey: publicKey } : {}),
    },
  });

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
