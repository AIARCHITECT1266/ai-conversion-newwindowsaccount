"use client";

import { useState } from "react";
import { Loader2, ImagePlus, Sparkles, AlertCircle } from "lucide-react";

// Verfuegbare Modelle
const MODELS = [
  { id: "flux", name: "Flux (Replicate)", description: "Schnell, hohe Qualitaet" },
  { id: "grok", name: "Grok (x.ai)", description: "Kreativ, experimentell" },
  { id: "gemini", name: "Gemini (Google)", description: "Vielseitig, detail-reich" },
] as const;

interface GeneratedAsset {
  id: string;
  imageUrl: string;
  model: string;
  width: number;
  height: number;
  creditsUsed: number;
}

interface GenerateButtonProps {
  onGenerated?: (assets: GeneratedAsset[]) => void;
}

export default function GenerateButton({ onGenerated }: GenerateButtonProps) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("flux");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedAsset[]>([]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/asset-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          variations: 1,
          width: 1024,
          height: 1024,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Fehler ${res.status}`);
        return;
      }

      setResults(data.assets);
      onGenerated?.(data.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Prompt-Eingabe */}
      <div>
        <label
          htmlFor="asset-prompt"
          className="block text-sm font-medium text-[#ede8df]/70 mb-1.5"
        >
          Bildbeschreibung
        </label>
        <textarea
          id="asset-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Beschreibe das Bild, das du generieren moechtest..."
          rows={3}
          className="w-full rounded-xl bg-[#0e0e1a] border border-[#c9a84c]/10 px-4 py-3 text-sm text-[#ede8df] placeholder-[#ede8df]/30 focus:border-[#c9a84c]/40 focus:outline-none resize-none"
          disabled={loading}
        />
      </div>

      {/* Model-Auswahl */}
      <div>
        <label
          htmlFor="asset-model"
          className="block text-sm font-medium text-[#ede8df]/70 mb-1.5"
        >
          KI-Modell
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModel(m.id)}
              disabled={loading}
              className={`rounded-lg border px-3 py-2 text-left transition-all ${
                model === m.id
                  ? "border-[#c9a84c]/50 bg-[#c9a84c]/10"
                  : "border-[#c9a84c]/10 bg-[#0e0e1a] hover:border-[#c9a84c]/25"
              }`}
            >
              <div className="text-xs font-medium text-[#ede8df]">{m.name}</div>
              <div className="text-[10px] text-[#ede8df]/40 mt-0.5">{m.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Generieren-Button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#a8893a] px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generiere...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Bild generieren
          </>
        )}
      </button>

      {/* Fehler */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Ergebnis-Vorschau */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-[#ede8df]/50 uppercase tracking-wider">
            Generiertes Bild
          </div>
          <div className="grid gap-3">
            {results.map((asset) => (
              <div
                key={asset.id}
                className="group relative overflow-hidden rounded-xl border border-[#c9a84c]/10 bg-[#0e0e1a]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.imageUrl}
                  alt="Generiertes Bild"
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span className="flex items-center gap-1">
                      <ImagePlus className="h-3 w-3" />
                      {asset.model.toUpperCase()}
                    </span>
                    <span>{asset.width} x {asset.height}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
