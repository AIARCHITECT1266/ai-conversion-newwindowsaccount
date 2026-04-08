// ============================================================
// AI Asset Studio – Bildbearbeitungs-Pipeline
// Nutzt Sharp fuer performante Bildverarbeitung.
// Unterstuetzt: data URIs, HTTP URLs und lokale Dateipfade.
// Effekte: Schaerfe, Helligkeit, Kontrast, Saettigung,
//          Vignette, abgerundete Ecken, Brand-Kit, Resize.
// ============================================================

import sharp from "sharp";
import type { EditRequest, EditResult, BrandKit } from "./types";
import { BRAND_KITS } from "./types";

// ---------- Bild-Quelle aufloesen ----------

async function resolveImageSource(source: string): Promise<Buffer> {
  // Data URI (base64)
  if (source.startsWith("data:")) {
    const base64Match = source.match(/^data:[^;]+;base64,(.+)$/);
    if (!base64Match) throw new Error("Ungueltiges data URI Format");
    return Buffer.from(base64Match[1], "base64");
  }

  // HTTP/HTTPS URL
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(source, { signal: controller.signal });
      if (!response.ok) throw new Error(`Bild-Download fehlgeschlagen: ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } finally {
      clearTimeout(timeout);
    }
  }

  // Lokaler Dateipfad (CLI)
  const fs = await import("fs/promises");
  return fs.readFile(source);
}

// ---------- Hauptfunktion ----------

export async function editImage(request: EditRequest): Promise<EditResult> {
  const { inputPath, format = "png", quality = 90 } = request;

  const imageBuffer = await resolveImageSource(inputPath);
  let pipeline = sharp(imageBuffer);
  const metadata = await pipeline.metadata();

  let width = request.resize?.width ?? metadata.width ?? 1024;
  let height = request.resize?.height ?? metadata.height ?? 1024;

  // ---------- Resize ----------
  if (request.resize) {
    pipeline = pipeline.resize(request.resize.width, request.resize.height, { fit: "cover" });
    width = request.resize.width;
    height = request.resize.height;
  }

  // ---------- Helligkeit + Saettigung (modulate) ----------
  const hasBrightness = request.brightness !== undefined && request.brightness !== 0;
  const hasSaturation = request.saturation !== undefined && request.saturation !== 0;

  if (hasBrightness || hasSaturation) {
    // Staerker als vorher — passt zu CSS-Filter-Preview
    // Helligkeit: -100..+100 → 0.0..2.0 (vorher 0.3..1.7)
    const brightnessFactor = hasBrightness
      ? 1 + (request.brightness! / 100)
      : 1;
    // Saettigung: -100..+100 → 0..3 (vorher 0..2)
    const saturationFactor = hasSaturation
      ? 1 + (request.saturation! / 100) * 2
      : 1;

    pipeline = pipeline.modulate({
      brightness: Math.max(0, brightnessFactor),
      saturation: Math.max(0, saturationFactor),
    });
  }

  // ---------- Kontrast (linear) ----------
  if (request.contrast !== undefined && request.contrast !== 0) {
    // Staerker — -100..+100 → Multiplikator 0.0..3.0 (passt zu CSS contrast())
    const a = 1 + (request.contrast / 100) * 2;
    const b = 128 * (1 - a);
    pipeline = pipeline.linear(Math.max(0, a), b);
  }

  // ---------- Schaerfe (sigma 1.0 - 10.0, sehr deutlich sichtbar) ----------
  if (request.sharpen && request.sharpen > 0) {
    const sigma = 1.0 + (request.sharpen / 100) * 9.0;
    pipeline = pipeline.sharpen({
      sigma,
      m1: 2.0,
      m2: 3.0,
    });
  }

  // ---------- Brand-Kit Overlay ----------
  if (request.brandKit) {
    const kit = BRAND_KITS[request.brandKit];
    if (kit) {
      pipeline = await applyBrandKit(pipeline, kit, width, height);
    }
  }

  // ---------- Vignette ----------
  if (request.vignette && request.vignette > 0) {
    pipeline = await applyVignette(pipeline, request.vignette, width, height);
  }

  // ---------- Abgerundete Ecken (als letzter Schritt) ----------
  if (request.roundCorners && request.roundCorners > 0) {
    pipeline = await applyRoundCorners(pipeline, request.roundCorners, width, height);
  }

  // ---------- Ausgabe-Format ----------
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

// ---------- Brand-Kit (farbiger Rahmen) ----------

async function applyBrandKit(
  pipeline: sharp.Sharp,
  kit: BrandKit,
  width: number,
  height: number,
): Promise<sharp.Sharp> {
  const border = 6;
  const borderSvg = Buffer.from(
    `<svg width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}"
            fill="none" stroke="${kit.primaryColor}" stroke-width="${border * 2}"
            rx="${kit.borderRadius}" ry="${kit.borderRadius}" />
    </svg>`
  );
  return pipeline.composite([{ input: borderSvg, top: 0, left: 0 }]);
}

// ---------- Vignette (radialer Schatten) ----------

async function applyVignette(
  pipeline: sharp.Sharp,
  strength: number,
  width: number,
  height: number,
): Promise<sharp.Sharp> {
  // Staerker: Opacity 0.3 bis 0.95, innerer Bereich schrumpft deutlich
  const opacity = 0.3 + (strength / 100) * 0.65;
  const innerStop = Math.max(0, 55 - strength * 0.5);

  const vignetteSvg = Buffer.from(
    `<svg width="${width}" height="${height}">
      <defs>
        <radialGradient id="v" cx="50%" cy="50%" r="70%">
          <stop offset="${innerStop}%" stop-color="black" stop-opacity="0"/>
          <stop offset="100%" stop-color="black" stop-opacity="${opacity}"/>
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#v)"/>
    </svg>`
  );

  return pipeline.composite([{ input: vignetteSvg, blend: "multiply" }]);
}

// ---------- Abgerundete Ecken ----------

async function applyRoundCorners(
  pipeline: sharp.Sharp,
  radius: number,
  width: number,
  height: number,
): Promise<sharp.Sharp> {
  const roundedMask = Buffer.from(
    `<svg width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}"
            rx="${radius}" ry="${radius}" fill="white" />
    </svg>`
  );

  const imageBuffer = await pipeline.toBuffer();
  return sharp(imageBuffer)
    .ensureAlpha()
    .composite([{ input: roundedMask, blend: "dest-in" }]);
}
