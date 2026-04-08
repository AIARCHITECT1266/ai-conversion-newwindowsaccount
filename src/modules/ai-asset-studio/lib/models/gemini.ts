// ============================================================
// AI Asset Studio – Gemini Model Handler
// Nutzt Google Gemini API fuer Bildgenerierung.
// Modell: gemini-2.5-flash-image (Image Generation)
// Docs: https://ai.google.dev/gemini-api/docs/image-generation
// ============================================================

import type { ModelHandler, GenerateResult } from "../types";

// Groesse aus Pixel-Werten ableiten
function resolveImageSize(width: number, height: number): string {
  const maxDim = Math.max(width, height);
  if (maxDim <= 512) return "512";
  if (maxDim <= 1024) return "1K";
  if (maxDim <= 2048) return "2K";
  return "4K";
}

// Seitenverhaeltnis aus Breite/Hoehe ableiten
function resolveAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.1) return "1:1";
  if (Math.abs(ratio - 16 / 9) < 0.1) return "16:9";
  if (Math.abs(ratio - 9 / 16) < 0.1) return "9:16";
  if (Math.abs(ratio - 4 / 3) < 0.15) return "4:3";
  if (Math.abs(ratio - 3 / 4) < 0.15) return "3:4";
  if (Math.abs(ratio - 5 / 4) < 0.15) return "5:4";
  return "1:1";
}

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

    const width = options.width ?? 1024;
    const height = options.height ?? 1024;
    const results: GenerateResult[] = [];

    for (let i = 0; i < options.variations; i++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `Erstelle ein Bild: ${prompt}` },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: {
                aspectRatio: resolveAspectRatio(width, height),
                imageSize: resolveImageSize(width, height),
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
              inline_data?: { mime_type: string; data: string };
              text?: string;
            }>;
          };
        }>;
      };

      // Inline-Bilder aus der Antwort extrahieren
      for (const candidate of data.candidates ?? []) {
        for (const part of candidate.content?.parts ?? []) {
          if (part.inline_data) {
            const buffer = Buffer.from(part.inline_data.data, "base64");
            results.push({
              imageUrl: `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`,
              model: "gemini",
              width,
              height,
              fileSize: buffer.length,
            });
          }
        }
      }
    }

    return results;
  }
}
