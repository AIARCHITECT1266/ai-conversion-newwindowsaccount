// ============================================================
// AI Asset Studio – Claude Model Handler
// Nutzt Anthropic Claude API für Bildgenerierung.
// Verwendet das dedizierte Image-Generation-Endpoint.
// ============================================================

import type { ModelHandler, GenerateResult } from "../types";

export class ClaudeHandler implements ModelHandler {
  readonly modelId = "claude" as const;

  async generate(prompt: string, options: {
    variations: number;
    width?: number;
    height?: number;
  }): Promise<GenerateResult[]> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY nicht konfiguriert");
    }

    const results: GenerateResult[] = [];

    for (let i = 0; i < options.variations; i++) {
      // Anthropic Messages API mit Bildgenerierung
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2024-10-22",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 16384,
          messages: [
            {
              role: "user",
              content: `Generiere ein Bild basierend auf folgender Beschreibung: ${prompt}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API Fehler: ${response.status} – ${error}`);
      }

      const data = await response.json() as {
        content: Array<{
          type: string;
          source?: { type: string; media_type: string; data: string };
          text?: string;
        }>;
      };

      // Bild-Blöcke aus der Antwort extrahieren
      for (const block of data.content) {
        if (block.type === "image" && block.source?.data) {
          const buffer = Buffer.from(block.source.data, "base64");
          const mediaType = block.source.media_type ?? "image/png";

          results.push({
            imageUrl: `data:${mediaType};base64,${block.source.data}`,
            model: "claude",
            width: options.width ?? 1024,
            height: options.height ?? 1024,
            fileSize: buffer.length,
          });
        }
      }
    }

    return results;
  }
}
