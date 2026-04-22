"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const STORAGE_KEY = "ai-conversion-banner-dismissed";
const CSS_VAR = "--banner-h";

// Banner nur auf diesen Pfaden anzeigen
const ALLOWED_PATHS = ["/", "/pricing", "/features", "/faq", "/multi-ai"];

function isAllowedPath(pathname: string): boolean {
  return ALLOWED_PATHS.includes(pathname);
}

export function FoundingPartnerBanner() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true);
  const bannerRef = useRef<HTMLDivElement>(null);

  // LocalStorage-Check + CSS-Variable setzen
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setDismissed(stored === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  // Banner-Hoehe als CSS Custom Property auf <html> setzen,
  // damit Navigation.tsx den top-Offset dynamisch lesen kann
  useEffect(() => {
    const visible = !dismissed && isAllowedPath(pathname);
    if (visible && bannerRef.current) {
      const h = bannerRef.current.offsetHeight;
      document.documentElement.style.setProperty(CSS_VAR, `${h}px`);
    } else {
      document.documentElement.style.setProperty(CSS_VAR, "0px");
    }
    return () => {
      document.documentElement.style.setProperty(CSS_VAR, "0px");
    };
  }, [dismissed, pathname]);

  if (dismissed || !isAllowedPath(pathname)) return null;

  function handleDismiss() {
    setDismissed(true);
    document.documentElement.style.setProperty(CSS_VAR, "0px");
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // localStorage nicht verfuegbar
    }
  }

  return (
    <div
      ref={bannerRef}
      className="fixed top-0 left-0 right-0 z-[60] w-full border-b border-amber-500/20"
      style={{
        background: "linear-gradient(135deg, rgba(40,28,8,0.95) 0%, rgba(50,35,12,0.95) 100%)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 sm:gap-3 sm:px-6">
        <p className="text-center text-[11px] font-medium text-amber-200/90 sm:text-xs">
          <span className="font-semibold text-amber-100">Founding-Partner-Pilot</span>
          {" — "}5 Plätze · 30 Tage kostenlos · 12 Monate Preis-Lock.{" "}
          <a
            href="/#founding-partner"
            className="font-semibold text-amber-300 underline underline-offset-2 transition-colors hover:text-amber-100"
          >
            Mehr erfahren &rarr;
          </a>
        </p>
        <button
          onClick={handleDismiss}
          className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-amber-400/50 transition-colors hover:bg-amber-400/10 hover:text-amber-200"
          aria-label="Banner schließen"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
