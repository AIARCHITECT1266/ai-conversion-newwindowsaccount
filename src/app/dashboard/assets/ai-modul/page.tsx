"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Clock, History, X, Bot } from "lucide-react";

// Modell-Konfiguration
const MODELS = [
  {
    id: "claude",
    name: "Claude Sonnet",
    provider: "Anthropic",
    color: "purple",
    gradient: "from-purple-500 to-purple-700",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    toggle: "bg-purple-500",
  },
  {
    id: "gpt4o",
    name: "GPT-4o",
    provider: "OpenAI",
    color: "emerald",
    gradient: "from-emerald-500 to-emerald-700",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    toggle: "bg-emerald-500",
  },
  {
    id: "gemini",
    name: "Gemini Pro",
    provider: "Google",
    color: "blue",
    gradient: "from-blue-500 to-blue-700",
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    toggle: "bg-blue-500",
  },
  {
    id: "mistral",
    name: "Mistral",
    provider: "Mistral AI",
    color: "orange",
    gradient: "from-orange-500 to-orange-700",
    border: "border-orange-500/30",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    toggle: "bg-orange-500",
  },
] as const;

type ModelId = (typeof MODELS)[number]["id"];

interface ModelResult {
  model: string;
  response: string;
  durationMs: number;
  error?: string;
}

interface HistoryEntry {
  prompt: string;
  timestamp: Date;
  results: ModelResult[];
}

export default function AiModulPage() {
  const [prompt, setPrompt] = useState("");
  const [activeModels, setActiveModels] = useState<Set<ModelId>>(
    new Set(["claude", "gpt4o"])
  );
  const [results, setResults] = useState<ModelResult[]>([]);
  const [loading, setLoading] = useState<Set<ModelId>>(new Set());
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const toggleModel = useCallback((modelId: ModelId) => {
    setActiveModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || activeModels.size === 0) return;

    const models = Array.from(activeModels);
    setLoading(new Set(models));
    setResults([]);

    try {
      const res = await fetch("/api/multi-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, models }),
      });

      const data = (await res.json()) as { results: ModelResult[] };

      setResults(data.results);
      setHistory((prev) => [
        { prompt, timestamp: new Date(), results: data.results },
        ...prev.slice(0, 19),
      ]);
    } catch {
      setResults([
        {
          model: "system",
          response: "",
          durationMs: 0,
          error: "Netzwerkfehler – API nicht erreichbar",
        },
      ]);
    } finally {
      setLoading(new Set());
    }
  }, [prompt, activeModels]);

  const loadFromHistory = useCallback((entry: HistoryEntry) => {
    setPrompt(entry.prompt);
    setResults(entry.results);
    setShowHistory(false);
  }, []);

  const activeCount = activeModels.size;

  return (
    <div className="min-h-screen bg-[#07070d] text-white">
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6 lg:px-8">
        {/* Zurueck-Link */}
        <a href="/dashboard/assets"
           className="inline-flex items-center gap-1 text-xs text-[#ede8df]/40 hover:text-[#c9a84c] transition-colors mb-6">
          &larr; Zurück zu AI Studio
        </a>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-500/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-purple-300/80">
            <Bot className="h-3.5 w-3.5" />
            AI Modul
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Multi-AI{" "}
            <span className="text-[#c9a84c]">Interface</span>
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Ein Prompt, mehrere KI-Modelle, parallele Antworten
          </p>
        </motion.div>

        {/* Modell-Toggles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 flex flex-wrap justify-center gap-3"
        >
          {MODELS.map((model) => {
            const isActive = activeModels.has(model.id);
            return (
              <button
                key={model.id}
                onClick={() => toggleModel(model.id)}
                className={`group relative flex items-center gap-3 rounded-xl border px-5 py-3 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? `${model.border} ${model.bg}`
                    : "border-white/[0.06] bg-white/[0.02] opacity-50 hover:opacity-75"
                }`}
              >
                <div
                  className={`h-3 w-3 rounded-full transition-all duration-300 ${
                    isActive ? model.toggle : "bg-slate-600"
                  }`}
                />
                <div className="text-left">
                  <div className={isActive ? model.text : "text-slate-400"}>
                    {model.name}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {model.provider}
                  </div>
                </div>
              </button>
            );
          })}
        </motion.div>

        {/* Aktive Modelle Hinweis */}
        <p className="mb-6 text-center text-xs text-slate-600">
          {activeCount === 0
            ? "Kein Modell ausgewaehlt – bitte mindestens eines aktivieren"
            : `${activeCount} ${activeCount === 1 ? "Modell" : "Modelle"} aktiv`}
        </p>

        {/* Prompt-Eingabe */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mb-10 max-w-3xl"
        >
          <div className="relative flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Prompt eingeben..."
              rows={2}
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-white placeholder-slate-600 outline-none"
            />
            <div className="flex items-center gap-2 pr-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-300"
                title="Prompt-Verlauf"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={!prompt.trim() || activeCount === 0 || loading.size > 0}
                className="rounded-xl bg-[#c9a84c] px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-[#c9a84c]/15 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading.size > 0 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Prompt-Verlauf Dropdown */}
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-8 max-w-3xl rounded-xl border border-white/[0.06] bg-[#0e0e1a] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">
                Prompt-Verlauf
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-slate-600">Noch keine Anfragen</p>
            ) : (
              <div className="space-y-2">
                {history.map((entry, i) => (
                  <button
                    key={i}
                    onClick={() => loadFromHistory(entry)}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <span className="line-clamp-1">{entry.prompt}</span>
                    <span className="text-[11px] text-slate-600">
                      {entry.timestamp.toLocaleTimeString("de-DE")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Lade-Indikatoren */}
        {loading.size > 0 && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODELS.filter((m) => loading.has(m.id)).map((model) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-xl border ${model.border} ${model.bg} p-6`}
              >
                <div className="flex items-center gap-3">
                  <Loader2 className={`h-5 w-5 animate-spin ${model.text}`} />
                  <div>
                    <p className={`text-sm font-medium ${model.text}`}>
                      {model.name}
                    </p>
                    <p className="text-xs text-slate-600">Denkt nach...</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Ergebnis-Karten */}
        {results.length > 0 && loading.size === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2"
          >
            {results.map((result) => {
              const model = MODELS.find((m) => m.id === result.model);
              if (!model) return null;

              return (
                <motion.div
                  key={result.model}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border ${model.border} bg-white/[0.02] p-6`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${model.toggle}`} />
                      <span className={`text-sm font-semibold ${model.text}`}>
                        {model.name}
                      </span>
                      <span className="text-[11px] text-slate-600">
                        {model.provider}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Clock className="h-3 w-3" />
                      {result.durationMs < 1000
                        ? `${result.durationMs}ms`
                        : `${(result.durationMs / 1000).toFixed(1)}s`}
                    </div>
                  </div>

                  {result.error ? (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                      {result.error}
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {result.response}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
