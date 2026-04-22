import type { Metadata } from "next";
import PricingPage from "./PricingClient";

export const metadata: Metadata = {
  title: "Preise | AI Conversion – KI-Lead-Qualifizierung für Bildungsträger",
  description:
    "Transparente Preise für AI Conversion. Starter, Growth und Professional Pakete für KI-gestützte Lead-Qualifizierung bei Bildungsträgern — Web-Widget, CRM und Pipeline in einem System. Jetzt kostenlos testen.",
  alternates: {
    canonical: "https://ai-conversion.ai/pricing",
  },
};

export default function Page() {
  return <PricingPage />;
}
