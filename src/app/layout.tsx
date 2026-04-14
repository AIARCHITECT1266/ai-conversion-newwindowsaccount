import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { MarketingWidget } from "@/components/MarketingWidget";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-conversion.ai"),
  title: "AI Conversion | KI-gestützter WhatsApp-Vertrieb – Ihr 24/7 Sales-Assistent",
  description:
    "AI Conversion verwandelt WhatsApp in Ihren leistungsstärksten Vertriebskanal. Unser Premium KI-Chatbot generiert, qualifiziert und konvertiert Leads automatisch – rund um die Uhr.",
  keywords: [
    "AI Conversion",
    "KI WhatsApp Bot",
    "WhatsApp Business Chatbot",
    "Lead Generation",
    "Vertriebsautomatisierung",
    "WhatsApp Marketing",
    "KI Vertrieb",
    "ai-conversion.ai",
  ],
  openGraph: {
    title: "AI Conversion | KI-gestützter WhatsApp-Vertrieb",
    description:
      "AI Conversion – Premium KI-Chatbot für automatische Lead-Generierung über WhatsApp. 24/7 Vertrieb auf Autopilot.",
    url: "https://ai-conversion.ai",
    type: "website",
    locale: "de_DE",
    siteName: "AI Conversion",
    images: [
      {
        url: "/logo1.jpg",
        width: 1200,
        height: 630,
        alt: "AI Conversion – KI-gestützter WhatsApp-Vertrieb",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Conversion | KI-gestützter WhatsApp-Vertrieb",
    description:
      "AI Conversion – Premium KI-Chatbot für automatische Lead-Generierung über WhatsApp. 24/7 Vertrieb auf Autopilot.",
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
        {children}
        <MarketingWidget />
      </body>
    </html>
  );
}
