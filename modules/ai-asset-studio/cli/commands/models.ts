// ============================================================
// AI Asset Studio – CLI: models Command
// Modell-Verwaltung pro Tenant (aktivieren/deaktivieren/auflisten).
// ============================================================

import { parseArgs } from "node:util";
import { getEnabledModels, enableModel, disableModel } from "../../lib/models";
import type { ModelId } from "../../lib/types";

const VALID_MODELS: ModelId[] = ["grok", "claude", "gemini", "flux"];

export async function modelsCommand(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      tenant: { type: "string", short: "t" },
      list: { type: "boolean", short: "l", default: false },
      enable: { type: "string" },
      disable: { type: "string" },
    },
  });

  const tenantId = values.tenant;
  if (!tenantId) {
    console.error("Fehler: --tenant <id> ist erforderlich.");
    process.exit(1);
  }

  // Modell aktivieren
  if (values.enable) {
    const model = values.enable as ModelId;
    if (!VALID_MODELS.includes(model)) {
      console.error(`Ungültiges Modell: ${model}. Erlaubt: ${VALID_MODELS.join(", ")}`);
      process.exit(1);
    }
    await enableModel(tenantId, model);
    console.log(`✅ Modell "${model}" für Tenant ${tenantId} aktiviert.`);
  }

  // Modell deaktivieren
  if (values.disable) {
    const model = values.disable as ModelId;
    if (!VALID_MODELS.includes(model)) {
      console.error(`Ungültiges Modell: ${model}. Erlaubt: ${VALID_MODELS.join(", ")}`);
      process.exit(1);
    }
    await disableModel(tenantId, model);
    console.log(`❌ Modell "${model}" für Tenant ${tenantId} deaktiviert.`);
  }

  // Aktivierte Modelle auflisten (immer anzeigen wenn --list oder nach enable/disable)
  if (values.list || values.enable || values.disable) {
    const enabled = await getEnabledModels(tenantId);
    console.log(`\n📋 Aktivierte Modelle für Tenant ${tenantId}:`);
    if (enabled.length === 0) {
      console.log("   Keine Modelle aktiviert.");
    } else {
      for (const model of enabled) {
        console.log(`   ✓ ${model}`);
      }
    }
    console.log(`\n   Verfügbar: ${VALID_MODELS.join(", ")}\n`);
  }

  // Wenn weder list, enable noch disable angegeben
  if (!values.list && !values.enable && !values.disable) {
    console.error("Fehler: Bitte --list, --enable <modell> oder --disable <modell> angeben.");
    process.exit(1);
  }
}
