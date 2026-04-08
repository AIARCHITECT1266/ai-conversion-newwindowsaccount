// ============================================================
// Paddle Plan-Konfiguration und Hilfsfunktionen
// Paddle ist Merchant of Record – kuemmert sich um VAT/Steuern
// Price IDs werden als Umgebungsvariablen konfiguriert
// ============================================================

export interface PlanConfig {
  name: string;
  slug: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
  setupPriceId: string;
  monthlyPrice: number;  // Cent
  yearlyPrice: number;   // Cent
  setupFee: number;      // Cent
}

export const PLANS: Record<string, PlanConfig> = {
  starter: {
    name: "Starter",
    slug: "starter",
    monthlyPriceId: process.env.PADDLE_PRICE_STARTER_MONTHLY || "",
    yearlyPriceId: process.env.PADDLE_PRICE_STARTER_YEARLY || "",
    setupPriceId: process.env.PADDLE_PRICE_STARTER_SETUP || "",
    monthlyPrice: 49700,
    yearlyPrice: 497000,
    setupFee: 49700,
  },
  growth: {
    name: "Growth",
    slug: "growth",
    monthlyPriceId: process.env.PADDLE_PRICE_GROWTH_MONTHLY || "",
    yearlyPriceId: process.env.PADDLE_PRICE_GROWTH_YEARLY || "",
    setupPriceId: process.env.PADDLE_PRICE_GROWTH_SETUP || "",
    monthlyPrice: 149700,
    yearlyPrice: 1497000,
    setupFee: 99700,
  },
  professional: {
    name: "Professional",
    slug: "professional",
    monthlyPriceId: process.env.PADDLE_PRICE_PRO_MONTHLY || "",
    yearlyPriceId: process.env.PADDLE_PRICE_PRO_YEARLY || "",
    setupPriceId: process.env.PADDLE_PRICE_PRO_SETUP || "",
    monthlyPrice: 299700,
    yearlyPrice: 2997000,
    setupFee: 199700,
  },
};

export function getPlan(slug: string): PlanConfig | undefined {
  return PLANS[slug.toLowerCase()];
}
