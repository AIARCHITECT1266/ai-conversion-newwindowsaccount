"use client";

import { useState, useEffect } from "react";
import { ImagePlus, Palette, CreditCard, ArrowLeft } from "lucide-react";
import GenerateButton from "@/components/ai-asset-studio/GenerateButton";

interface CreditInfo {
  monthlyIncluded: number;
  used: number;
  bonusCredits: number;
  remaining: number;
}

export default function AssetsPage() {
  const [credits, setCredits] = useState<CreditInfo | null>(null);

  // Credits beim Laden abrufen (Best-Effort, nicht blockierend)
  useEffect(() => {
    fetch("/api/asset-studio/generate", { method: "OPTIONS" })
      .catch(() => null);
  }, []);

  return (
    <div className="min-h-screen bg-[#07070d] text-[#ede8df]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs text-[#ede8df]/40 hover:text-[#c9a84c] transition-colors mb-4"
          >
            <ArrowLeft className="h-3 w-3" />
            Dashboard
          </a>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c9a84c]/10">
              <Palette className="h-5 w-5 text-[#c9a84c]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#ede8df]">AI Asset Studio</h1>
              <p className="text-sm text-[#ede8df]/40">
                KI-generierte Bilder fuer Marketing und Social Media
              </p>
            </div>
          </div>
        </div>

        {/* Credit-Info */}
        {credits && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-[#c9a84c]/10 bg-[#0e0e1a] px-4 py-2.5">
            <CreditCard className="h-4 w-4 text-[#c9a84c]/60" />
            <span className="text-sm text-[#ede8df]/60">
              {credits.remaining} von {credits.monthlyIncluded + credits.bonusCredits} Credits verfuegbar
            </span>
          </div>
        )}

        {/* Generator-Card */}
        <div className="rounded-2xl border border-[#c9a84c]/10 bg-[#0a0a14] p-6">
          <div className="flex items-center gap-2 mb-5">
            <ImagePlus className="h-4 w-4 text-[#c9a84c]" />
            <h2 className="text-sm font-semibold text-[#ede8df]">Bild generieren</h2>
          </div>
          <GenerateButton />
        </div>

        {/* Hinweis */}
        <p className="mt-4 text-center text-xs text-[#ede8df]/25">
          Jede Generierung kostet 1 Credit. Bearbeitungen sind kostenlos.
        </p>
      </div>
    </div>
  );
}
