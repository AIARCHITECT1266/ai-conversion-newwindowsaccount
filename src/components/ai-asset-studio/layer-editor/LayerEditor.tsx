"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  ImagePlus,
  Type,
  Square,
  Circle,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Download,
  Sparkles,
  Loader2,
  AlertCircle,
  Upload,
  Sun,
  Moon,
  GripVertical,
  Copy,
} from "lucide-react";
import type { Layer, ImageLayer, TextLayer, ShapeLayer, BlendMode } from "./types";
import { generateId } from "./types";

const KonvaCanvas = dynamic(() => import("./KonvaCanvas"), { ssr: false });

const CANVAS_W = 800;
const CANVAS_H = 600;
const BLEND_MODES: BlendMode[] = ["normal", "multiply", "screen", "overlay", "darken", "lighten"];

export default function LayerEditor() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkCanvas, setDarkCanvas] = useState(true);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedLayer = layers.find((l) => l.id === selectedId) ?? null;
  const canvasBg = darkCanvas ? "#1a1a2e" : "#f0f0f0";

  // ---------- Layer CRUD ----------

  function addLayer(layer: Layer) {
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
  }

  function updateLayer(id: string, attrs: Partial<Layer>) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...attrs } as Layer : l))
    );
  }

  function removeLayer(id: string) {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateLayer(id: string) {
    const src = layers.find((l) => l.id === id);
    if (!src) return;
    const copy = { ...src, id: generateId(), name: `${src.name} (Kopie)`, x: src.x + 20, y: src.y + 20 } as Layer;
    setLayers((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  }

  function moveLayer(id: string, direction: "up" | "down") {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === "up" ? idx + 1 : idx - 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }

  // Layer-Reorder via Drag
  function handleLayerDragStart(id: string) { setDragLayerId(id); }
  function handleLayerDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragLayerId || dragLayerId === targetId) return;
    setLayers((prev) => {
      const fromIdx = prev.findIndex((l) => l.id === dragLayerId);
      const toIdx = prev.findIndex((l) => l.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }
  function handleLayerDragEnd() { setDragLayerId(null); }

  // ---------- Bild-Upload ----------

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const maxW = CANVAS_W * 0.8;
        const maxH = CANVAS_H * 0.8;
        if (w > maxW || h > maxH) {
          const scale = Math.min(maxW / w, maxH / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        addLayer({
          id: generateId(), name: file.name.replace(/\.[^.]+$/, ""), type: "image", src,
          x: Math.round((CANVAS_W - w) / 2), y: Math.round((CANVAS_H - h) / 2),
          width: w, height: h, rotation: 0, opacity: 1, blendMode: "normal", visible: true, locked: false,
        } as ImageLayer);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  function addText() {
    addLayer({
      id: generateId(), name: "Text", type: "text", text: "Dein Text",
      fontSize: 42, fontFamily: "Arial", fontStyle: "bold",
      fill: darkCanvas ? "#ffffff" : "#111111",
      align: "center", x: CANVAS_W / 2 - 120, y: CANVAS_H / 2 - 28,
      width: 240, height: 56, rotation: 0, opacity: 1, blendMode: "normal", visible: true, locked: false,
    } as TextLayer);
  }

  function addShape(kind: "rect" | "circle") {
    addLayer({
      id: generateId(), name: kind === "rect" ? "Rechteck" : "Kreis",
      type: "shape", shapeKind: kind, fill: "#c9a84c", stroke: "", strokeWidth: 0,
      cornerRadius: kind === "rect" ? 12 : 0,
      x: CANVAS_W / 2 - 70, y: CANVAS_H / 2 - 70,
      width: 140, height: 140, rotation: 0, opacity: 1, blendMode: "normal", visible: true, locked: false,
    } as ShapeLayer);
  }

  // Dark/Light Toggle — passt bestehende Text-Layer automatisch an
  function toggleCanvasBg() {
    const newDark = !darkCanvas;
    setDarkCanvas(newDark);
    setLayers((prev) =>
      prev.map((l) => {
        if (l.type !== "text") return l;
        const t = l as TextLayer;
        // Nur automatisch anpassen wenn Farbe rein schwarz oder weiss ist
        if (t.fill === "#ffffff" && !newDark) return { ...t, fill: "#111111" } as Layer;
        if (t.fill === "#111111" && newDark) return { ...t, fill: "#ffffff" } as Layer;
        if (t.fill === "#000000" && newDark) return { ...t, fill: "#ffffff" } as Layer;
        return l;
      })
    );
  }

  // ---------- KI-Generierung ----------

  async function generateAiImage(prompt: string) {
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/asset-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: "flux", variations: 1, width: 512, height: 512 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `Fehler ${res.status}`); return; }
      const asset = data.assets?.[0];
      if (!asset?.imageUrl) { setError("Kein Bild generiert"); return; }
      addLayer({
        id: generateId(), name: `KI: ${prompt.slice(0, 25)}`, type: "image", src: asset.imageUrl,
        x: Math.round((CANVAS_W - 512) / 2), y: Math.round((CANVAS_H - 512) / 2),
        width: 512, height: 512, rotation: 0, opacity: 1, blendMode: "normal", visible: true, locked: false,
      } as ImageLayer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setAiLoading(false);
    }
  }

  function handleExport() {
    const exportFn = (window as unknown as Record<string, unknown>).__exportCanvas as (() => string | null) | undefined;
    const dataUrl = exportFn?.();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `asset-studio-${Date.now()}.png`;
    link.click();
  }

  const hasLayers = layers.length > 0;

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  return (
    <div className="flex flex-col gap-5">

      {/* ═══ Leere Leinwand: Grosse Einladungs-Karten ═══ */}
      {!hasLayers && !showAiPrompt && (
        <div
          className="rounded-2xl border border-white/[0.06] p-8"
          style={{ background: canvasBg }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleImageUpload(f); }}
        >
          <p className="text-center text-sm font-medium text-[#ede8df]/25 mb-6">
            Starte mit einem Element
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
            {/* KI-Bild */}
            <button type="button" onClick={() => setShowAiPrompt(true)} disabled={aiLoading}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-purple-500/15 bg-purple-500/5 p-6 transition-all hover:border-purple-500/30 hover:bg-purple-500/10 disabled:opacity-40">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/15 transition-colors group-hover:bg-purple-500/25">
                {aiLoading ? <Loader2 className="h-6 w-6 text-purple-400 animate-spin" /> : <Sparkles className="h-6 w-6 text-purple-400" />}
              </div>
              <span className="text-sm font-semibold text-purple-300">KI-Bild erstellen</span>
            </button>

            {/* Bild hochladen */}
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-[#c9a84c]/15 bg-[#c9a84c]/5 p-6 transition-all hover:border-[#c9a84c]/30 hover:bg-[#c9a84c]/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c9a84c]/15 transition-colors group-hover:bg-[#c9a84c]/25">
                <Upload className="h-6 w-6 text-[#c9a84c]" />
              </div>
              <span className="text-sm font-semibold text-[#c9a84c]">Bild hochladen</span>
            </button>

            {/* Text */}
            <button type="button" onClick={addText}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-white/15 hover:bg-white/[0.04]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] transition-colors group-hover:bg-white/10">
                <Type className="h-6 w-6 text-[#ede8df]/50" />
              </div>
              <span className="text-sm font-semibold text-[#ede8df]/50">Text hinzufuegen</span>
            </button>

            {/* Form */}
            <button type="button" onClick={() => addShape("rect")}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-white/15 hover:bg-white/[0.04]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] transition-colors group-hover:bg-white/10">
                <Square className="h-6 w-6 text-[#ede8df]/50" />
              </div>
              <span className="text-sm font-semibold text-[#ede8df]/50">Form hinzufuegen</span>
            </button>
          </div>

          {/* Dark/Light + Drag-Hint */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button type="button" onClick={toggleCanvasBg}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.06] px-3 py-1.5 text-xs text-[#ede8df]/30 hover:text-[#ede8df]/50">
              {darkCanvas ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {darkCanvas ? "Hell" : "Dunkel"}
            </button>
            <span className="text-xs text-[#ede8df]/15">oder Bild hierhin ziehen</span>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }}
        className="hidden" />

      {/* ═══ KI-Prompt Eingabe (auch im leeren Zustand) ═══ */}
      {showAiPrompt && (
        <div className="flex gap-2 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
          <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Beschreibe das Bild, z.B. 'Luxurioeses Logo in Gold auf schwarzem Hintergrund'"
            className="flex-1 rounded-lg bg-[#0e0e1a] border border-white/10 px-4 py-2.5 text-sm text-[#ede8df] placeholder-[#ede8df]/25 focus:outline-none focus:border-purple-500/40"
            onKeyDown={(e) => {
              if (e.key === "Enter" && aiPrompt.trim()) { generateAiImage(aiPrompt.trim()); setShowAiPrompt(false); setAiPrompt(""); }
              if (e.key === "Escape") { setShowAiPrompt(false); setAiPrompt(""); }
            }}
            autoFocus />
          <button type="button"
            onClick={() => { if (aiPrompt.trim()) { generateAiImage(aiPrompt.trim()); setShowAiPrompt(false); setAiPrompt(""); } }}
            disabled={!aiPrompt.trim() || aiLoading}
            className="rounded-lg bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-40">
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Erstellen"}
          </button>
          <button type="button" onClick={() => { setShowAiPrompt(false); setAiPrompt(""); }}
            className="rounded-lg border border-white/10 px-3 py-2.5 text-xs text-[#ede8df]/30 hover:text-[#ede8df]/60">
            Esc
          </button>
        </div>
      )}

      {/* Fehler */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
          <button type="button" onClick={() => setError(null)} className="ml-auto text-red-400/40 hover:text-red-400 text-xs">x</button>
        </div>
      )}

      {/* ═══ Editor (Canvas + Toolbar + Panel) — nur wenn Layer existieren ═══ */}
      {hasLayers && (
        <>
          {/* Kompakte Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-[#c9a84c]/20 bg-[#c9a84c]/8 px-3 py-2 text-xs font-medium text-[#c9a84c] hover:bg-[#c9a84c]/15">
              <Upload className="h-3.5 w-3.5" /> Bild
            </button>
            <button type="button" onClick={() => setShowAiPrompt(true)} disabled={aiLoading}
              className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/8 px-3 py-2 text-xs font-medium text-purple-400 hover:bg-purple-500/15 disabled:opacity-40">
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} KI
            </button>
            <span className="w-px h-5 bg-white/[0.06]" />
            <button type="button" onClick={addText}
              className="rounded-lg border border-white/[0.06] p-2 text-[#ede8df]/40 hover:text-[#ede8df] hover:bg-white/5" title="Text">
              <Type className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => addShape("rect")}
              className="rounded-lg border border-white/[0.06] p-2 text-[#ede8df]/40 hover:text-[#ede8df] hover:bg-white/5" title="Rechteck">
              <Square className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => addShape("circle")}
              className="rounded-lg border border-white/[0.06] p-2 text-[#ede8df]/40 hover:text-[#ede8df] hover:bg-white/5" title="Kreis">
              <Circle className="h-3.5 w-3.5" />
            </button>

            <div className="flex-1" />

            <button type="button" onClick={toggleCanvasBg}
              className="rounded-lg border border-white/[0.06] p-2 text-[#ede8df]/30 hover:text-[#ede8df]/60" title={darkCanvas ? "Heller Hintergrund" : "Dunkler Hintergrund"}>
              {darkCanvas ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={handleExport}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#a8893a] px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>

          {/* Canvas + Panel */}
          <div className="flex gap-4">
            {/* Canvas */}
            <div className="flex-1 min-w-0 overflow-hidden rounded-xl border border-white/[0.06]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleImageUpload(f); }}>
              <div style={{ maxWidth: "100%", overflow: "auto" }}>
                <KonvaCanvas
                  layers={layers}
                  selectedLayerId={selectedId}
                  canvasWidth={CANVAS_W}
                  canvasHeight={CANVAS_H}
                  canvasBg={canvasBg}
                  onSelect={setSelectedId}
                  onTransform={updateLayer}
                />
              </div>
            </div>

            {/* Layer-Panel */}
            <div className="w-56 shrink-0 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-[#ede8df]/30 uppercase tracking-widest px-1">
                Layer ({layers.length})
              </span>

              {/* Layer-Liste mit Drag-Reorder */}
              <div className="space-y-px max-h-[280px] overflow-y-auto rounded-xl bg-[#0e0e1a]/60 p-1">
                {[...layers].reverse().map((layer) => {
                  const isSel = selectedId === layer.id;
                  const isDragging = dragLayerId === layer.id;
                  return (
                    <div key={layer.id}
                      draggable
                      onDragStart={() => handleLayerDragStart(layer.id)}
                      onDragOver={(e) => handleLayerDragOver(e, layer.id)}
                      onDragEnd={handleLayerDragEnd}
                      onClick={() => setSelectedId(layer.id)}
                      className={`group flex items-center gap-1 rounded-lg px-1.5 py-1.5 cursor-pointer select-none transition-colors ${
                        isDragging ? "opacity-40" :
                        isSel ? "bg-[#c9a84c]/12 text-[#c9a84c]" :
                        "text-[#ede8df]/45 hover:bg-white/[0.03] hover:text-[#ede8df]/65"
                      }`}>
                      <GripVertical className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-30 cursor-grab active:cursor-grabbing" />
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${isSel ? "bg-[#c9a84c]/20" : "bg-white/[0.03]"}`}>
                        {layer.type === "image" && <ImagePlus className="h-2.5 w-2.5" />}
                        {layer.type === "text" && <Type className="h-2.5 w-2.5" />}
                        {layer.type === "shape" && <Square className="h-2.5 w-2.5" />}
                      </div>
                      <span className="flex-1 truncate text-[11px] font-medium">{layer.name}</span>
                      {!layer.visible && <EyeOff className="h-2.5 w-2.5 text-red-400/40" />}
                      {layer.locked && <Lock className="h-2.5 w-2.5 text-yellow-500/40" />}
                    </div>
                  );
                })}
              </div>

              {/* Properties */}
              {selectedLayer && (
                <div className="space-y-2.5 rounded-xl border border-white/[0.04] bg-[#0e0e1a]/60 p-2.5">
                  {/* Deckkraft */}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-[#ede8df]/40">Deckkraft</span>
                      <span className="text-[10px] text-[#ede8df]/25 tabular-nums">{Math.round(selectedLayer.opacity * 100)}%</span>
                    </div>
                    <input type="range" min={0} max={100} step={1}
                      value={Math.round(selectedLayer.opacity * 100)}
                      onChange={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) / 100 })}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer bg-[#ede8df]/8 accent-[#c9a84c]" />
                  </div>

                  {/* Blend Mode */}
                  <select value={selectedLayer.blendMode}
                    onChange={(e) => updateLayer(selectedLayer.id, { blendMode: e.target.value as BlendMode })}
                    className="w-full rounded-lg bg-[#0a0a14] border border-white/[0.04] px-2 py-1 text-[11px] text-[#ede8df]/60 focus:outline-none cursor-pointer">
                    {BLEND_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>

                  {/* Text */}
                  {selectedLayer.type === "text" && (
                    <div className="space-y-2">
                      <input type="text" value={(selectedLayer as TextLayer).text}
                        onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value } as Partial<Layer>)}
                        className="w-full rounded-lg bg-[#0a0a14] border border-white/[0.04] px-2 py-1 text-[11px] text-[#ede8df] focus:outline-none" />
                      <div className="flex items-center gap-2">
                        <input type="range" min={12} max={120} step={1}
                          value={(selectedLayer as TextLayer).fontSize}
                          onChange={(e) => updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) } as Partial<Layer>)}
                          className="flex-1 h-1 rounded-full appearance-none cursor-pointer bg-[#ede8df]/8 accent-[#c9a84c]" />
                        <input type="color" value={(selectedLayer as TextLayer).fill}
                          onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value } as Partial<Layer>)}
                          className="w-6 h-6 rounded cursor-pointer border border-white/10 bg-transparent shrink-0" />
                      </div>
                    </div>
                  )}

                  {/* Shape */}
                  {selectedLayer.type === "shape" && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#ede8df]/40">Farbe</span>
                      <input type="color" value={(selectedLayer as ShapeLayer).fill}
                        onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value } as Partial<Layer>)}
                        className="w-6 h-6 rounded cursor-pointer border border-white/10 bg-transparent" />
                    </div>
                  )}

                  {/* Aktionen */}
                  <div className="flex gap-1 pt-0.5">
                    <button type="button" onClick={() => updateLayer(selectedLayer.id, { visible: !selectedLayer.visible })}
                      className="flex-1 flex items-center justify-center rounded-md border border-white/[0.04] py-1 text-[#ede8df]/30 hover:text-[#ede8df]/60 hover:bg-white/[0.02]">
                      {selectedLayer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                    <button type="button" onClick={() => moveLayer(selectedLayer.id, "up")}
                      className="flex-1 flex items-center justify-center rounded-md border border-white/[0.04] py-1 text-[#ede8df]/30 hover:text-[#ede8df]/60 hover:bg-white/[0.02]">
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => moveLayer(selectedLayer.id, "down")}
                      className="flex-1 flex items-center justify-center rounded-md border border-white/[0.04] py-1 text-[#ede8df]/30 hover:text-[#ede8df]/60 hover:bg-white/[0.02]">
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => duplicateLayer(selectedLayer.id)}
                      className="flex-1 flex items-center justify-center rounded-md border border-white/[0.04] py-1 text-[#ede8df]/30 hover:text-[#ede8df]/60 hover:bg-white/[0.02]">
                      <Copy className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => removeLayer(selectedLayer.id)}
                      className="flex items-center justify-center rounded-md border border-red-500/10 px-2 py-1 text-red-400/40 hover:text-red-400 hover:bg-red-500/8">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
