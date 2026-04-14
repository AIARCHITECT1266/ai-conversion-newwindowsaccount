"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

// Pfade auf denen das Marketing-Widget NICHT erscheinen darf:
// - /admin/*       (Admin-Konsole, nicht fuer Endkunden)
// - /dashboard/*   (Tenant-Dashboard, eigener Kontext)
// - /embed/*       (ist selbst das Widget — Inception verhindern)
// - /api/*         (Server-Routen, haben keine HTML-Seite)
// - /onboarding/*  (Self-Service-Flow, separater Kontext)
function isExcludedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/embed") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/onboarding")
  );
}

// Eigenes Marketing-Widget fuer ai-conversion.ai.
// Tenant: ai-conversion-marketing (Public Key siehe env NEXT_PUBLIC_MARKETING_WIDGET_KEY
// oder hardcoded — der Key ist per Design oeffentlich, rotierbar ueber Admin-UI).
const MARKETING_WIDGET_KEY = "pub_kLDcMWtd4PZ5XpRk";

export function MarketingWidget() {
  const pathname = usePathname();

  if (isExcludedPath(pathname)) return null;

  return (
    <Script
      src="/widget.js"
      data-key={MARKETING_WIDGET_KEY}
      strategy="afterInteractive"
    />
  );
}
