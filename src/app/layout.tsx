import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${inter.variable} dark`}>
      <body className="noise-bg antialiased">{children}</body>
    </html>
  );
}
