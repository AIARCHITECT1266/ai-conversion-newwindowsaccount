import type { Metadata, Viewport } from "next";

// ============================================================
// /embed/* Layout (verschachtelt im Root-Layout)
//
// Das Root-Layout (src/app/layout.tsx) liefert <html> und <body>
// inklusive Tailwind und Inter-Font. Da es von sich aus KEINEN
// Header, Footer oder Navigation rendert, bleibt /embed/* bereits
// frei von Site-Chrome.
//
// Dieses Layout bietet lediglich einen vollhoehigen transparenten
// Wrapper, damit das eingebettete Widget die komplette iframe-
// Viewport-Hoehe fuellt.
//
// CSP fuer /embed/*: frame-ancestors * (siehe src/middleware.ts
// und vercel.json Block 1).
// ============================================================

export const metadata: Metadata = {
  title: "AI Conversion Widget",
  robots: "noindex, nofollow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 m-0 p-0 overflow-hidden bg-transparent">
      {children}
    </div>
  );
}
