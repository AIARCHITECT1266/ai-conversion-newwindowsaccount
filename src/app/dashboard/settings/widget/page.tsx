"use client";

// ============================================================
// Dashboard Settings - Web-Widget
//
// Single-Page-Client-Component mit:
// - Plan-Gating (Upgrade-Prompt fuer Starter)
// - Toggle Widget an/aus (mit Auto-Key-Generierung beim ersten Aktivieren)
// - Public-Key-Anzeige mit Copy-Button
// - Embed-Code-Generator (Primary-Snippet + kollapsierbare Plattform-Tabs)
// - Config-Editor (10 sichtbare Felder)
// - Live-Preview via iframe gegen die echte /embed/widget-Route
//
// Pattern-Referenz: src/app/dashboard/settings/prompt/page.tsx
// Farben, Icons, Button-Gradients, Toast-Feedback wurden
// 1:1 uebernommen, damit das Dashboard konsistent bleibt.
// ============================================================

import { useState, useEffect } from "react";
import {
  Save,
  Loader2,
  Info,
  Copy,
  Check,
  Power,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

// ---------- Typen ----------

interface WidgetConfig {
  backgroundColor: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  mutedTextColor: string;
  logoUrl: string | null;
  botName: string;
  botSubtitle: string;
  welcomeMessage: string;
  avatarInitials: string;
}

interface WidgetState {
  enabled: boolean;
  publicKey: string | null;
  config: WidgetConfig;
  plan: string;
  featureAvailable: boolean;
}

type PlatformTab = "html" | "wordpress" | "shopify" | "gtm";

// ---------- Konstanten ----------

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

const COLOR_FIELDS: Array<{ key: keyof WidgetConfig; label: string }> = [
  { key: "backgroundColor", label: "Hintergrund" },
  { key: "primaryColor", label: "Primärfarbe" },
  { key: "accentColor", label: "Akzent" },
  { key: "textColor", label: "Textfarbe" },
  { key: "mutedTextColor", label: "Text gedämpft" },
];

// ---------- Haupt-Komponente ----------

export default function WidgetSettingsPage() {
  const [state, setState] = useState<WidgetState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [forbiddenPlan, setForbiddenPlan] = useState<string>("STARTER");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [showPlatformGuide, setShowPlatformGuide] = useState(false);
  const [platformTab, setPlatformTab] = useState<PlatformTab>("html");
  const [baseUrl, setBaseUrl] = useState<string>("");

  // Base-URL erst client-seitig setzen, damit der Embed-Snippet die
  // echte Origin zeigt (im Pilot-Alltag: https://ai-conversion.ai,
  // lokal: http://localhost:3000).
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  // ---------- Daten laden ----------

  useEffect(() => {
    fetch("/api/dashboard/widget-config")
      .then(async (r) => {
        if (r.status === 403) {
          const body = await r.json().catch(() => ({}));
          setForbidden(true);
          setForbiddenPlan(body?.plan ?? "STARTER");
          return null;
        }
        if (!r.ok) {
          setMessage({ type: "error", text: "Laden fehlgeschlagen" });
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setState({
            enabled: data.enabled,
            publicKey: data.publicKey,
            config: data.config,
            plan: data.plan,
            featureAvailable: data.featureAvailable,
          });
        }
      })
      .catch(() => setMessage({ type: "error", text: "Verbindungsfehler" }))
      .finally(() => setLoading(false));
  }, []);

  // ---------- Handlers ----------

  async function handleToggle(newEnabled: boolean) {
    if (!state) return;
    setToggling(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/widget-config/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        setState({
          ...state,
          enabled: body.enabled,
          publicKey: body.publicKey,
        });
        setPreviewNonce((n) => n + 1);
        setMessage({
          type: "success",
          text: newEnabled
            ? body.keyGenerated
              ? "Widget aktiviert und Public-Key erzeugt"
              : "Widget aktiviert"
            : "Widget deaktiviert",
        });
      } else {
        setMessage({ type: "error", text: body.error ?? "Toggle fehlgeschlagen" });
      }
    } catch {
      setMessage({ type: "error", text: "Verbindungsfehler" });
    } finally {
      setToggling(false);
    }
  }

  async function handleSave() {
    if (!state) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/widget-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.config),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        // Config nach erfolgreichem Save: Server-Antwort ist die
        // aufgefuellte Config, die wir direkt uebernehmen.
        setState({ ...state, config: body.config });
        setPreviewNonce((n) => n + 1);
        setMessage({ type: "success", text: "Konfiguration gespeichert" });
      } else {
        setMessage({ type: "error", text: body.error ?? "Speichern fehlgeschlagen" });
      }
    } catch {
      setMessage({ type: "error", text: "Verbindungsfehler" });
    } finally {
      setSaving(false);
    }
  }

  function handleConfigChange<K extends keyof WidgetConfig>(
    key: K,
    value: WidgetConfig[K],
  ) {
    if (!state) return;
    setState({ ...state, config: { ...state.config, [key]: value } });
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({ type: "error", text: "Zwischenablage nicht verfuegbar" });
    }
  }

  // ---------- Render: Gate-States ----------

  if (loading) {
    return (
      <PageFrame>
        <div className="flex h-[400px] items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0e0e1a]">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </div>
      </PageFrame>
    );
  }

  if (forbidden) {
    return (
      <PageFrame>
        <UpgradePrompt currentPlan={forbiddenPlan} />
      </PageFrame>
    );
  }

  if (!state) {
    return (
      <PageFrame>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Fehler beim Laden der Widget-Einstellungen
        </div>
      </PageFrame>
    );
  }

  // ---------- Render: Haupt-Layout ----------

  const embedSnippet =
    state.publicKey && baseUrl
      ? `<script src="${baseUrl}/widget.js" data-key="${state.publicKey}" async></script>`
      : "";

  return (
    <PageFrame plan={state.plan}>
      {/* Toggle-Card */}
      <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Power className="h-4 w-4 text-[#c9a84c]" />
              Widget aktivieren
            </h2>
            <p className="mt-1.5 text-xs text-[#ede8df]/50">
              {state.enabled
                ? "Das Widget ist live. Besucher sehen die Chat-Bubble auf jeder Seite mit eingebettetem Script."
                : "Das Widget ist noch nicht aktiv. Aktivieren erzeugt automatisch einen Public-Key."}
            </p>
          </div>
          <button
            onClick={() => handleToggle(!state.enabled)}
            disabled={toggling}
            role="switch"
            aria-checked={state.enabled}
            aria-label="Widget aktivieren"
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              state.enabled
                ? "bg-gradient-to-r from-[#c9a84c] to-[#d4b85c]"
                : "bg-white/[0.08]"
            } disabled:opacity-40`}
          >
            <span
              className={`absolute left-0 top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                state.enabled ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {state.enabled && state.publicKey && (
        <>
          {/* Public-Key + Embed-Code */}
          <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-5">
            <h2 className="mb-3 text-sm font-semibold">Einbettungs-Code</h2>
            <p className="mb-3 text-xs text-[#ede8df]/50">
              Kopiere dieses Snippet und füge es vor dem{" "}
              <code className="rounded bg-white/[0.08] px-1 py-0.5 text-[#c9a84c]">
                &lt;/body&gt;
              </code>{" "}
              -Tag deiner Webseite ein.
            </p>
            <div className="relative mb-3 overflow-hidden rounded-xl border border-white/[0.08] bg-[#07070d]">
              <pre className="scrollbar-hide overflow-x-auto p-4 sm:pr-20 font-mono text-[11px] leading-relaxed text-[#ede8df]">
                {embedSnippet}
              </pre>
              <button
                onClick={() => handleCopy(embedSnippet)}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/[0.08] px-2.5 py-1.5 text-[10px] font-medium text-[#ede8df] transition-colors hover:bg-white/[0.12] sm:absolute sm:right-2 sm:top-2 sm:mt-0 sm:w-auto sm:justify-start"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" /> Kopiert
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Kopieren
                  </>
                )}
              </button>
            </div>

            {/* Plattform-Anleitungs-Tabs (kollapsierbar) */}
            <button
              onClick={() => setShowPlatformGuide((v) => !v)}
              className="flex w-full items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-left text-xs text-[#ede8df]/70 transition-colors hover:bg-white/[0.06]"
            >
              {showPlatformGuide ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Anleitung für deine Plattform
            </button>

            {showPlatformGuide && (
              <div className="mt-3 rounded-xl border border-white/[0.06] bg-[#07070d] p-4">
                <div className="mb-3 flex gap-1 border-b border-white/[0.06]">
                  {(
                    [
                      { id: "html", label: "HTML" },
                      { id: "wordpress", label: "WordPress" },
                      { id: "shopify", label: "Shopify" },
                      { id: "gtm", label: "Google Tag Manager" },
                    ] as Array<{ id: PlatformTab; label: string }>
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPlatformTab(tab.id)}
                      className={`border-b-2 px-3 py-2 text-[11px] font-medium transition-colors ${
                        platformTab === tab.id
                          ? "border-[#c9a84c] text-[#c9a84c]"
                          : "border-transparent text-[#ede8df]/50 hover:text-[#ede8df]/80"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="text-xs leading-relaxed text-[#ede8df]/70">
                  <PlatformInstructions tab={platformTab} />
                </div>
              </div>
            )}
          </div>

          {/* Config-Editor */}
          <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-5">
            <h2 className="mb-3 text-sm font-semibold">Erscheinungsbild</h2>
            <p className="mb-4 text-xs text-[#ede8df]/50">
              Änderungen werden erst nach „Speichern" live. Die Vorschau rechts zeigt
              den zuletzt gespeicherten Stand.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {COLOR_FIELDS.map((f) => (
                <ColorField
                  key={f.key}
                  label={f.label}
                  value={state.config[f.key] as string}
                  onChange={(v) => handleConfigChange(f.key, v as never)}
                />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextField
                label="Bot-Name"
                value={state.config.botName}
                onChange={(v) => handleConfigChange("botName", v)}
                maxLength={50}
              />
              <TextField
                label="Bot-Subtitle"
                value={state.config.botSubtitle}
                onChange={(v) => handleConfigChange("botSubtitle", v)}
                maxLength={100}
              />
              <TextField
                label="Avatar-Initialen (1-3 Zeichen)"
                value={state.config.avatarInitials}
                onChange={(v) => handleConfigChange("avatarInitials", v)}
                maxLength={3}
              />
              <TextField
                label="Logo-URL (https://...)"
                value={state.config.logoUrl ?? ""}
                onChange={(v) =>
                  handleConfigChange("logoUrl", v.length > 0 ? v : null)
                }
              />
            </div>

            <div className="mt-4">
              <TextField
                label="Willkommens-Nachricht"
                value={state.config.welcomeMessage}
                onChange={(v) => handleConfigChange("welcomeMessage", v)}
                maxLength={500}
                multiline
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-5 py-2.5 text-sm font-medium text-black transition-opacity disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Speichern
              </button>
            </div>
          </div>

          {/* Live-Preview */}
          <div className="mb-6 rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-5">
            <h2 className="mb-3 text-sm font-semibold">Vorschau</h2>
            <p className="mb-4 text-xs text-[#ede8df]/50">
              So sieht dein Widget im Live-Betrieb aus. Reagiert auf jeden
              gespeicherten Config-Stand.
            </p>
            <div className="flex justify-center">
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
                {baseUrl && (
                  <iframe
                    key={previewNonce}
                    src={`${baseUrl}/embed/widget?key=${state.publicKey}`}
                    width={400}
                    height={620}
                    className="block bg-[#07070d]"
                    title="Widget-Vorschau"
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Feedback-Banner */}
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
    </PageFrame>
  );
}

// ---------- Sub-Komponenten ----------

function PageFrame({
  children,
  plan,
}: {
  children: React.ReactNode;
  plan?: string;
}) {
  return (
    <div>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Phase 2b.4a.6: Redundanter min-h-screen-Wrapper und
            Back-Button entfernt. */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold">Web-Widget</h1>
          <p className="mt-1 text-xs text-[#ede8df]/50">
            Einbettbarer Chat fuer deine Webseite. Aktivieren, gestalten,
            Snippet kopieren.
          </p>
          {plan && (
            <span className="mt-2 inline-block rounded-full bg-[#c9a84c]/10 px-2 py-0.5 text-[10px] text-[#c9a84c]">
              {PLAN_LABELS[plan] ?? plan}
            </span>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}

function UpgradePrompt({ currentPlan }: { currentPlan: string }) {
  return (
    <div className="rounded-2xl border border-[#c9a84c]/20 bg-[#c9a84c]/[0.04] p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#c9a84c]/10">
        <Info className="h-6 w-6 text-[#c9a84c]" />
      </div>
      <h2 className="mb-2 text-base font-semibold">
        Web-Widget ist ab Growth verfügbar
      </h2>
      <p className="mb-6 text-sm text-[#ede8df]/60">
        Du bist aktuell auf{" "}
        <span className="text-[#c9a84c]">
          {PLAN_LABELS[currentPlan] ?? currentPlan}
        </span>
        . Upgrade auf Growth oder höher, um das Web-Widget auf deiner Seite
        einzubetten und Besucher direkt zu qualifizieren.
      </p>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-5 py-2.5 text-sm font-medium text-black"
      >
        Plan upgraden
      </Link>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] text-[#ede8df]/60">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#07070d] px-3 py-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} Farbwahl`}
          className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} Hex-Wert`}
          className="w-full bg-transparent font-mono text-[12px] text-[#ede8df] outline-none"
          placeholder="#000000"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  maxLength,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] text-[#ede8df]/60">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          rows={3}
          className="w-full rounded-xl border border-white/[0.08] bg-[#07070d] px-3 py-2 text-[12px] text-[#ede8df] outline-none placeholder:text-slate-600 focus:border-[#c9a84c]/30"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          className="w-full rounded-xl border border-white/[0.08] bg-[#07070d] px-3 py-2 text-[12px] text-[#ede8df] outline-none placeholder:text-slate-600 focus:border-[#c9a84c]/30"
        />
      )}
    </div>
  );
}

function PlatformInstructions({ tab }: { tab: PlatformTab }) {
  switch (tab) {
    case "html":
      return (
        <p>
          Füge den obigen Snippet direkt vor dem schließenden{" "}
          <code className="rounded bg-white/[0.08] px-1 py-0.5 text-[#c9a84c]">
            &lt;/body&gt;
          </code>
          -Tag deiner HTML-Seite ein. Das Widget lädt asynchron, blockiert also
          nicht das Rendering deiner Seite.
        </p>
      );
    case "wordpress":
      return (
        <>
          <p className="mb-2">
            Der einfachste Weg ist das Plugin <strong>Header Footer Code Manager</strong>{" "}
            (kostenlos im offiziellen Plugin-Verzeichnis).
          </p>
          <ol className="ml-4 list-decimal space-y-1">
            <li>Plugin installieren und aktivieren</li>
            <li>WP-Admin → HFCM → Add New Snippet</li>
            <li>Location: <em>Footer</em></li>
            <li>Snippet einfügen und speichern</li>
          </ol>
        </>
      );
    case "shopify":
      return (
        <>
          <p className="mb-2">Direkt im Theme-Editor, kein zusätzliches App nötig:</p>
          <ol className="ml-4 list-decimal space-y-1">
            <li>Shopify Admin → Online-Store → Themes</li>
            <li>Aktuelles Theme → Aktionen → Code bearbeiten</li>
            <li>
              <code className="rounded bg-white/[0.08] px-1 py-0.5 text-[#c9a84c]">
                theme.liquid
              </code>{" "}
              öffnen
            </li>
            <li>
              Snippet direkt vor{" "}
              <code className="rounded bg-white/[0.08] px-1 py-0.5 text-[#c9a84c]">
                &lt;/body&gt;
              </code>{" "}
              einfügen und speichern
            </li>
          </ol>
        </>
      );
    case "gtm":
      return (
        <>
          <p className="mb-2">Wenn du Google Tag Manager bereits nutzt:</p>
          <ol className="ml-4 list-decimal space-y-1">
            <li>GTM → Tags → Neu</li>
            <li>Tag-Typ: <em>Benutzerdefiniertes HTML</em></li>
            <li>Snippet in das HTML-Feld einfügen</li>
            <li>Trigger: <em>Alle Seiten</em> (All Pages)</li>
            <li>Speichern und Version publizieren</li>
          </ol>
        </>
      );
  }
}
