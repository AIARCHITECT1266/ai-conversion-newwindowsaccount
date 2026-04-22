import type { Metadata } from "next";
import LandingPage from "./page-v2";

export const metadata: Metadata = {
  title: "AI Conversion — KI-Lead-Qualifizierung für Bildungsträger",
  description:
    "KI-Lead-Qualifizierung für Bildungsträger. Web-Widget, CRM und Pipeline in einem System — qualifiziert Anfragen automatisch, übergibt nur vorgeprüfte Leads an Ihr Team. DSGVO-nativ, Frankfurt-Hosting.",
  alternates: {
    canonical: "https://ai-conversion.ai",
  },
};

export default function Page() {
  return <LandingPage />;
}
