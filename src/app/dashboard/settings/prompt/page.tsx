"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Info } from "lucide-react";

export default function PromptSettingsPage() {
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/settings/prompt")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setPrompt(data.systemPrompt ?? "");
          setPlan(data.plan ?? "STARTER");
        }
      })
      .catch(() => setMessage({ type: "error", text: "Fehler beim Laden" }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/dashboard/settings/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: prompt }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "System-Prompt gespeichert" });
      } else {
        setMessage({ type: "error", text: data.error ?? "Fehler beim Speichern" });
      }
    } catch {
      setMessage({ type: "error", text: "Verbindungsfehler" });
    } finally {
      setSaving(false);
    }
  }

  const planLabels: Record<string, string> = {
    STARTER: "Starter",
    GROWTH: "Growth",
    PROFESSIONAL: "Professional",
    ENTERPRISE: "Enterprise",
  };

  return (
    <div>
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Phase 2b.4a.6: Redundanter min-h-screen-Wrapper und
            Back-Button entfernt — Settings-Layout liefert Wrapper,
            Top-Nav (Phase 2b.2) den Pfad zur Uebersicht. */}

        {/* Ueberschrift + Plan-Badge */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold">System-Prompt anpassen</h1>
          {plan && (
            <span className="mt-1.5 inline-block rounded-full bg-[#c9a84c]/10 px-2 py-0.5 text-[10px] text-[#c9a84c]">
              {planLabels[plan] ?? plan}
            </span>
          )}
        </div>

        {/* Info-Banner */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#c9a84c]/15 bg-[#c9a84c]/5 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a84c]/70" />
          <p className="text-sm text-[#ede8df]/60">
            Leer lassen für Standard-Prompt basierend auf deinem Plan.
            Der Prompt definiert wie dein Sales Bot mit Leads kommuniziert.
          </p>
        </div>

        {/* Textarea */}
        {loading ? (
          <div className="flex h-[400px] items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0e0e1a]">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Standard-Prompt wird verwendet wenn leer…"
            className="mb-4 w-full rounded-2xl border border-white/[0.08] bg-[#0e0e1a] px-4 py-3 font-mono text-[13px] leading-relaxed text-[#ede8df] placeholder:text-slate-600 focus:border-[#c9a84c]/30 focus:outline-none"
            style={{ minHeight: "400px" }}
          />
        )}

        {/* Zeichenzaehler + Speichern */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-600">
            {prompt.length.toLocaleString()} / 20.000 Zeichen
          </span>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-5 py-2.5 text-sm font-medium text-black transition-opacity disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Speichern
          </button>
        </div>

        {/* Feedback */}
        {message && (
          <div
            className={`mt-4 rounded-xl px-4 py-2.5 text-sm ${
              message.type === "success"
                ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
