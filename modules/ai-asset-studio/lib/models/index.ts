// ============================================================
// AI Asset Studio – Multi-Model-Handler
// Zentrale Steuerung der Model-Auswahl mit Tenant-Aktivierung.
// Pro Tenant können 1-4 Modelle aktiviert werden.
// ============================================================

import { db } from "@/shared/db";
import type { ModelId, ModelHandler, GenerateRequest, GenerateResult } from "../types";
import { checkCredits, deductCredits } from "../credits";
import { GrokHandler } from "./grok";
import { ClaudeHandler } from "./claude";
import { GeminiHandler } from "./gemini";
import { FluxHandler } from "./flux";

/** Registry aller verfügbaren Model-Handler */
const MODEL_REGISTRY: Record<ModelId, ModelHandler> = {
  grok: new GrokHandler(),
  claude: new ClaudeHandler(),
  gemini: new GeminiHandler(),
  flux: new FluxHandler(),
};

/**
 * Prüft ob ein Modell für einen Tenant aktiviert ist.
 */
export async function isModelEnabled(tenantId: string, model: ModelId): Promise<boolean> {
  const entry = await db.tenantAssetModel.findUnique({
    where: { tenantId_model: { tenantId, model: model.toUpperCase() as never } },
  });
  return entry?.isActive ?? false;
}

/**
 * Gibt alle aktivierten Modelle für einen Tenant zurück.
 */
export async function getEnabledModels(tenantId: string): Promise<ModelId[]> {
  const models = await db.tenantAssetModel.findMany({
    where: { tenantId, isActive: true },
    select: { model: true },
  });
  return models.map((m) => m.model.toLowerCase() as ModelId);
}

/**
 * Aktiviert ein Modell für einen Tenant.
 */
export async function enableModel(
  tenantId: string,
  model: ModelId,
  apiKeyRef?: string
): Promise<void> {
  await db.tenantAssetModel.upsert({
    where: { tenantId_model: { tenantId, model: model.toUpperCase() as never } },
    create: {
      tenantId,
      model: model.toUpperCase() as never,
      isActive: true,
      apiKeyRef,
    },
    update: {
      isActive: true,
      apiKeyRef,
    },
  });
}

/**
 * Deaktiviert ein Modell für einen Tenant.
 */
export async function disableModel(tenantId: string, model: ModelId): Promise<void> {
  await db.tenantAssetModel.updateMany({
    where: { tenantId, model: model.toUpperCase() as never },
    data: { isActive: false },
  });
}

/**
 * Hauptfunktion: Generiert Bilder mit dem gewählten Modell.
 * Prüft Credit-Kontingent und Modell-Aktivierung.
 */
export async function generateWithModel(request: GenerateRequest): Promise<GenerateResult[]> {
  const { tenantId, model, prompt, variations } = request;

  // 1. Prüfen ob Modell für Tenant aktiviert ist
  const enabled = await isModelEnabled(tenantId, model);
  if (!enabled) {
    throw new Error(
      `Modell "${model}" ist für diesen Tenant nicht aktiviert. ` +
      `Verfügbare Modelle: ${(await getEnabledModels(tenantId)).join(", ") || "keine"}`
    );
  }

  // 2. Credit-Kontingent prüfen (jede Variation kostet 1 Credit)
  const creditCheck = await checkCredits(tenantId, variations);
  if (!creditCheck.allowed) {
    throw new Error(
      `Nicht genügend Credits. Benötigt: ${variations}, Verfügbar: ${creditCheck.remaining}. ` +
      `Monatliches Kontingent: ${creditCheck.monthlyIncluded}, Verbraucht: ${creditCheck.used}`
    );
  }

  // 3. Handler aufrufen
  const handler = MODEL_REGISTRY[model];
  if (!handler) {
    throw new Error(`Unbekanntes Modell: ${model}`);
  }

  const results = await handler.generate(prompt, {
    variations,
    width: request.width,
    height: request.height,
  });

  // 4. Credits abziehen (nur für erfolgreich generierte Bilder)
  await deductCredits(tenantId, results.length);

  return results;
}
