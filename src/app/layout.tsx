import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AI Conversion | KI WhatsApp Growth Bot – Ihr 24/7 Vertriebs-Assistent",
  description:
    "Verwandeln Sie WhatsApp in Ihren leistungsstärksten Vertriebskanal. Unser Premium KI-Chatbot generiert, qualifiziert und konvertiert Leads automatisch – rund um die Uhr. Starten Sie die 30-Tage-100-Leads-Challenge.",
  keywords: [
    "KI WhatsApp Bot",
    "WhatsApp Business Chatbot",
    "Lead Generation",
    "Vertriebsautomatisierung",
    "AI Conversion",
    "WhatsApp Marketing",
    "KI Vertrieb",
    "WhatsApp Growth Bot",
  ],
  openGraph: {
    title: "AI Conversion | KI WhatsApp Growth Bot",
    description:
      "Premium KI-Chatbot für automatische Lead-Generierung über WhatsApp. 24/7 Vertrieb auf Autopilot.",
    type: "website",
    locale: "de_DE",
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
