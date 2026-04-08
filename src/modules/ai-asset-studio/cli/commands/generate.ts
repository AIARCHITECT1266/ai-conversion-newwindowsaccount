// ============================================================
// AI Asset Studio – CLI: generate Command
// Vollständige Implementierung der Bildgenerierung.
// ============================================================

import { parseArgs } from "node:util";
import path from "path";
import fs from "fs/promises";
import { generateWithModel } from "../../lib/models";
import { db } from "@/shared/db";
import type { ModelId } from "../../lib/types";

const VALID_MODELS: ModelId[] = ["grok", "claude", "gemini", "flux"];

export async function generateCommand(): Promise<void> {
  // Argumente parsen (ab Index 3, da [0]=node, [1]=script, [2]=generate)
  const { values, positionals } = parseArgs({
    args: process.argv.slice(3),
    options: {
      model: { type: "string", short: "m", default: "flux" },
      variations: { type: "string", short: "v", default: "1" },
      width: { type: "string", short: "w", default: "1024" },
      height: { type: "string", short: "h", default: "1024" },
      tenant: { type: "string", short: "t" },
      output: { type: "string", short: "o", default: "./output" },
    },
    allowPositionals: true,
  });

  // Prompt aus Positionals zusammensetzen
  const prompt = positionals.join(" ");
  if (!prompt) {
    console.error("Fehler: Bitte einen Prompt angeben.");
    console.error('Beispiel: generate "Ein modernes Logo für ein Tech-Startup"');
    process.exit(1);
  }

  const tenantId = values.tenant;
  if (!tenantId) {
    console.error("Fehler: --tenant <id> ist erforderlich.");
    process.exit(1);
  }

  const model = values.model as ModelId;
  if (!VALID_MODELS.includes(model)) {
    console.error(`Fehler: Ungültiges Modell "${model}". Erlaubt: ${VALID_MODELS.join(", ")}`);
    process.exit(1);
  }

  const variations = Math.min(4, Math.max(1, parseInt(values.variations ?? "1", 10)));
  const width = parseInt(values.width ?? "1024", 10);
  const height = parseInt(values.height ?? "1024", 10);
  const outputDir = values.output ?? "./output";

  // Ausgabeverzeichnis erstellen
  await fs.mkdir(outputDir, { recursive: true });

  console.log(`\n🎨 AI Asset Studio – Generierung`);
  console.log(`   Modell: ${model}`);
  console.log(`   Prompt: "${prompt}"`);
  console.log(`   Variationen: ${variations}`);
  console.log(`   Größe: ${width}x${height}`);
  console.log(`   Tenant: ${tenantId}\n`);

  // Generierung starten
  console.log("⏳ Generiere...");

  const results = await generateWithModel({
    tenantId,
    prompt,
    model,
    variations,
    width,
    height,
  });

  // Ergebnisse speichern und in DB anlegen
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const filename = `asset_${model}_${Date.now()}_${i + 1}.png`;
    const outputPath = path.join(outputDir, filename);

    // Base64-Bilder auf Disk schreiben
    if (result.imageUrl.startsWith("data:")) {
      const base64Data = result.imageUrl.split(",")[1];
      await fs.writeFile(outputPath, Buffer.from(base64Data, "base64"));
      result.imageUrl = outputPath;
    } else {
      // URL-Bilder herunterladen
      const response = await fetch(result.imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(outputPath, buffer);
      result.fileSize = buffer.length;
      result.imageUrl = outputPath;
    }

    // Asset in DB speichern
    const asset = await db.asset.create({
      data: {
        tenantId,
        originalPrompt: prompt,
        modelUsed: model.toUpperCase() as never,
        status: "COMPLETED",
        imageUrl: result.imageUrl,
        exportedFormats: JSON.stringify(["png"]),
        creditsUsed: 1,
        width: result.width,
        height: result.height,
        fileSize: result.fileSize,
        versionHistory: JSON.stringify([
          {
            prompt,
            modelUsed: model,
            imageUrl: result.imageUrl,
            createdAt: new Date().toISOString(),
          },
        ]),
      },
    });

    console.log(`   ✅ Variation ${i + 1}: ${outputPath} (ID: ${asset.id})`);
  }

  console.log(`\n✨ ${results.length} Bild(er) generiert.\n`);
}
