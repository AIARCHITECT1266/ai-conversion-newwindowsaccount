// ============================================================
// AI Asset Studio – API: POST /api/asset-studio/edit
// Bildbearbeitung ueber HTTP-API. Credits-neutral.
// Unterstuetzt: JSON (assetId) + FormData (Datei-Upload)
// ============================================================

import { NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { editImage } from "@/modules/ai-asset-studio/lib/edit";
import { db } from "@/shared/db";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  // Authentifizierung
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  let inputSource: string;
  let sharpen: number | undefined;
  let brightness: number | undefined;
  let contrast: number | undefined;
  let saturation: number | undefined;
  let vignette: number | undefined;
  let roundCorners: number | undefined;
  let brandKit: string | undefined;
  let resize: { width: number; height: number } | undefined;
  let format: "png" | "webp" | "jpeg" = "png";
  let quality = 90;
  let originalPrompt = "Hochgeladenes Bild";

  // ---------- FormData: Datei-Upload ----------
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Kein Bild hochgeladen (Feld: file)" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Dateityp nicht erlaubt. Erlaubt: JPG, PNG, WebP` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Datei zu gross (max. ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
        { status: 400 }
      );
    }

    // Datei in data URI konvertieren (serverless-kompatibel)
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    inputSource = `data:${file.type};base64,${base64}`;
    originalPrompt = `Upload: ${file.name}`;

    // Edit-Parameter aus FormData lesen
    function numParam(key: string): number | undefined {
      const v = formData.get(key);
      return v ? Number(v) || undefined : undefined;
    }

    sharpen = numParam("sharpen");
    brightness = numParam("brightness");
    contrast = numParam("contrast");
    saturation = numParam("saturation");
    vignette = numParam("vignette");
    roundCorners = numParam("roundCorners");

    const rawBrandKit = formData.get("brandKit");
    if (rawBrandKit && typeof rawBrandKit === "string") brandKit = rawBrandKit;

    const rawWidth = formData.get("resizeWidth");
    const rawHeight = formData.get("resizeHeight");
    if (rawWidth && rawHeight) {
      resize = { width: Number(rawWidth), height: Number(rawHeight) };
    }

    const rawFormat = formData.get("format");
    if (rawFormat === "webp" || rawFormat === "jpeg" || rawFormat === "png") {
      format = rawFormat;
    }

    const rawQuality = formData.get("quality");
    if (rawQuality) quality = Math.min(100, Math.max(1, Number(rawQuality) || 90));

  // ---------- JSON: Bestehendes Asset referenzieren ----------
  } else if (contentType.includes("application/json")) {
    const body = await request.json() as {
      assetId?: string;
      sharpen?: number;
      brightness?: number;
      contrast?: number;
      saturation?: number;
      vignette?: number;
      roundCorners?: number;
      brandKit?: string;
      resize?: { width: number; height: number };
      format?: "png" | "webp" | "jpeg";
      quality?: number;
    };

    if (!body.assetId) {
      return NextResponse.json({ error: "assetId ist erforderlich" }, { status: 400 });
    }

    const asset = await db.asset.findFirst({
      where: { id: body.assetId, tenantId: tenant.id },
    });

    if (!asset?.imageUrl) {
      return NextResponse.json({ error: "Asset nicht gefunden" }, { status: 404 });
    }

    inputSource = asset.imageUrl;
    originalPrompt = `Bearbeitung: Asset ${body.assetId}`;
    sharpen = body.sharpen;
    brightness = body.brightness;
    contrast = body.contrast;
    saturation = body.saturation;
    vignette = body.vignette;
    roundCorners = body.roundCorners;
    brandKit = body.brandKit;
    resize = body.resize;
    format = body.format ?? "png";
    quality = body.quality ?? 90;
  } else {
    return NextResponse.json(
      { error: "Content-Type muss multipart/form-data oder application/json sein" },
      { status: 415 }
    );
  }

  try {
    const result = await editImage({
      tenantId: tenant.id,
      inputPath: inputSource,
      sharpen,
      brightness,
      contrast,
      saturation,
      vignette,
      roundCorners,
      brandKit,
      resize,
      format,
      quality,
    });

    // Bearbeitetes Asset in DB speichern (0 Credits)
    const savedAsset = await db.asset.create({
      data: {
        tenantId: tenant.id,
        originalPrompt,
        modelUsed: "FLUX",
        status: "EDITED",
        imageUrl: result.outputPath,
        exportedFormats: JSON.stringify([format]),
        creditsUsed: 0,
        width: result.width,
        height: result.height,
        fileSize: result.fileSize,
        editParams: JSON.stringify({ sharpen, roundCorners, brandKit, resize, format, quality }),
        brandKit,
      },
    });

    return NextResponse.json({
      asset: {
        id: savedAsset.id,
        imageUrl: savedAsset.imageUrl,
        width: result.width,
        height: result.height,
        fileSize: result.fileSize,
        creditsUsed: 0,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bearbeitung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
