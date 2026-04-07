// ============================================================
// AI Asset Studio – Grok Model Handler
// Nutzt xAI Grok API für Bildgenerierung.
// ============================================================

import type { ModelHandler, GenerateResult } from "../types";

export class GrokHandler implements ModelHandler {
  readonly modelId = "grok" as const;

  async generate(prompt: string, options: {
    variations: number;
    width?: number;
    height?: number;
  }): Promise<GenerateResult[]> {
    const width = options.width ?? 1024;
    const height = options.height ?? 1024;

    // xAI Grok API aufrufen
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error("XAI_API_KEY nicht konfiguriert");
    }

    const results: GenerateResult[] = [];

    for (let i = 0; i < options.variations; i++) {
      const response = await fetch("https://api.x.ai/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-2-image",
          prompt,
          n: 1,
          size: `${width}x${height}`,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Grok API Fehler: ${response.status} – ${error}`);
      }

      const data = await response.json() as {
        data: Array<{ url: string }>;
      };

      if (data.data?.[0]?.url) {
        results.push({
          imageUrl: data.data[0].url,
          model: "grok",
          width,
          height,
          fileSize: 0, // Wird nach Download ermittelt
        });
      }
    }

    return results;
  }
}
