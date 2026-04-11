// ============================================================
// upgrade-test-tenant.ts — Test-Tenant auf Growth-Plan setzen
//
// Phase-6.4-Vorbereitung: der internal-admin-Tenant hat per
// Default (seed-internal-admin.ts setzt keinen paddlePlan)
// paddlePlan=null, was detectPlanType zu STARTER aufloest.
// hasPlanFeature(null, "web_widget") returnt damit false und
// die Widget-Settings-Page zeigt den UpgradePrompt statt der
// Settings — unbrauchbar fuer E2E-Test.
//
// Dieses Skript setzt den paddlePlan-String auf "growth_monthly"
// (Paddle-Format wie in detectPlanType-Doc beschrieben), was die
// Klassifizierung zu GROWTH triggert und alle web_widget-
// abhaengigen Features aktiviert.
//
// Idempotent: wenn der Tenant bereits auf einem Nicht-STARTER-
// Plan (GROWTH/PROFESSIONAL/ENTERPRISE) ist, wird nichts
// geaendert — Rueckstufung auf "growth_monthly" bei einem
// hoeheren Plan waere fachlich falsch.
//
// Non-destruktiv: aktualisiert AUSSCHLIESSLICH den paddlePlan-
// String. Alle anderen Tenant-Felder bleiben unberuehrt.
//
// Ausfuehrung:
//   npx tsx src/scripts/upgrade-test-tenant.ts
//
// Dieses Skript ist initial als Test-Vorbereitung fuer Phase 6.4
// entstanden. Ob es langfristig im Repo verbleibt oder nach Abschluss
// von Phase 6 geloescht wird, ist eine separate Entscheidung.
// ============================================================

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const SLUG = "internal-admin";
const TARGET_PLAN = "growth_monthly";

// Idempotenz-Check: entspricht der detectPlanType-Logik aus
// src/modules/bot/system-prompts/index.ts (dort nicht importiert,
// weil tsx Path-Aliases nicht ohne Weiteres aufloest und die
// existierenden Scripts — rotate-dashboard-token.ts,
// generate-widget-keys.ts — ebenfalls keine Projekt-Module
// importieren). Bewusste kleine Duplikation an dieser einzigen
// Stelle, nicht wert, den Script-Loader zu konfigurieren.
function isAlreadyUpgraded(paddlePlan: string | null): boolean {
  if (!paddlePlan) return false;
  const normalized = paddlePlan.toLowerCase();
  return (
    normalized.includes("professional") ||
    normalized.includes("pro") ||
    normalized.includes("enterprise") ||
    normalized.includes("growth")
  );
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("[upgrade-test-tenant] DATABASE_URL ist nicht gesetzt.");
    process.exit(1);
  }

  const adapter = new PrismaPg(process.env.DATABASE_URL);
  const db = new PrismaClient({ adapter });

  try {
    // Tenant per Slug lesen. Kein findOrCreate, kein Fallback-Anlegen.
    const tenant = await db.tenant.findUnique({
      where: { slug: SLUG },
      select: { id: true, name: true, paddlePlan: true },
    });

    if (!tenant) {
      console.error(
        `[upgrade-test-tenant] Tenant "${SLUG}" nicht gefunden. ` +
          `Zuerst src/scripts/seed-internal-admin.ts ausfuehren.`,
      );
      process.exit(1);
    }

    const currentPlan = tenant.paddlePlan;
    const currentDisplay = currentPlan ?? "null (= STARTER per Default)";

    console.log(`[upgrade-test-tenant] Tenant: ${tenant.name}`);
    console.log(`[upgrade-test-tenant] Tenant-ID: ${tenant.id}`);
    console.log(`[upgrade-test-tenant] Slug: ${SLUG}`);
    console.log(`[upgrade-test-tenant] Aktueller paddlePlan: ${currentDisplay}`);

    if (isAlreadyUpgraded(currentPlan)) {
      console.log(
        `[upgrade-test-tenant] ✓ Plan ist bereits nicht STARTER. Keine ` +
          `Aenderung noetig. (Rueckstufung auf "${TARGET_PLAN}" waere ` +
          `fachlich falsch, falls der Tenant gerade auf PROFESSIONAL/` +
          `ENTERPRISE waere.)`,
      );
      return;
    }

    // NUR dieses eine Feld aktualisieren. Alle anderen Felder bleiben.
    await db.tenant.update({
      where: { id: tenant.id },
      data: { paddlePlan: TARGET_PLAN },
    });

    // Re-Read zur Verifikation, nicht auf den Write-Return vertrauen.
    const verify = await db.tenant.findUnique({
      where: { id: tenant.id },
      select: { paddlePlan: true },
    });

    console.log(
      `[upgrade-test-tenant] ✓ paddlePlan aktualisiert: ` +
        `"${currentDisplay}" → "${verify?.paddlePlan}"`,
    );
    console.log(
      `[upgrade-test-tenant]   detectPlanType-Klassifizierung: GROWTH`,
    );
    console.log(
      `[upgrade-test-tenant]   hasPlanFeature(.., "web_widget") = true`,
    );
    console.log(
      `[upgrade-test-tenant]   /dashboard/settings/widget zeigt jetzt ` +
        `die Settings statt des UpgradePrompt.`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(
    "[upgrade-test-tenant] Fehler:",
    err instanceof Error ? err.message : err,
  );
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
