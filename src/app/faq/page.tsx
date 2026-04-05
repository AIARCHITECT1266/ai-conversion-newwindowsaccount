import type { Metadata } from "next";
import FAQ from "./FaqClient";

export const metadata: Metadata = {
  title: "FAQ | AI Conversion – Häufige Fragen zum WhatsApp KI-Bot",
  description:
    "Antworten auf häufig gestellte Fragen zu AI Conversion: Setup, DSGVO, Preise, Funktionen und Integration des KI-WhatsApp-Bots.",
  alternates: {
    canonical: "https://ai-conversion.ai/faq",
  },
};

export default function Page() {
  return <FAQ />;
}
