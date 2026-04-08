"use client";

import { Zap, MessageSquare, ArrowRight } from "lucide-react";

export default function AssetsPage() {
  return (
    <div className="min-h-screen bg-[#07070d] text-[#ede8df]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "Georgia, serif" }}>
          AI Studio
        </h1>
        <p className="text-sm text-slate-500 mb-10">
          Waehle ein Tool, um loszulegen.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Card 1 – Asset Generator */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-6 flex flex-col">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#c9a84c]/10 mb-5">
              <Zap className="h-5 w-5 text-[#c9a84c]" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Asset Generator</h2>
            <p className="text-sm text-slate-400 leading-relaxed flex-1">
              KI-Bildgenerierung &amp; Bearbeitung fuer Ads, Social Media und Marketing.
            </p>
            <a
              href="/dashboard/assets/generator"
              className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-3 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
            >
              Oeffnen <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* Card 2 – AI Modul */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-6 flex flex-col">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 mb-5">
              <MessageSquare className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">AI Modul</h2>
            <p className="text-sm text-slate-400 leading-relaxed flex-1">
              Prompts an Claude, GPT-4o, Grok und Gemini – direkt im Dashboard.
            </p>
            <a
              href="/dashboard/assets/ai-modul"
              className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-3 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
            >
              Oeffnen <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
