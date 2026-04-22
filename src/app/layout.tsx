import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { MarketingWidget } from "@/components/MarketingWidget";
import { FoundingPartnerBanner } from "@/components/FoundingPartnerBanner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-conversion.ai"),
  title: "AI Conversion — KI-Lead-Qualifizierung für Weiterbildung & Inbound-Teams",
  description:
    "KI-Lead-Qualifizierung für Weiterbildungsanbieter und Inbound-Teams. Web-Widget, CRM und Pipeline in einem System — qualifiziert Anfragen automatisch, übergibt nur vorgeprüfte Leads an Ihr Team. DSGVO-nativ, Frankfurt-Hosting.",
  keywords: [
    "AI Conversion",
    "KI Lead-Qualifizierung",
    "Weiterbildung KI",
    "Bildungsträger Chatbot",
    "Lead-Scoring",
    "Inbound-Qualifizierung",
    "KI Chatbot Deutschland",
    "ai-conversion.ai",
  ],
  openGraph: {
    title: "AI Conversion | KI-Lead-Qualifizierung für Weiterbildung",
    description:
      "AI Conversion — Qualifiziert Anfragen von Weiterbildungsanbietern automatisch, erkennt kaufbereite Leads und übergibt sie vorgeprüft an Ihr Team. Web-Widget, 24/7, DSGVO-nativ.",
    url: "https://ai-conversion.ai",
    type: "website",
    locale: "de_DE",
    siteName: "AI Conversion",
    images: [
      {
        url: "/logo1.jpg",
        width: 1200,
        height: 630,
        alt: "AI Conversion – KI-Lead-Qualifizierung für Weiterbildung",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Conversion | KI-Lead-Qualifizierung für Weiterbildung",
    description:
      "AI Conversion — Qualifiziert Anfragen von Weiterbildungsanbietern automatisch, erkennt kaufbereite Leads und übergibt sie vorgeprüft an Ihr Team. Web-Widget, 24/7, DSGVO-nativ.",
    images: ["/logo1.jpg"],
  },
  robots: "index, follow",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // headers()-Aufruf macht das Root-Layout dynamisch und damit alle
  // untergeordneten Seiten. Dadurch laeuft die Middleware bei jedem
  // Request und kann den CSP-Nonce via Content-Security-Policy-
  // Request-Header propagieren, den Next.js 15 SSR-Renderer zur
  // Nonce-Injection auf Framework-Scripts nutzt.
  // Siehe: docs/production-regression-2026-04-12.md (Phase A.3)
  await headers();

  return (
    <html lang="de" className={`${inter.variable} dark`}>
      <body className="noise-bg antialiased">
        <FoundingPartnerBanner />
        {children}
        <MarketingWidget />
      </body>
    </html>
  );
}
