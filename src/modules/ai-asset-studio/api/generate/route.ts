// ============================================================
// AI Asset Studio – API: POST /api/asset-studio/generate
// Bildgenerierung über HTTP-API.
// ============================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { generateWithModel } from "@/modules/ai-asset-studio/lib/models";
import { db } from "@/shared/db";
import type { ModelId } from "@/modules/ai-asset-studio/lib/types";

const generateSchema = z.object({
  prompt: z.string().min(1, "Prompt ist erforderlich").max(5000),
  model: z.enum(["grok", "claude", "gemini", "flux"]).default("flux"),
  variations: z.number().int().min(1).max(4).default(1),
  width: z.number().int().min(64).max(4096).default(1024),
  height: z.number().int().min(64).max(4096).default(1024),
});

export async function POST(request: Request) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage" }, { status: 400 });
  }

  const parsed = generateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungueltige Eingabe", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { prompt, model, variations, width, height } = parsed.data;

  try {
    // Bilder generieren
    const results = await generateWithModel({
      tenantId: tenant.id,
      prompt,
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
