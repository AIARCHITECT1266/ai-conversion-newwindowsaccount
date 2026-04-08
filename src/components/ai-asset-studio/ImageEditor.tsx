"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Loader2,
  AlertCircle,
  ImagePlus,
  SlidersHorizontal,
  X,
} from "lucide-react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const BRAND_KITS = [
  { id: "premium-gold", name: "Premium Gold", color: "#C9A84C" },
  { id: "modern-blue", name: "Modern Blue", color: "#3B82F6" },
  { id: "elegant-dark", name: "Elegant Dark", color: "#1E1B4B" },
] as const;

interface EditedAsset {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  fileSize: number;
}

export default function ImageEditor() {
  // Upload-State
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit-Parameter
  const [sharpen, setSharpen] = useState(0);
  const [roundCorners, setRoundCorners] = useState(0);
  const [brandKit, setBrandKit] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<"png" | "webp" | "jpeg">("png");

  // Result-State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EditedAsset | null>(null);

  // ---------- File-Handling ----------

  const handleFile = useCallback((f: File) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Nur JPG, PNG und WebP erlaubt.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("Datei zu gross (max. 10 MB).");
      return;
    }
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

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ---------- Edit-Request ----------

  async function handleEdit() {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("format", outputFormat);
      formData.append("quality", "90");
      if (sharpen > 0) formData.append("sharpen", String(sharpen));
      if (roundCorners > 0) formData.append("roundCorners", String(roundCorners));
      if (brandKit) formData.append("brandKit", brandKit);

      const res = await fetch("/api/asset-studio/edit", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Fehler ${res.status}`);
        return;
      }

      setResult(data.asset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Render ----------

  return (
    <div className="space-y-5">
      {/* Upload-Bereich */}
      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-all ${
            dragOver
              ? "border-[#c9a84c] bg-[#c9a84c]/5"
              : "border-[#c9a84c]/20 bg-[#0e0e1a] hover:border-[#c9a84c]/40"
          }`}
        >
          <Upload className={`h-8 w-8 ${dragOver ? "text-[#c9a84c]" : "text-[#ede8df]/30"}`} />
          <div className="text-center">
            <p className="text-sm font-medium text-[#ede8df]/70">
              Bild hierhin ziehen oder klicken
            </p>
            <p className="text-xs text-[#ede8df]/30 mt-1">
              JPG, PNG, WebP — max. 10 MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      ) : (
        /* Vorschau + Entfernen */
        <div className="relative rounded-xl border border-[#c9a84c]/10 overflow-hidden bg-[#0e0e1a]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Vorschau"
            className="w-full max-h-80 object-contain"
          />
          <button
            type="button"
            onClick={clearFile}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1.5 text-xs text-white/60">
            {file?.name} — {((file?.size ?? 0) / 1024).toFixed(0)} KB
          </div>
        </div>
      )}

      {/* Bearbeitungs-Optionen (nur sichtbar wenn Bild geladen) */}
      {preview && (
        <div className="space-y-4 rounded-xl border border-[#c9a84c]/10 bg-[#0e0e1a] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#ede8df]/50 uppercase tracking-wider">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Bearbeitungsoptionen
          </div>

          {/* Schaerfe */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-[#ede8df]/70">Schaerfe</label>
              <span className="text-xs text-[#ede8df]/40">{sharpen}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sharpen}
              onChange={(e) => setSharpen(Number(e.target.value))}
              className="w-full accent-[#c9a84c]"
            />
          </div>

          {/* Abgerundete Ecken */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-[#ede8df]/70">Abgerundete Ecken</label>
              <span className="text-xs text-[#ede8df]/40">{roundCorners}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={roundCorners}
              onChange={(e) => setRoundCorners(Number(e.target.value))}
              className="w-full accent-[#c9a84c]"
            />
          </div>

          {/* Brand-Kit */}
          <div>
            <label className="block text-sm text-[#ede8df]/70 mb-1.5">Brand-Kit</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setBrandKit("")}
                className={`rounded-lg border px-2 py-1.5 text-xs transition-all ${
                  !brandKit
                    ? "border-[#c9a84c]/50 bg-[#c9a84c]/10 text-[#ede8df]"
                    : "border-[#c9a84c]/10 text-[#ede8df]/40 hover:border-[#c9a84c]/25"
                }`}
              >
                Keins
              </button>
              {BRAND_KITS.map((kit) => (
                <button
                  key={kit.id}
                  type="button"
                  onClick={() => setBrandKit(kit.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-all ${
                    brandKit === kit.id
                      ? "border-[#c9a84c]/50 bg-[#c9a84c]/10 text-[#ede8df]"
                      : "border-[#c9a84c]/10 text-[#ede8df]/40 hover:border-[#c9a84c]/25"
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: kit.color }}
                  />
                  {kit.name}
                </button>
              ))}
            </div>
          </div>

          {/* Ausgabeformat */}
          <div>
            <label className="block text-sm text-[#ede8df]/70 mb-1.5">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(["png", "webp", "jpeg"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setOutputFormat(fmt)}
                  className={`rounded-lg border px-3 py-1.5 text-xs uppercase font-medium transition-all ${
                    outputFormat === fmt
                      ? "border-[#c9a84c]/50 bg-[#c9a84c]/10 text-[#ede8df]"
                      : "border-[#c9a84c]/10 text-[#ede8df]/40 hover:border-[#c9a84c]/25"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bearbeiten-Button */}
      {preview && (
        <button
          type="button"
          onClick={handleEdit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#a8893a] px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Bearbeite...
            </>
          ) : (
            <>
              <ImagePlus className="h-4 w-4" />
              Bild bearbeiten
            </>
          )}
        </button>
      )}

      {/* Fehler */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Ergebnis */}
      {result && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-[#ede8df]/50 uppercase tracking-wider">
            Bearbeitetes Bild
          </div>
          <div className="relative overflow-hidden rounded-xl border border-[#c9a84c]/10 bg-[#0e0e1a]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.imageUrl}
              alt="Bearbeitetes Bild"
              className="w-full max-h-96 object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>{result.width} x {result.height}</span>
                <span>{(result.fileSize / 1024).toFixed(0)} KB</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
