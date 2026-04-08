// ============================================================
// AI Asset Studio – Bildbearbeitungs-Pipeline
// Nutzt Sharp fuer performante Bildverarbeitung.
// Bearbeitungen sind credits-neutral.
// Unterstuetzt: data URIs, HTTP URLs und lokale Dateipfade.
// ============================================================

import sharp from "sharp";
import type { EditRequest, EditResult, BrandKit } from "./types";
import { BRAND_KITS } from "./types";

// ---------- Bild-Quelle aufloesen ----------

/**
 * Laedt ein Bild aus verschiedenen Quellen in einen Buffer:
 * - data:image/...;base64,... (generierte Bilder)
 * - https://... oder http://... (externe URLs)
 * - Lokaler Dateipfad (CLI-Nutzung)
 */
async function resolveImageSource(source: string): Promise<Buffer> {
  // 1. Data URI (base64-kodiertes Bild)
  if (source.startsWith("data:")) {
    const base64Match = source.match(/^data:[^;]+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Ungueltiges data URI Format");
    }
    return Buffer.from(base64Match[1], "base64");
  }

  // 2. HTTP/HTTPS URL
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(source, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Bild-Download fehlgeschlagen: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  }

  // 3. Lokaler Dateipfad (fuer CLI)
  const fs = await import("fs/promises");
  return fs.readFile(source);
}

/**
 * Bearbeitet ein Bild mit den angegebenen Parametern.
 * Unterstuetzt: Schaerfe, abgerundete Ecken, Brand-Kit, Resize, Format-Konvertierung.
 * Gibt den bearbeiteten Buffer als data URI zurueck (serverless-kompatibel).
 */
export async function editImage(request: EditRequest): Promise<EditResult> {
  const { inputPath, format = "png", quality = 90 } = request;

  // Bild aus beliebiger Quelle laden
  const imageBuffer = await resolveImageSource(inputPath);
  let pipeline = sharp(imageBuffer);
  const metadata = await pipeline.metadata();

  let width = request.resize?.width ?? metadata.width ?? 1024;
  let height = request.resize?.height ?? metadata.height ?? 1024;

  // Resize wenn gewuenscht
  if (request.resize) {
    pipeline = pipeline.resize(request.resize.width, request.resize.height, {
      fit: "cover",
    });
    width = request.resize.width;
    height = request.resize.height;
  }

  // Schaerfe anwenden (0-100 → Sharp sigma 0.3-3.0)
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

  // Format und Qualitaet setzen
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

  // Buffer erzeugen (kein Dateisystem noetig – serverless-kompatibel)
  const outputBuffer = await pipeline.toBuffer();
  const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  const outputDataUri = `data:${mimeType};base64,${outputBuffer.toString("base64")}`;

  return {
    outputPath: outputDataUri,
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
