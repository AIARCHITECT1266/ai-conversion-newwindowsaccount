"use client";

import { useState } from "react";
import {
  Sparkles,
  Upload,
  Palette,
  ArrowLeft,
  Wand2,
  ImagePlus,
  Zap,
  Layers,
} from "lucide-react";
import GenerateButton from "@/components/ai-asset-studio/GenerateButton";
import ImageEditor from "@/components/ai-asset-studio/ImageEditor";

type View = "home" | "generate" | "edit";

export default function AssetsPage() {
  const [view, setView] = useState<View>("home");

  return (
    <div className="min-h-screen bg-[#07070d] text-[#ede8df]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <a
            href={view === "home" ? "/dashboard" : "#"}
            onClick={
              view !== "home"
                ? (e) => {
                    e.preventDefault();
                    setView("home");
                  }
                : undefined
            }
            className="inline-flex items-center gap-1 text-xs text-[#ede8df]/40 hover:text-[#c9a84c] transition-colors mb-4"
          >
            <ArrowLeft className="h-3 w-3" />
            {view === "home" ? "Dashboard" : "Zurueck zur Auswahl"}
          </a>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c9a84c]/10">
              <Palette className="h-5 w-5 text-[#c9a84c]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#ede8df]">AI Asset Studio</h1>
              <p className="text-sm text-[#ede8df]/40">
                {view === "home" && "Erstelle professionelle Bilder fuer dein Marketing"}
                {view === "generate" && "Beschreibe dein Bild und waehle ein KI-Modell"}
                {view === "edit" && "Lade ein Bild hoch und passe es an"}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Start-Seite: Zwei grosse Karten ─── */}
        {view === "home" && (
          <div className="grid gap-4">
            {/* Karte 1: KI-Generierung */}
            <button
              type="button"
              onClick={() => setView("generate")}
              className="group relative overflow-hidden rounded-2xl border border-[#c9a84c]/10 bg-[#0a0a14] p-6 text-left transition-all hover:border-[#c9a84c]/30 hover:bg-[#0e0e1a]"
            >
              {/* Hintergrund-Glow */}
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#c9a84c]/5 blur-2xl transition-all group-hover:bg-[#c9a84c]/10" />

              <div className="relative flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c9a84c]/20 to-[#c9a84c]/5 transition-all group-hover:from-[#c9a84c]/30 group-hover:to-[#c9a84c]/10">
                  <Wand2 className="h-7 w-7 text-[#c9a84c]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[#ede8df] mb-1">
                    Neues Bild mit KI generieren
                  </h2>
                  <p className="text-sm text-[#ede8df]/40 leading-relaxed">
                    Beschreibe, was du brauchst — die KI erstellt ein professionelles
                    Bild in Sekunden. Perfekt fuer Social Media, Ads und Landingpages.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#c9a84c]/10 px-2.5 py-1 text-[10px] font-medium text-[#c9a84c]">
                      <Sparkles className="h-3 w-3" />
                      3 KI-Modelle
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-400">
                      <Zap className="h-3 w-3" />
                      1 Credit pro Bild
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* Karte 2: Upload + Bearbeitung */}
            <button
              type="button"
              onClick={() => setView("edit")}
              className="group relative overflow-hidden rounded-2xl border border-[#c9a84c]/10 bg-[#0a0a14] p-6 text-left transition-all hover:border-[#c9a84c]/30 hover:bg-[#0e0e1a]"
            >
              {/* Hintergrund-Glow */}
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-500/5 blur-2xl transition-all group-hover:bg-purple-500/10" />

              <div className="relative flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 transition-all group-hover:from-purple-500/30 group-hover:to-purple-500/10">
                  <ImagePlus className="h-7 w-7 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[#ede8df] mb-1">
                    Eigenes Bild hochladen &amp; bearbeiten
                  </h2>
                  <p className="text-sm text-[#ede8df]/40 leading-relaxed">
                    Lade ein vorhandenes Bild hoch und optimiere es —
                    Schaerfe, abgerundete Ecken, Brand-Kit und Formatkonvertierung.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-400">
                      <Upload className="h-3 w-3" />
                      Drag &amp; Drop
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                      <Layers className="h-3 w-3" />
                      Kostenlos
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ─── Generate-Flow ─── */}
        {view === "generate" && (
          <>
            <div className="rounded-2xl border border-[#c9a84c]/10 bg-[#0a0a14] p-6">
              <GenerateButton />
            </div>
            <p className="mt-4 text-center text-xs text-[#ede8df]/25">
              Jede Generierung kostet 1 Credit. Bearbeitungen sind kostenlos.
            </p>
          </>
        )}

        {/* ─── Edit-Flow ─── */}
        {view === "edit" && (
          <>
            <div className="rounded-2xl border border-[#c9a84c]/10 bg-[#0a0a14] p-6">
              <ImageEditor />
            </div>
            <p className="mt-4 text-center text-xs text-[#ede8df]/25">
              Bildbearbeitung ist kostenlos und verbraucht keine Credits.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
