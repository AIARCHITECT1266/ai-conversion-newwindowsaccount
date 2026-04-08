"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Loader2,
  AlertCircle,
  ImagePlus,
  SlidersHorizontal,
  X,
  Download,
  RotateCcw,
} from "lucide-react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const BRAND_KITS = [
  { id: "premium-gold", name: "Premium Gold", color: "#C9A84C" },
  { id: "modern-purple", name: "Modern Purple", color: "#8b5cf6" },
  { id: "clean-white", name: "Clean White", color: "#ffffff" },
] as const;

interface EditedAsset {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  fileSize: number;
}

const DEFAULTS = {
  sharpen: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  vignette: 0,
  roundCorners: 0,
};

// ---------- Slider als eigene Komponente (kein Re-Create bei jedem Render) ----------

function Slider({ label, value, onChange, min = 0, max = 100, unit = "%", center }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  center?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-[#ede8df]/60">{label}</label>
        <span className={`text-xs tabular-nums min-w-[3rem] text-right ${value !== (center ? 0 : min) ? "text-[#c9a84c]" : "text-[#ede8df]/30"}`}>
          {value > 0 && center ? "+" : ""}{value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[#ede8df]/10 accent-[#c9a84c] [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c9a84c] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
      />
    </div>
  );
}

// ---------- Hauptkomponente ----------

export default function ImageEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sharpen, setSharpen] = useState(DEFAULTS.sharpen);
  const [brightness, setBrightness] = useState(DEFAULTS.brightness);
  const [contrast, setContrast] = useState(DEFAULTS.contrast);
  const [saturation, setSaturation] = useState(DEFAULTS.saturation);
  const [vignette, setVignette] = useState(DEFAULTS.vignette);
  const [roundCorners, setRoundCorners] = useState(DEFAULTS.roundCorners);
  const [brandKit, setBrandKit] = useState("");
  const [outputFormat, setOutputFormat] = useState<"png" | "webp" | "jpeg">("png");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EditedAsset | null>(null);

  // ---------- Live-Preview: CSS-Filter direkt berechnen (kein useMemo noetig) ----------
  // Staerkere Bereiche als vorher:
  // Helligkeit: -100..+100 → CSS 0.0..2.0 (vorher 0.3..1.7)
  // Kontrast: -100..+100 → CSS 0.0..3.0 (vorher 0.3..2.5)
  // Saettigung: -100..+100 → CSS 0.0..3.0 (vorher 0..2)

  const cssFilters: string[] = [];
  if (brightness !== 0) cssFilters.push(`brightness(${1 + brightness / 100})`);
  if (contrast !== 0) cssFilters.push(`contrast(${1 + (contrast / 100) * 2})`);
  if (saturation !== 0) cssFilters.push(`saturate(${1 + (saturation / 100) * 2})`);

  const imgStyle: React.CSSProperties = {
    filter: cssFilters.length > 0 ? cssFilters.join(" ") : undefined,
    borderRadius: roundCorners > 0 ? `${roundCorners}px` : undefined,
  };

  // Vignette CSS
  const vignetteStyle: React.CSSProperties | undefined = vignette > 0
    ? {
        background: `radial-gradient(ellipse at center, transparent ${Math.max(0, 55 - vignette * 0.5)}%, rgba(0,0,0,${0.2 + (vignette / 100) * 0.7}) 100%)`,
        borderRadius: roundCorners > 0 ? `${roundCorners}px` : undefined,
      }
    : undefined;

  const hasChanges = sharpen !== 0 || brightness !== 0 || contrast !== 0
    || saturation !== 0 || vignette !== 0 || roundCorners !== 0 || brandKit !== "";

  // ---------- File-Handling ----------

  const handleFile = useCallback((f: File) => {
    if (!ALLOWED_TYPES.includes(f.type)) { setError("Nur JPG, PNG und WebP erlaubt."); return; }
    if (f.size > MAX_FILE_SIZE) { setError("Datei zu gross (max. 10 MB)."); return; }
    setError(null);
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    resetSliders();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetSliders() {
    setSharpen(0); setBrightness(0); setContrast(0);
    setSaturation(0); setVignette(0); setRoundCorners(0);
    setBrandKit("");
  }

  // ---------- Edit-Request ----------

  async function handleEdit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null); // Altes Ergebnis immer zuruecksetzen

    const formData = new FormData();
    formData.append("file", file);
    formData.append("format", outputFormat);
    formData.append("quality", "90");
    if (sharpen !== 0) formData.append("sharpen", String(sharpen));
    if (brightness !== 0) formData.append("brightness", String(brightness));
    if (contrast !== 0) formData.append("contrast", String(contrast));
    if (saturation !== 0) formData.append("saturation", String(saturation));
    if (vignette !== 0) formData.append("vignette", String(vignette));
    if (roundCorners > 0) formData.append("roundCorners", String(roundCorners));
    if (brandKit) formData.append("brandKit", brandKit);

    try {
      const res = await fetch("/api/asset-studio/edit", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `Fehler ${res.status}`); return; }
      setResult(data.asset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const link = document.createElement("a");
    link.href = result.imageUrl;
    link.download = `asset-studio-${result.id}.${outputFormat}`;
    link.click();
  }

  // ---------- Render ----------

  return (
    <div className="space-y-5">
      {/* Upload */}
      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 cursor-pointer transition-colors ${
            dragOver
              ? "border-[#c9a84c] bg-[#c9a84c]/5"
              : "border-[#c9a84c]/20 bg-[#0e0e1a] hover:border-[#c9a84c]/40"
          }`}
        >
          <Upload className={`h-8 w-8 ${dragOver ? "text-[#c9a84c]" : "text-[#ede8df]/30"}`} />
          <div className="text-center">
            <p className="text-sm font-medium text-[#ede8df]/70">Bild hierhin ziehen oder klicken</p>
            <p className="text-xs text-[#ede8df]/30 mt-1">JPG, PNG, WebP — max. 10 MB</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            className="hidden" />
        </div>
      ) : (
        /* Live-Vorschau — kein transition auf img (verhindert Slider-Stocken) */
        <div className="relative rounded-xl border border-[#c9a84c]/10 overflow-hidden bg-[#0e0e1a]">
          {vignetteStyle && (
            <div className="absolute inset-0 pointer-events-none z-10" style={vignetteStyle} />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Vorschau" className="w-full max-h-80 object-contain" style={imgStyle} />
          <button type="button" onClick={clearFile}
            className="absolute top-2 right-2 z-20 rounded-full bg-black/60 p-1.5 text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1.5 text-xs text-white/60 z-20">
            {file?.name} — {((file?.size ?? 0) / 1024).toFixed(0)} KB
          </div>
        </div>
      )}

      {/* Slider-Panel */}
      {preview && (
        <div className="space-y-4 rounded-xl border border-[#c9a84c]/10 bg-[#0e0e1a] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#ede8df]/50 uppercase tracking-wider">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Anpassungen
            </div>
            {hasChanges && (
              <button type="button" onClick={resetSliders}
                className="flex items-center gap-1 text-xs text-[#ede8df]/30 hover:text-[#c9a84c]">
                <RotateCcw className="h-3 w-3" /> Zuruecksetzen
              </button>
            )}
          </div>

          <div className="grid gap-3.5">
            <Slider label="Helligkeit" value={brightness} onChange={setBrightness} min={-100} max={100} center />
            <Slider label="Kontrast" value={contrast} onChange={setContrast} min={-100} max={100} center />
            <Slider label="Saettigung" value={saturation} onChange={setSaturation} min={-100} max={100} center />
            <Slider label="Schaerfe" value={sharpen} onChange={setSharpen} max={100} />
            <Slider label="Vignette" value={vignette} onChange={setVignette} max={100} />
            <Slider label="Abgerundete Ecken" value={roundCorners} onChange={setRoundCorners} max={200} unit="px" />
          </div>

          {/* Brand-Kit */}
          <div>
            <label className="block text-xs font-medium text-[#ede8df]/60 mb-1.5">Brand-Kit</label>
            <div className="grid grid-cols-4 gap-2">
              <button type="button" onClick={() => setBrandKit("")}
                className={`rounded-lg border px-2 py-1.5 text-xs ${!brandKit ? "border-[#c9a84c]/50 bg-[#c9a84c]/10 text-[#ede8df]" : "border-[#c9a84c]/10 text-[#ede8df]/40 hover:border-[#c9a84c]/25"}`}>
                Keins
              </button>
              {BRAND_KITS.map((kit) => (
                <button key={kit.id} type="button" onClick={() => setBrandKit(kit.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs ${brandKit === kit.id ? "border-[#c9a84c]/50 bg-[#c9a84c]/10 text-[#ede8df]" : "border-[#c9a84c]/10 text-[#ede8df]/40 hover:border-[#c9a84c]/25"}`}>
                  <span className="h-3 w-3 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: kit.color }} />
                  {kit.name}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-xs font-medium text-[#ede8df]/60 mb-1.5">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(["png", "webp", "jpeg"] as const).map((fmt) => (
                <button key={fmt} type="button" onClick={() => setOutputFormat(fmt)}
                  className={`rounded-lg border px-3 py-1.5 text-xs uppercase font-medium ${outputFormat === fmt ? "border-[#c9a84c]/50 bg-[#c9a84c]/10 text-[#ede8df]" : "border-[#c9a84c]/10 text-[#ede8df]/40 hover:border-[#c9a84c]/25"}`}>
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Verarbeiten-Button */}
      {preview && (
        <button type="button" onClick={handleEdit} disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#a8893a] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Verarbeite...</>
            : <><ImagePlus className="h-4 w-4" /> Bild verarbeiten</>}
        </button>
      )}

      {/* Fehler */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{error}
        </div>
      )}

      {/* Ergebnis + Download */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#ede8df]/50 uppercase tracking-wider">Ergebnis</span>
            <button type="button" onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg border border-[#c9a84c]/20 bg-[#c9a84c]/10 px-3 py-1.5 text-xs font-medium text-[#c9a84c] hover:bg-[#c9a84c]/20">
              <Download className="h-3.5 w-3.5" /> Herunterladen (.{outputFormat})
            </button>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-[#c9a84c]/10 bg-[#0e0e1a]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.imageUrl} alt="Bearbeitetes Bild" className="w-full max-h-96 object-contain" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>{result.width} x {result.height}</span>
                <span>{(result.fileSize / 1024).toFixed(0)} KB — {outputFormat.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
