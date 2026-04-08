// ============================================================
// AI Asset Studio – Flux Model Handler
// Nutzt Replicate API (black-forest-labs/flux-schnell).
// Banana.dev als alternativer Endpoint vorbereitet.
// ============================================================

import type { ModelHandler, GenerateResult } from "../types";

export class FluxHandler implements ModelHandler {
  readonly modelId = "flux" as const;

  async generate(prompt: string, options: {
    variations: number;
    width?: number;
    height?: number;
  }): Promise<GenerateResult[]> {
    const apiKey = process.env.REPLICATE_API_KEY;
    if (!apiKey) {
      throw new Error("REPLICATE_API_KEY nicht konfiguriert");
    }

    const results: GenerateResult[] = [];

    for (let i = 0; i < options.variations; i++) {
      // Prediction erstellen
      const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Prefer": "wait", // Synchron warten auf Ergebnis
        },
        body: JSON.stringify({
          model: "black-forest-labs/flux-schnell",
          input: {
            prompt,
            num_outputs: 1,
            width: options.width ?? 1024,
            height: options.height ?? 1024,
            go_fast: true,
          },
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`Replicate API Fehler: ${createResponse.status} – ${error}`);
      }

      const prediction = await createResponse.json() as {
        status: string;
        output: string[] | null;
        error: string | null;
      };

      if (prediction.status === "failed") {
        throw new Error(`Flux Generierung fehlgeschlagen: ${prediction.error}`);
      }

      // Bei "Prefer: wait" kommt das Ergebnis direkt
      if (prediction.output?.[0]) {
        results.push({
          imageUrl: prediction.output[0],
          model: "flux",
          width: options.width ?? 1024,
          height: options.height ?? 1024,
          fileSize: 0, // Wird nach Download ermittelt
        });
      }
    }

    return results;
  }
}

// ============================================================
// Banana.dev – Alternativer Inference-Endpoint (optional)
// Aktivierung über BANANA_API_KEY + BANANA_MODEL_KEY
// ============================================================
export class FluxBananaHandler implements ModelHandler {
  readonly modelId = "flux" as const;

  async generate(prompt: string, options: {
    variations: number;
    width?: number;
    height?: number;
  }): Promise<GenerateResult[]> {
    const apiKey = process.env.BANANA_API_KEY;
    const modelKey = process.env.BANANA_MODEL_KEY;
    if (!apiKey || !modelKey) {
      throw new Error("BANANA_API_KEY und BANANA_MODEL_KEY nicht konfiguriert");
    }

    const results: GenerateResult[] = [];

    for (let i = 0; i < options.variations; i++) {
      const response = await fetch("https://api.banana.dev/v1/run", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelKey,
          modelInputs: {
            prompt,
            width: options.width ?? 1024,
            height: options.height ?? 1024,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Banana API Fehler: ${response.status} – ${error}`);
      }

      const data = await response.json() as {
        modelOutputs: Array<{ image_url?: string; image_base64?: string }>;
      };

      const output = data.modelOutputs?.[0];
      if (output?.image_url) {
        results.push({
          imageUrl: output.image_url,
          model: "flux",
          width: options.width ?? 1024,
          height: options.height ?? 1024,
          fileSize: 0,
        });
      }
    }

    return results;
  }
}
