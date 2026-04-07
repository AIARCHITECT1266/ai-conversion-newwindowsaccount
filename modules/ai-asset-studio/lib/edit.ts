// ============================================================
// AI Asset Studio – Bildbearbeitungs-Pipeline
// Nutzt Sharp für performante Bildverarbeitung.
// Bearbeitungen sind credits-neutral.
// ============================================================

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import type { EditRequest, EditResult, BrandKit } from "./types";
import { BRAND_KITS } from "./types";

/**
 * Bearbeitet ein Bild mit den angegebenen Parametern.
 * Unterstützt: Schärfe, abgerundete Ecken, Brand-Kit, Resize, Format-Konvertierung.
 */
export async function editImage(request: EditRequest): Promise<EditResult> {
  const { inputPath, format = "png", quality = 90 } = request;

  // Eingabebild laden
  let pipeline = sharp(inputPath);
  const metadata = await pipeline.metadata();

  let width = request.resize?.width ?? metadata.width ?? 1024;
  let height = request.resize?.height ?? metadata.height ?? 1024;

  // Resize wenn gewünscht
  if (request.resize) {
    pipeline = pipeline.resize(request.resize.width, request.resize.height, {
      fit: "cover",
    });
    width = request.resize.width;
    height = request.resize.height;
  }

  // Schärfe anwenden (0-100 → Sharp sigma 0.3-3.0)
  if (request.sharpen && request.sharpen > 0) {
    const sigma = 0.3 + (request.sharpen / 100) * 2.7;
    pipeline = pipeline.sharpen({ sigma });
  }

  // Brand-Kit Overlay anwenden
  if (request.brandKit) {
    const kit = BRAND_KITS[request.brandKit];
    if (kit) {
      pipeline = await applyBrandKit(pipeline, kit, width, height);
    }
  }

  // Abgerundete Ecken
  if (request.roundCorners && request.roundCorners > 0) {
    pipeline = await applyRoundCorners(pipeline, request.roundCorners, width, height);
  }

  // Format und Qualität setzen
  switch (format) {
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
    case "jpeg":
      pipeline = pipeline.jpeg({ quality });
      break;
    default:
      pipeline = pipeline.png({ quality: Math.min(quality, 100) });
  }

  // Ausgabepfad generieren
  const inputBasename = path.basename(inputPath, path.extname(inputPath));
  const outputDir = path.dirname(inputPath);
  const outputPath = path.join(outputDir, `${inputBasename}_edited.${format}`);

  // Bild speichern
  const outputBuffer = await pipeline.toBuffer();
  await fs.writeFile(outputPath, outputBuffer);

  return {
    outputPath,
    format,
    width,
    height,
    fileSize: outputBuffer.length,
  };
}

/**
 * Wendet ein Brand-Kit auf das Bild an (farbiger Rand).
 */
async function applyBrandKit(
  pipeline: sharp.Sharp,
  kit: BrandKit,
  width: number,
  height: number
): Promise<sharp.Sharp> {
  const borderWidth = 4;

  // Farbigen Rahmen als SVG-Overlay erzeugen
  const borderSvg = Buffer.from(`
    <svg width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}"
            fill="none" stroke="${kit.primaryColor}" stroke-width="${borderWidth * 2}"
            rx="${kit.borderRadius}" ry="${kit.borderRadius}" />
    </svg>
  `);

  return pipeline.composite([
    { input: borderSvg, top: 0, left: 0 },
  ]);
}

/**
 * Wendet abgerundete Ecken auf das Bild an.
 */
async function applyRoundCorners(
  pipeline: sharp.Sharp,
  radius: number,
  width: number,
  height: number
): Promise<sharp.Sharp> {
  // Runde Ecken via SVG-Maske
  const roundedMask = Buffer.from(`
    <svg width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}"
            rx="${radius}" ry="${radius}" fill="white" />
    </svg>
  `);

  // Buffer extrahieren und Maske anwenden
  const imageBuffer = await pipeline.toBuffer();
  return sharp(imageBuffer)
    .ensureAlpha()
    .composite([
      {
        input: roundedMask,
        blend: "dest-in",
      },
    ]);
}
