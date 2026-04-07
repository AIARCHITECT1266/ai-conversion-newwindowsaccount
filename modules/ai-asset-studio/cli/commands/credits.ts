// ============================================================
// AI Asset Studio – CLI: credits Command
// Credit-Stand und Kontingent für einen Tenant anzeigen.
// ============================================================

import { parseArgs } from "node:util";
import { checkCredits } from "../../lib/credits";

export async function creditsCommand(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      tenant: { type: "string", short: "t" },
    },
  });

  const tenantId = values.tenant;
  if (!tenantId) {
    console.error("Fehler: --tenant <id> ist erforderlich.");
    process.exit(1);
  }

  const credits = await checkCredits(tenantId);

  console.log(`\n💳 AI Asset Studio – Credit-Stand`);
  console.log(`   Tenant: ${tenantId}\n`);
  console.log(`   Monatlich inklusive: ${credits.monthlyIncluded}`);
  console.log(`   Verbraucht:          ${credits.used}`);
  console.log(`   Bonus-Credits:       ${credits.bonusCredits}`);
  console.log(`   ─────────────────────`);
  console.log(`   Verfügbar:           ${credits.remaining}`);
  console.log();
}
