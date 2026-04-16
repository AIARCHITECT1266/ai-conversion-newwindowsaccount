"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const STORAGE_KEY = "ai-conversion-banner-dismissed";

// Banner nur auf diesen Pfaden anzeigen
// Laut Prompt: /, /pricing, /features — NICHT auf /dashboard/*, /admin/*,
// /widget/*, /embed/*, /datenschutz, /impressum, /agb, /dpa
const ALLOWED_PATHS = ["/", "/pricing", "/features", "/faq", "/multi-ai"];

function isAllowedPath(pathname: string): boolean {
  return ALLOWED_PATHS.includes(pathname);
}

export function FoundingPartnerBanner() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true); // Default hidden bis Check

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setDismissed(stored === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed || !isAllowedPath(pathname)) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // localStorage nicht verfuegbar (z.B. Private-Mode) — Banner bleibt weg fuer diese Session
    }
  }

  return (
    <div
      className="relative z-50 w-full border-b border-amber-500/20"
      style={{
        background: "linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(180,130,40,0.08) 100%)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2.5 sm:px-6">
        <span className="text-amber-400/80 text-sm">&#x1F7E1;</span>
        <p className="text-center text-xs font-medium text-amber-200/90 sm:text-sm">
          <span className="font-semibold text-amber-100">Founding-Partner-Phase</span>
          {" — "}Die ersten 10 Pilotkunden erhalten 33% Rabatt und 30 Tage kostenlos. Aktuell verfügbar: 10 Plätze.{" "}
          <a
            href="/#founding-partner"
            className="inline-flex items-center gap-1 font-semibold text-amber-300 underline underline-offset-2 transition-colors hover:text-amber-100"
          >
            Mehr erfahren &rarr;
          </a>
        </p>
        <button
          onClick={handleDismiss}
          className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-amber-400/60 transition-colors hover:bg-amber-400/10 hover:text-amber-200"
          aria-label="Banner schliessen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
