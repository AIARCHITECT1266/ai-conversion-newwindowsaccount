import type { Metadata } from "next";
import PricingPage from "./PricingClient";

export const metadata: Metadata = {
  title: "Preise | AI Conversion – WhatsApp KI-Bot für Vertrieb",
  description:
    "Transparente Preise für AI Conversion. Starter, Growth und Professional Pakete für KI-gestützten WhatsApp-Vertrieb. Jetzt kostenlos testen.",
  alternates: {
    canonical: "https://ai-conversion.ai/pricing",
  },
};

export default function Page() {
  return <PricingPage />;
}
