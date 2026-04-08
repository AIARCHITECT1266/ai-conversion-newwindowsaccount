"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Sparkles,
  Upload,
  Palette,
  ArrowLeft,
  Wand2,
  ImagePlus,
  Zap,
  Layers,
  PenTool,
} from "lucide-react";
import GenerateButton from "@/components/ai-asset-studio/GenerateButton";
import ImageEditor from "@/components/ai-asset-studio/ImageEditor";

// Layer-Editor: SSR-safe dynamic import
const LayerEditor = dynamic(
  () => import("@/components/ai-asset-studio/layer-editor/LayerEditor"),
  { ssr: false }
);

type View = "home" | "generate" | "edit" | "editor";

export default function AssetsPage() {
  const [view, setView] = useState<View>("home");

  return (
    <div className="min-h-screen bg-[#07070d] text-[#ede8df]">
      <div className={`mx-auto px-4 py-8 ${view === "editor" ? "max-w-6xl" : "max-w-2xl"}`}>
        {/* Header */}
        <div className="mb-8">
          <a
            href={view === "home" ? "/dashboard" : "#"}
            onClick={
              view !== "home"
                ? (e) => { e.preventDefault(); setView("home"); }
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
                {view === "editor" && "Layer-basierter Editor mit KI-Integration"}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Start-Seite: Drei Karten ─── */}
        {view === "home" && (
          <div className="grid gap-4">
            {/* Karte 1: Layer-Editor (NEU — Hauptfeature) */}
            <button
              type="button"
              onClick={() => setView("editor")}
              className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#0a0a14] p-6 text-left transition-all hover:border-emerald-500/40 hover:bg-[#0e0e1a]"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl transition-all group-hover:bg-emerald-500/10" />
              <div className="relative flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 transition-all group-hover:from-emerald-500/30 group-hover:to-emerald-500/10">
                  <PenTool className="h-7 w-7 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[#ede8df] mb-1">
                    Layer-Editor
                  </h2>
                  <p className="text-sm text-[#ede8df]/40 leading-relaxed">
                    Professioneller Editor mit Layern, Drag &amp; Drop, Text-Overlays,
                    Formen und KI-Bildgenerierung direkt auf der Leinwand.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                      <Layers className="h-3 w-3" /> Multi-Layer
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-400">
                      <Sparkles className="h-3 w-3" /> KI-Integration
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#c9a84c]/10 px-2.5 py-1 text-[10px] font-medium text-[#c9a84c]">
                      <Wand2 className="h-3 w-3" /> PNG Export
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* Karte 2: KI-Generierung */}
            <button
              type="button"
              onClick={() => setView("generate")}
              className="group relative overflow-hidden rounded-2xl border border-[#c9a84c]/10 bg-[#0a0a14] p-6 text-left transition-all hover:border-[#c9a84c]/30 hover:bg-[#0e0e1a]"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#c9a84c]/5 blur-2xl transition-all group-hover:bg-[#c9a84c]/10" />
              <div className="relative flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c9a84c]/20 to-[#c9a84c]/5">
                  <Wand2 className="h-7 w-7 text-[#c9a84c]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[#ede8df] mb-1">Schnell-Generierung</h2>
                  <p className="text-sm text-[#ede8df]/40 leading-relaxed">
                    Ein Prompt, ein Klick — KI-Bild sofort herunterladen.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#c9a84c]/10 px-2.5 py-1 text-[10px] font-medium text-[#c9a84c]">
                      <Sparkles className="h-3 w-3" /> 3 KI-Modelle
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-400">
                      <Zap className="h-3 w-3" /> 1 Credit
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* Karte 3: Upload + Bearbeitung */}
            <button
              type="button"
              onClick={() => setView("edit")}
              className="group relative overflow-hidden rounded-2xl border border-[#c9a84c]/10 bg-[#0a0a14] p-6 text-left transition-all hover:border-[#c9a84c]/30 hover:bg-[#0e0e1a]"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-500/5 blur-2xl transition-all group-hover:bg-purple-500/10" />
              <div className="relative flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
                  <ImagePlus className="h-7 w-7 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[#ede8df] mb-1">Quick-Edit</h2>
                  <p className="text-sm text-[#ede8df]/40 leading-relaxed">
                    Bild hochladen, Helligkeit/Kontrast/Schaerfe anpassen, herunterladen.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-400">
                      <Upload className="h-3 w-3" /> Drag &amp; Drop
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ─── Layer-Editor ─── */}
        {view === "editor" && (
          <div className="rounded-2xl border border-[#c9a84c]/10 bg-[#0a0a14] p-5">
            <LayerEditor />
          </div>
        )}

        {/* ─── Generate-Flow ─── */}
        {view === "generate" && (
          <>
            <div className="rounded-2xl border border-[#c9a84c]/10 bg-[#0a0a14] p-6">
              <GenerateButton />
            </div>
            <p className="mt-4 text-center text-xs text-[#ede8df]/25">
              Jede Generierung kostet 1 Credit.
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
              Bildbearbeitung ist kostenlos.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
