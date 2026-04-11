// ============================================================
// POST /api/dashboard/widget-config/generate-key
//
// Idempotenter Endpoint: generiert einen neuen Widget-Public-Key
// fuer den authentifizierten Tenant, wenn noch keiner existiert.
// Wenn bereits ein Key vorhanden ist, wird dieser zurueckgegeben
// (kein Ueberschreiben ohne expliziten Rotate-Flag).
//
// Rotation: aktueller Scope ist "generate if missing". Ein
// expliziter Rotate-Endpoint (alter Key ungueltig setzen, neuer
// Key ausgeben) ist fuer Phase 7 oder spaeter geplant, wenn
// ein Pilot-Kunde einen Leak meldet.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
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

  // Bestehenden Key lesen. Wenn vorhanden: zurueckgeben (Idempotenz).
  const current = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: { webWidgetPublicKey: true },
  });

  if (current?.webWidgetPublicKey) {
    return NextResponse.json({
      publicKey: current.webWidgetPublicKey,
      created: false,
    });
  }

  // Kein Key vorhanden - neuen generieren und persistieren.
  // Collision-Check: webWidgetPublicKey ist @unique, bei (extrem
  // unwahrscheinlicher) Kollision wirft Prisma P2002, wir generieren
  // dann einen neuen. 96-Bit-Entropie macht Kollisionen praktisch
  // unmoeglich, aber die Retry-Schleife ist billige Absicherung.
  let newKey = generatePublicKey();
  let attempts = 0;
  const MAX_ATTEMPTS = 3;

  while (attempts < MAX_ATTEMPTS) {
    try {
      await db.tenant.update({
        where: { id: tenant.id },
        data: { webWidgetPublicKey: newKey },
      });
      break;
    } catch (err) {
      attempts += 1;
      if (attempts >= MAX_ATTEMPTS) {
        console.error(
          "[widget.generate-key] Konnte keinen eindeutigen Key erzeugen",
          err instanceof Error ? err.message : "unbekannt",
        );
        return NextResponse.json(
          { error: "Key-Generierung fehlgeschlagen, bitte erneut versuchen" },
          { status: 500 },
        );
      }
      newKey = generatePublicKey();
    }
  }

  // Audit-Log: Aktion + tenantId, KEIN publicKey-Wert im Detail.
  // Public-Key ist per Design oeffentlich, aber wir halten ihn
  // aus Log-Streams raus, um das Auffinden bei Tenant-Support
  // nicht an Log-Greps zu koppeln.
  auditLog("widget.public_key_generated", {
    tenantId: tenant.id,
    ip: hashIp(getClientIp(req)),
  });

  return NextResponse.json({
    publicKey: newKey,
    created: true,
  });
}
