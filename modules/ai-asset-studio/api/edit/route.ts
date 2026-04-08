// ============================================================
// AI Asset Studio – API: POST /api/asset-studio/edit
// Bildbearbeitung über HTTP-API. Credits-neutral.
// ============================================================

import { NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { editImage } from "../../lib/edit";
import { db } from "@/shared/db";

export async function POST(request: Request) {
  // Authentifizierung
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  // Request als FormData (Bild-Upload) oder JSON
  const contentType = request.headers.get("content-type") ?? "";

  let inputPath: string;
  let sharpen: number | undefined;
  let roundCorners: number | undefined;
  let brandKit: string | undefined;
  let resize: { width: number; height: number } | undefined;
  let format: "png" | "webp" | "jpeg" = "png";
  let quality = 90;

  if (contentType.includes("application/json")) {
    // JSON-Body: Asset-ID referenzieren
    const body = await request.json() as {
      assetId?: string;
      sharpen?: number;
      roundCorners?: number;
      brandKit?: string;
      resize?: { width: number; height: number };
      format?: "png" | "webp" | "jpeg";
      quality?: number;
    };

    if (!body.assetId) {
      return NextResponse.json({ error: "assetId ist erforderlich" }, { status: 400 });
    }

    // Asset laden und Pfad ermitteln
    const asset = await db.asset.findFirst({
      where: { id: body.assetId, tenantId: tenant.id },
    });

    if (!asset?.imageUrl) {
      return NextResponse.json({ error: "Asset nicht gefunden" }, { status: 404 });
    }

    inputPath = asset.imageUrl;
    sharpen = body.sharpen;
    roundCorners = body.roundCorners;
    brandKit = body.brandKit;
    resize = body.resize;
    format = body.format ?? "png";
    quality = body.quality ?? 90;
  } else {
    return NextResponse.json(
      { error: "Content-Type muss application/json sein" },
      { status: 415 }
    );
  }

  try {
    const result = await editImage({
      tenantId: tenant.id,
      inputPath,
      sharpen,
      roundCorners,
      brandKit,
      resize,
      format,
      quality,
    });

    // Bearbeitetes Asset in DB speichern (0 Credits)
    const asset = await db.asset.create({
      data: {
        tenantId: tenant.id,
        originalPrompt: `Bearbeitung: ${inputPath}`,
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
        id: asset.id,
        imageUrl: asset.imageUrl,
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
