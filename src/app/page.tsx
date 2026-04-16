import type { Metadata } from "next";
import LandingPage from "./page-v2";

export const metadata: Metadata = {
  title: "KI-Vertrieb für den DACH-Mittelstand | AI Conversion",
  description:
    "KI-Vertrieb für den DACH-Mittelstand. WhatsApp-Bot, Web-Widget, CRM und Pipeline in einem System — qualifiziert Leads automatisch, übergibt nur die heißen Leads direkt an Ihren Vertrieb. DSGVO-nativ, Frankfurt-Hosting.",
  alternates: {
    canonical: "https://ai-conversion.ai",
  },
};

export default function Page() {
  return <LandingPage />;
}
