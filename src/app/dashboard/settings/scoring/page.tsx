"use client";

// ============================================================
// Dashboard-Settings: Scoring-Prompt + Qualification-Labels
//
// Zwei editierbare Bereiche:
// 1. Scoring-Prompt (Textarea, analog zu /dashboard/settings/prompt).
//    Leer lassen = Default-Prompt nutzen.
// 2. Qualification-Labels (5 Text-Inputs mit festen Enum-Keys).
//    "Auf Default zuruecksetzen"-Button loescht die Tenant-Overrides.
//
// Pattern-Referenz: src/app/dashboard/settings/prompt/page.tsx
// (Farben, Button-Gradients, Toast-Feedback 1:1 uebernommen).
// ADR: docs/decisions/adr-002-scoring-per-tenant.md
// ============================================================

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, Info, RotateCcw } from "lucide-react";
import Link from "next/link";

// ---------- Typen ----------

interface QualificationLabels {
  UNQUALIFIED: string;
  MARKETING_QUALIFIED: string;
  SALES_QUALIFIED: string;
  OPPORTUNITY: string;
  CUSTOMER: string;
}

interface ScoringState {
  scoringPrompt: string;
  defaultScoringPrompt: string;
  qualificationLabels: QualificationLabels;
  defaultQualificationLabels: QualificationLabels;
  hasCustomLabels: boolean;
}

const QUALIFICATION_KEYS: Array<keyof QualificationLabels> = [
  "UNQUALIFIED",
  "MARKETING_QUALIFIED",
  "SALES_QUALIFIED",
  "OPPORTUNITY",
  "CUSTOMER",
];

// ---------- Page ----------

export default function ScoringSettingsPage() {
  const [state, setState] = useState<ScoringState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/settings/scoring")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setState({
            scoringPrompt: data.scoringPrompt ?? "",
            defaultScoringPrompt: data.defaultScoringPrompt ?? "",
            qualificationLabels: data.qualificationLabels,
            defaultQualificationLabels: data.defaultQualificationLabels,
            hasCustomLabels: data.hasCustomLabels ?? false,
          });
        }
      })
      .catch(() => setMessage({ type: "error", text: "Fehler beim Laden" }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!state) return;
    setSaving(true);
    setMessage(null);

    const body = {
      // Leerer Prompt (oder reiner Whitespace) → null, damit Default greift
      scoringPrompt: state.scoringPrompt.trim().length === 0 ? null : state.scoringPrompt,
      // Wenn alle Labels mit den Defaults identisch sind → null (Default nutzen)
      qualificationLabels: allLabelsMatchDefault(
        state.qualificationLabels,
        state.defaultQualificationLabels
      )
        ? null
        : state.qualificationLabels,
    };

    try {
      const res = await fetch("/api/dashboard/settings/scoring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "Scoring-Einstellungen gespeichert" });
        setState((prev) =>
          prev ? { ...prev, hasCustomLabels: body.qualificationLabels !== null } : prev
        );
      } else {
        setMessage({
          type: "error",
          text: typeof data.error === "string" ? data.error : "Fehler beim Speichern",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Verbindungsfehler" });
    } finally {
      setSaving(false);
    }
  }

  function resetLabelsToDefault() {
    setState((prev) =>
      prev ? { ...prev, qualificationLabels: { ...prev.defaultQualificationLabels } } : prev
    );
  }

  function updateLabel(key: keyof QualificationLabels, value: string) {
    setState((prev) =>
      prev ? { ...prev, qualificationLabels: { ...prev.qualificationLabels, [key]: value } } : prev
    );
  }

  return (
    <div className="min-h-screen bg-[#07070d] text-[#ede8df]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-lg font-semibold">Scoring-Einstellungen</h1>
          <p className="mt-1 text-xs text-[#ede8df]/50">
            Passe den Bewertungs-Prompt und die Qualifikations-Labels an deine Nische an.
          </p>
        </div>

        {/* Info-Banner */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#c9a84c]/15 bg-[#c9a84c]/5 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a84c]/70" />
          <p className="text-sm text-[#ede8df]/60">
            Der Scoring-Prompt bewertet jedes Gespraech nach deinen Kriterien. Leer
            lassen = Default (DACH-B2B). Labels erscheinen im Dashboard neben dem Score.
          </p>
        </div>

        {loading || !state ? (
          <div className="flex h-[400px] items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0e0e1a]">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : (
          <>
            {/* Scoring-Prompt */}
            <section className="mb-8">
              <h2 className="mb-2 text-sm font-semibold">Scoring-Prompt</h2>
              <textarea
                value={state.scoringPrompt}
                onChange={(e) => setState({ ...state, scoringPrompt: e.target.value })}
                placeholder="Leer lassen = Default-Prompt (DACH-B2B) wird verwendet…"
                className="mb-2 w-full rounded-2xl border border-white/[0.08] bg-[#0e0e1a] px-4 py-3 font-mono text-[13px] leading-relaxed text-[#ede8df] placeholder:text-slate-600 focus:border-[#c9a84c]/30 focus:outline-none"
                style={{ minHeight: "400px" }}
              />
              <div className="flex items-center justify-between text-[10px] text-slate-600">
                <span>{state.scoringPrompt.length.toLocaleString()} / 30.000 Zeichen</span>
                {state.scoringPrompt.trim().length === 0 && (
                  <span className="text-[#c9a84c]/70">Default-Prompt aktiv</span>
                )}
              </div>
            </section>

            {/* Qualification-Labels */}
            <section className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Qualifikations-Labels</h2>
                <button
                  type="button"
                  onClick={resetLabelsToDefault}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] text-[#ede8df]/60 transition-colors hover:text-[#ede8df]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Auf Default zuruecksetzen
                </button>
              </div>
              <div className="space-y-2">
                {QUALIFICATION_KEYS.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0e0e1a] px-3 py-2"
                  >
                    <span className="w-44 shrink-0 font-mono text-[11px] text-slate-500">{key}</span>
                    <input
                      type="text"
                      value={state.qualificationLabels[key]}
                      onChange={(e) => updateLabel(key, e.target.value)}
                      maxLength={50}
                      className="flex-1 bg-transparent text-sm text-[#ede8df] placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Speichern */}
            <div className="flex items-center justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-5 py-2.5 text-sm font-medium text-black transition-opacity disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Speichern
              </button>
            </div>

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
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Helpers ----------

function allLabelsMatchDefault(
  current: QualificationLabels,
  defaults: QualificationLabels
): boolean {
  return QUALIFICATION_KEYS.every((k) => current[k].trim() === defaults[k].trim());
}
