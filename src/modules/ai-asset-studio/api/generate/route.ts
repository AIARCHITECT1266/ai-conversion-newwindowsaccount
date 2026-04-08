// ============================================================
// AI Asset Studio – API: POST /api/asset-studio/generate
// Bildgenerierung über HTTP-API.
// ============================================================

import { NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { generateWithModel } from "@/modules/ai-asset-studio/lib/models";
import { db } from "@/shared/db";
import type { ModelId } from "@/modules/ai-asset-studio/lib/types";

const VALID_MODELS: ModelId[] = ["grok", "claude", "gemini", "flux"];

export async function POST(request: Request) {
  // Authentifizierung
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  // Request Body parsen
  const body = await request.json() as {
    prompt?: string;
    model?: string;
    variations?: number;
    width?: number;
    height?: number;
  };

  if (!body.prompt || typeof body.prompt !== "string") {
    return NextResponse.json({ error: "Prompt ist erforderlich" }, { status: 400 });
  }

  const model = (body.model ?? "flux") as ModelId;
  if (!VALID_MODELS.includes(model)) {
    return NextResponse.json(
      { error: `Ungültiges Modell. Erlaubt: ${VALID_MODELS.join(", ")}` },
      { status: 400 }
    );
  }

  const variations = Math.min(4, Math.max(1, body.variations ?? 1));
  const width = body.width ?? 1024;
  const height = body.height ?? 1024;

  try {
    // Bilder generieren
    const results = await generateWithModel({
      tenantId: tenant.id,
      prompt: body.prompt,
      model,
      variations,
      width,
      height,
    });

    // Assets in DB speichern
    const assets = await Promise.all(
      results.map((result) =>
        db.asset.create({
          data: {
            tenantId: tenant.id,
            originalPrompt: body.prompt!,
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
                prompt: body.prompt,
                modelUsed: model,
                imageUrl: result.imageUrl,
                createdAt: new Date().toISOString(),
              },
            ]),
          },
        })
      )
    );

    return NextResponse.json({
      assets: assets.map((a) => ({
        id: a.id,
        imageUrl: a.imageUrl,
        model: a.modelUsed,
        width: a.width,
        height: a.height,
        creditsUsed: a.creditsUsed,
      })),
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generierung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
