// ============================================================
// AI Asset Studio – Gemeinsame Typen
// ============================================================

/** Unterstützte KI-Modelle für Bildgenerierung */
export type ModelId = "grok" | "claude" | "gemini" | "flux";

/** Generierungs-Anfrage */
export interface GenerateRequest {
  tenantId: string;
  prompt: string;
  model: ModelId;
  variations: number; // 1-4
  width?: number;
  height?: number;
}

/** Generierungs-Ergebnis pro Variation */
export interface GenerateResult {
  imageUrl: string;
  model: ModelId;
  width: number;
  height: number;
  fileSize: number;
}

/** Bearbeitungs-Anfrage */
export interface EditRequest {
  tenantId: string;
  assetId?: string; // Bestehendes Asset bearbeiten
  inputPath: string; // Lokaler Pfad, URL oder data URI
  sharpen?: number; // 0-100 (sigma 0.5-5.0)
  brightness?: number; // -100 bis +100 (0 = unveraendert)
  contrast?: number; // -100 bis +100 (0 = unveraendert)
  saturation?: number; // -100 bis +100 (0 = unveraendert)
  vignette?: number; // 0-100 (Staerke des Vignetten-Effekts)
  roundCorners?: number; // Radius in px
  brandKit?: string; // z.B. "premium-gold"
  resize?: { width: number; height: number };
  format?: "png" | "webp" | "jpeg";
  quality?: number; // 1-100
}

/** Bearbeitungs-Ergebnis */
export interface EditResult {
  outputPath: string;
  format: string;
  width: number;
  height: number;
  fileSize: number;
}

/** Brand-Kit Definition */
export interface BrandKit {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  borderRadius: number;
  watermark?: string;
}

/** Vordefinierte Brand-Kits */
export const BRAND_KITS: Record<string, BrandKit> = {
  "premium-gold": {
    name: "Premium Gold",
    primaryColor: "#C9A84C",
    secondaryColor: "#1a1a2e",
    borderRadius: 18,
  },
  "modern-purple": {
    name: "Modern Purple",
    primaryColor: "#8b5cf6",
    secondaryColor: "#f8fafc",
    borderRadius: 12,
  },
  "clean-white": {
    name: "Clean White",
    primaryColor: "#ffffff",
    secondaryColor: "#0f172a",
    borderRadius: 8,
  },
};

/** Credit-Prüfungsergebnis */
export interface CreditCheck {
  allowed: boolean;
  remaining: number;
  used: number;
  monthlyIncluded: number;
  bonusCredits: number;
}

/** Model-Handler Interface – jedes Modell implementiert dieses Interface */
export interface ModelHandler {
  readonly modelId: ModelId;
  generate(prompt: string, options: {
    variations: number;
    width?: number;
    height?: number;
  }): Promise<GenerateResult[]>;
}
