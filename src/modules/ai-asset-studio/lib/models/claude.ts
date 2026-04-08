// ============================================================
// AI Asset Studio – Claude Model Handler (Stub)
// Claude kann ueber die Messages API keine Bilder generieren.
// Dieser Handler gibt eine klare Fehlermeldung zurueck.
// Kann spaeter durch einen echten Image-Gen-Provider ersetzt
// werden (z.B. DALL-E, Stability AI, Ideogram).
// ============================================================

import type { ModelHandler, GenerateResult } from "../types";

export class ClaudeHandler implements ModelHandler {
  readonly modelId = "claude" as const;

  async generate(_prompt: string, _options: {
    variations: number;
    width?: number;
    height?: number;
  }): Promise<GenerateResult[]> {
    throw new Error(
      "Claude unterstuetzt derzeit keine Bildgenerierung. " +
      "Bitte verwende Flux, Grok oder Gemini. " +
      "Dieses Modell wird in einem zukuenftigen Update durch einen " +
      "Image-Generation-Provider ersetzt."
    );
  }
}
