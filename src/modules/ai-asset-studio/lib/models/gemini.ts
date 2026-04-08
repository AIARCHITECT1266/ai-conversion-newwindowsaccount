// ============================================================
// AI Asset Studio – Gemini Model Handler
// Nutzt Google Gemini API für Bildgenerierung.
// ============================================================

import type { ModelHandler, GenerateResult } from "../types";

export class GeminiHandler implements ModelHandler {
  readonly modelId = "gemini" as const;

  async generate(prompt: string, options: {
    variations: number;
    width?: number;
    height?: number;
  }): Promise<GenerateResult[]> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY nicht konfiguriert");
    }

    const results: GenerateResult[] = [];

    for (let i = 0; i < options.variations; i++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `Erstelle ein Bild: ${prompt}` },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["IMAGE", "TEXT"],
              imageDimension: {
                width: options.width ?? 1024,
                height: options.height ?? 1024,
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API Fehler: ${response.status} – ${error}`);
      }

      const data = await response.json() as {
        candidates: Array<{
          content: {
            parts: Array<{
              inlineData?: { mimeType: string; data: string };
            }>;
          };
        }>;
      };

      // Inline-Bilder aus der Antwort extrahieren
      for (const candidate of data.candidates ?? []) {
        for (const part of candidate.content?.parts ?? []) {
          if (part.inlineData) {
            const buffer = Buffer.from(part.inlineData.data, "base64");
            results.push({
              imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
              model: "gemini",
              width: options.width ?? 1024,
              height: options.height ?? 1024,
              fileSize: buffer.length,
            });
          }
        }
      }
    }

    return results;
  }
}
