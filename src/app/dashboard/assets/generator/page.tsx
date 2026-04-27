"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Sparkles,
  Upload,
  Wand2,
  ImagePlus,
  Zap,
  Layers,
  PenTool,
} from "lucide-react";
import GenerateButton from "@/components/ai-asset-studio/GenerateButton";
import ImageEditor from "@/components/ai-asset-studio/ImageEditor";

const LayerEditor = dynamic(
  () => import("@/components/ai-asset-studio/layer-editor/LayerEditor"),
  { ssr: false }
);

type View = "home" | "generate" | "edit" | "editor";

export default function GeneratorPage() {
  const [view, setView] = useState<View>("home");

  return (
    <div className="min-h-screen bg-[#07070d] text-[#ede8df]">
      <div className={`mx-auto px-4 py-8 ${view === "editor" ? "max-w-6xl" : "max-w-2xl"}`}>
        {/* Zurueck-Link */}
        <a
          href={view === "home" ? "/dashboard/assets" : "#"}
          onClick={
            view !== "home"
              ? (e) => { e.preventDefault(); setView("home"); }
              : undefined
          }
          className="inline-flex items-center gap-1 text-xs text-[#ede8df]/40 hover:text-[#c9a84c] transition-colors mb-6"
        >
          &larr; {view === "home" ? "Zurück zu AI Studio" : "Zurück zur Auswahl"}
        </a>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-[#ede8df]">Asset Generator</h1>
          <p className="text-sm text-[#ede8df]/40 mt-1">
            {view === "home" && "KI-Bilder generieren, bearbeiten oder im Layer-Editor kombinieren"}
            {view === "generate" && "Beschreibe dein Bild und wähle ein KI-Modell"}
            {view === "edit" && "Lade ein Bild hoch und passe es an"}
            {view === "editor" && "Layer-basierter Editor mit KI-Integration"}
          </p>
        </div>

        {/* ─── Start-Seite: Drei Karten ─── */}
        {view === "home" && (
          <div className="grid gap-4">
            {/* Karte 1: Layer-Editor */}
            <button type="button" onClick={() => setView("editor")}
              className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#0e0e1a] p-6 text-left transition-all hover:border-emerald-500/40 hover:bg-[#12121f]">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl transition-all group-hover:bg-emerald-500/10" />
              <div className="relative flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 transition-transform group-hover:scale-105">
                  <PenTool className="h-7 w-7 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[#ede8df] mb-1">Layer-Editor</h2>
                  <p className="text-sm text-[#ede8df]/40 leading-relaxed">
                    Professioneller Editor mit Layern, Text-Overlays, Formen und KI-Bildgenerierung.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                      <Layers className="h-3 w-3" /> Multi-Layer
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-400">
                      <Sparkles className="h-3 w-3" /> KI-Integration
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* Karte 2: Schnell-Generierung */}
            <button type="button" onClick={() => setView("generate")}
              className="group relative overflow-hidden rounded-2xl border border-[#c9a84c]/10 bg-[#0e0e1a] p-6 text-left transition-all hover:border-[#c9a84c]/30 hover:bg-[#12121f]">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#c9a84c]/5 blur-2xl transition-all group-hover:bg-[#c9a84c]/10" />
              <div className="relative flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c9a84c]/20 to-[#c9a84c]/5 transition-transform group-hover:scale-105">
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

            {/* Karte 3: Quick-Edit */}
            <button type="button" onClick={() => setView("edit")}
              className="group relative overflow-hidden rounded-2xl border border-[#c9a84c]/10 bg-[#0e0e1a] p-6 text-left transition-all hover:border-[#c9a84c]/30 hover:bg-[#12121f]">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-500/5 blur-2xl transition-all group-hover:bg-purple-500/10" />
              <div className="relative flex gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 transition-transform group-hover:scale-105">
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
