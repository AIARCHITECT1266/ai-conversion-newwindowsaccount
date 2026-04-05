import type { Metadata } from "next";
import LandingPage from "./page-v2";

export const metadata: Metadata = {
  title: "AI Conversion | KI-gestützter WhatsApp-Vertrieb – Ihr 24/7 Sales-Assistent",
  description:
    "AI Conversion verwandelt WhatsApp in Ihren leistungsstärksten Vertriebskanal. Unser Premium KI-Chatbot generiert, qualifiziert und konvertiert Leads automatisch – rund um die Uhr.",
  alternates: {
    canonical: "https://ai-conversion.ai",
  },
};

export default function Page() {
  return <LandingPage />;
}
