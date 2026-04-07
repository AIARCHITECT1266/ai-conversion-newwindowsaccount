// ============================================================
// AI Asset Studio – CLI: edit Command
// Vollständige Implementierung der Bildbearbeitung.
// Bearbeitungen sind credits-neutral.
// ============================================================

import { parseArgs } from "node:util";
import fs from "fs/promises";
import { editImage } from "../../lib/edit";
import { db } from "@/lib/db";

export async function editCommand(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(3),
    options: {
      sharpen: { type: "string" },
      "round-corners": { type: "string" },
      "brand-kit": { type: "string" },
      resize: { type: "string" },
      format: { type: "string", default: "png" },
      quality: { type: "string", default: "90" },
      tenant: { type: "string", short: "t" },
    },
    allowPositionals: true,
  });

  // Eingabedatei aus Positionals
  const inputPath = positionals[0];
  if (!inputPath) {
    console.error("Fehler: Bitte eine Bilddatei angeben.");
    console.error('Beispiel: edit bild.png --sharpen 75 --round-corners 18');
    process.exit(1);
  }

  // Prüfen ob Datei existiert
  try {
    await fs.access(inputPath);
  } catch {
    console.error(`Fehler: Datei nicht gefunden: ${inputPath}`);
    process.exit(1);
  }

  const tenantId = values.tenant;
  if (!tenantId) {
    console.error("Fehler: --tenant <id> ist erforderlich.");
    process.exit(1);
  }

  // Resize-Option parsen (Format: WxH)
  let resize: { width: number; height: number } | undefined;
  if (values.resize) {
    const parts = values.resize.split("x");
    if (parts.length === 2) {
      resize = {
        width: parseInt(parts[0], 10),
        height: parseInt(parts[1], 10),
      };
    }
  }

  const format = (values.format ?? "png") as "png" | "webp" | "jpeg";
  const quality = parseInt(values.quality ?? "90", 10);

  console.log(`\n🖌️  AI Asset Studio – Bearbeitung`);
  console.log(`   Datei: ${inputPath}`);
  if (values.sharpen) console.log(`   Schärfe: ${values.sharpen}%`);
  if (values["round-corners"]) console.log(`   Eckenradius: ${values["round-corners"]}px`);
  if (values["brand-kit"]) console.log(`   Brand-Kit: ${values["brand-kit"]}`);
  if (resize) console.log(`   Resize: ${resize.width}x${resize.height}`);
  console.log(`   Format: ${format}, Qualität: ${quality}%`);
  console.log(`   Tenant: ${tenantId}\n`);

  console.log("⏳ Bearbeite...");

  // Bearbeitung durchführen (credits-neutral)
  const result = await editImage({
    tenantId,
    inputPath,
    sharpen: values.sharpen ? parseInt(values.sharpen, 10) : undefined,
    roundCorners: values["round-corners"] ? parseInt(values["round-corners"], 10) : undefined,
    brandKit: values["brand-kit"],
    resize,
    format,
    quality,
  });

  // Bearbeitetes Asset in DB speichern (kein Credit-Abzug)
  const editParams = {
    sharpen: values.sharpen ? parseInt(values.sharpen, 10) : undefined,
    roundCorners: values["round-corners"] ? parseInt(values["round-corners"], 10) : undefined,
    brandKit: values["brand-kit"],
    resize,
    format,
    quality,
  };

  const asset = await db.asset.create({
    data: {
      tenantId,
      originalPrompt: `Bearbeitung: ${inputPath}`,
      modelUsed: "FLUX", // Platzhalter – Bearbeitung ist modellunabhängig
      status: "EDITED",
      imageUrl: result.outputPath,
      exportedFormats: JSON.stringify([format]),
      creditsUsed: 0, // Credits-neutral
      width: result.width,
      height: result.height,
      fileSize: result.fileSize,
      editParams: JSON.stringify(editParams),
      brandKit: values["brand-kit"],
    },
  });

  console.log(`   ✅ Bearbeitet: ${result.outputPath}`);
  console.log(`   📏 Größe: ${result.width}x${result.height}, ${formatFileSize(result.fileSize)}`);
  console.log(`   🆔 Asset-ID: ${asset.id}`);
  console.log(`\n✨ Bearbeitung abgeschlossen (0 Credits verbraucht).\n`);
}

/** Formatiert Dateigröße in lesbares Format */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
