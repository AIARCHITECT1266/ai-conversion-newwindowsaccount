// ============================================================
// Widget-Farb-Helper: Hex-Farben mit Alpha-Suffix versehen.
//
// Hex-Alpha-Shortcuts (2 Zeichen, angehaengt an #RRGGBB):
//   08 ≈  3% | 14 ≈  8% | 1A ≈ 10% | 33 ≈ 20%
//   4D ≈ 30% | 66 ≈ 40% | 99 ≈ 60%
//
// Genutzt von /embed/widget (Server Component) und ChatClient
// (Client Component), daher eine eigene Datei ohne server-only
// Abhaengigkeiten.
// ============================================================

export type AlphaSuffix = "08" | "14" | "1A" | "33" | "4D" | "66" | "99";

export function withAlpha(hex: string, alphaHex: AlphaSuffix): string {
  return `${hex}${alphaHex}`;
}
