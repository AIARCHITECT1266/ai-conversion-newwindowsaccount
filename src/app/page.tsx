import type { Metadata } from "next";
import LandingPage from "./page-v2";

export const metadata: Metadata = {
  title: "KI-Vertrieb für DACH-KMU | AI Conversion",
  description:
    "KI-Vertrieb für DACH-KMU. WhatsApp-Bot, Web-Widget, CRM und Pipeline in einem System — qualifiziert Leads automatisch, übergibt nur die heißen. DSGVO-nativ, Frankfurt-Hosting.",
  alternates: {
    canonical: "https://ai-conversion.ai",
  },
};

export default function Page() {
  return <LandingPage />;
}
