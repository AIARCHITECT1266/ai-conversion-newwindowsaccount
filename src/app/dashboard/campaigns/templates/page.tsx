"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, ArrowLeft, ArrowRight, Building2, Hammer, GraduationCap,
  Briefcase, ShoppingCart, Sparkles, Target, MessageSquare,
  BarChart3, Plus, Check, X, Bookmark, Copy, ClipboardCheck,
  RefreshCw, Users,
} from "lucide-react";

/* ───────────────────────────── Typen ───────────────────────────── */

interface TemplateBriefing {
  ziel: string;
  zielgruppe: string;
  tonalitaet: string;
  ergebnis: string;
}

interface TemplateData {
  id: string;
  tenantId: string | null;
  branche: string;
  name: string;
  beschreibung: string | null;
  briefing: TemplateBriefing;
  openers: string[];
  abVarianten: { variantA: string; variantB: string } | null;
  ziele: string[];
  isSystem: boolean;
  createdAt: string;
}

/* ───────────────────────────── Konstanten ────────────────────────── */

// Branchen-Icons Mapping
const BRANCHE_CONFIG: Record<string, { icon: typeof Building2; color: string; border: string; bg: string }> = {
  Immobilien: { icon: Building2, color: "text-[#c9a84c]", border: "border-[rgba(201,168,76,0.2)]", bg: "bg-[rgba(201,168,76,0.04)]" },
  Handwerk: { icon: Hammer, color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/[0.04]" },
  Coaching: { icon: GraduationCap, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/[0.04]" },
  Agentur: { icon: Briefcase, color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/[0.04]" },
  "E-Commerce": { icon: ShoppingCart, color: "text-pink-400", border: "border-pink-500/20", bg: "bg-pink-500/[0.04]" },
};

const DEFAULT_CONFIG = { icon: Bookmark, color: "text-slate-400", border: "border-white/[0.08]", bg: "bg-white/[0.02]" };

/* ───────────────────────────── Hilfs-Funktionen ────────────────── */

function useTenantInfo() {
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/dashboard/me")
      .then((r) => { if (!r.ok) { window.location.href = "/dashboard/login"; return null; } return r.json(); })
      .then((d) => { if (d) setTenantName(d.tenantName); })
      .catch(() => { window.location.href = "/dashboard/login"; })
      .finally(() => setLoading(false));
  }, []);
  return { tenantName, loading };
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 rounded-md p-1 text-slate-600 hover:text-[#c9a84c] transition-colors" title="Kopieren">
      {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/* ───────────────────────────── Detail-Modal ──────────────────────── */

function TemplateDetailModal({
  template, onClose, onUseTemplate,
}: {
  template: TemplateData;
  onClose: () => void;
  onUseTemplate: (t: TemplateData) => void;
}) {
  const cfg = BRANCHE_CONFIG[template.branche] ?? DEFAULT_CONFIG;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[rgba(201,168,76,0.15)]"
        style={{ background: "#0e0e1a" }}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.bg}`}>
                <Icon className={`h-5 w-5 ${cfg.color}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "Georgia, serif" }}>{template.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-medium ${cfg.color}`}>{template.branche}</span>
                  {template.isSystem && <span className="rounded-full bg-[#c9a84c]/10 px-2 py-0.5 text-[9px] font-medium text-[#c9a84c]">System</span>}
                  {!template.isSystem && <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[9px] font-medium text-purple-400">Eigene</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Inhalt */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {template.beschreibung && (
            <p className="text-sm text-slate-400 leading-relaxed">{template.beschreibung}</p>
          )}

          {/* Briefing */}
          <div className="rounded-xl border border-[rgba(201,168,76,0.15)] bg-[rgba(201,168,76,0.02)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-[#c9a84c]" />
              <span className="text-sm font-semibold text-slate-200">Kampagnen-Briefing</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Ziel", value: template.briefing.ziel },
                { label: "Zielgruppe", value: template.briefing.zielgruppe },
                { label: "Tonalitaet", value: template.briefing.tonalitaet },
                { label: "Gewuenschtes Ergebnis", value: template.briefing.ergebnis },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <p className="text-[10px] text-slate-500 mb-0.5">{item.label}</p>
                  <p className="text-xs text-slate-300">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp-Opener A/B/C */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-200">WhatsApp-Opener (A/B/C)</span>
            </div>
            <div className="space-y-2.5">
              {template.openers.map((opener, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <p className="flex-1 text-sm text-slate-300 leading-relaxed">{opener}</p>
                  <CopyBtn text={opener} />
                </div>
              ))}
            </div>
          </div>

          {/* A/B Test Vorschlag */}
          {template.abVarianten && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-semibold text-slate-200">A/B Test Vorschlag</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[rgba(201,168,76,0.15)] bg-[rgba(201,168,76,0.02)] px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-[#c9a84c] mb-1">Variante A</p>
                  <p className="text-xs text-slate-300">{template.abVarianten.variantA}</p>
                </div>
                <div className="rounded-lg border border-purple-500/15 bg-purple-500/[0.02] px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-purple-400 mb-1">Variante B</p>
                  <p className="text-xs text-slate-300">{template.abVarianten.variantB}</p>
                </div>
              </div>
            </div>
          )}

          {/* Kampagnen-Ziele */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[#c9a84c]" />
              <span className="text-sm font-semibold text-slate-200">Kampagnen-Ziele</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {template.ziele.map((ziel, i) => (
                <span key={i} className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                  {ziel}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/[0.06] px-6 py-4">
          <button
            onClick={() => onUseTemplate(template)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-purple-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <ArrowRight className="h-4 w-4" />
            Kampagne aus Vorlage erstellen
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── Eigene Vorlage Modal ──────────────── */

function SaveTemplateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [branche, setBranche] = useState("Custom");
  const [beschreibung, setBeschreibung] = useState("");
  const [ziel, setZiel] = useState("");
  const [zielgruppe, setZielgruppe] = useState("");
  const [tonalitaet, setTonalitaet] = useState("");
  const [ergebnis, setErgebnis] = useState("");
  const [openerA, setOpenerA] = useState("");
  const [openerB, setOpenerB] = useState("");
  const [openerC, setOpenerC] = useState("");
  const [ziele, setZiele] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/dashboard/campaigns/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, branche, beschreibung: beschreibung || null,
          briefing: { ziel, zielgruppe, tonalitaet, ergebnis },
          openers: [openerA, openerB, openerC].filter(Boolean),
          abVarianten: openerA && openerB ? { variantA: openerA, variantB: openerB } : null,
          ziele: ziele.split(",").map((z) => z.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Fehler"); }
    finally { setSaving(false); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[rgba(201,168,76,0.15)]"
        style={{ background: "#0e0e1a" }}>
        <div className="shrink-0 border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "Georgia, serif" }}>Eigene Vorlage speichern</h3>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-white transition-colors"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {/* Name + Branche */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500">Vorlagenname *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Meine Top-Kampagne"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-500">Branche *</label>
              <select value={branche} onChange={(e) => setBranche(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none">
                <option value="Custom">Eigene Branche</option>
                <option value="Immobilien">Immobilien</option>
                <option value="Handwerk">Handwerk</option>
                <option value="Coaching">Coaching</option>
                <option value="Agentur">Agentur</option>
                <option value="E-Commerce">E-Commerce</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-slate-500">Beschreibung</label>
            <input value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="Kurze Beschreibung…"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none" />
          </div>
          {/* Briefing */}
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600 pt-2">Briefing</p>
          {[
            { label: "Ziel", value: ziel, set: setZiel, ph: "Was soll erreicht werden?" },
            { label: "Zielgruppe", value: zielgruppe, set: setZielgruppe, ph: "Wen ansprechen?" },
            { label: "Tonalitaet", value: tonalitaet, set: setTonalitaet, ph: "Wie kommunizieren?" },
            { label: "Ergebnis", value: ergebnis, set: setErgebnis, ph: "Was ist das Ziel-Ergebnis?" },
          ].map((f) => (
            <div key={f.label}>
              <label className="mb-1 block text-[10px] font-medium text-slate-500">{f.label}</label>
              <input value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.ph}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none" />
            </div>
          ))}
          {/* Opener */}
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600 pt-2">WhatsApp-Opener</p>
          {[
            { label: "Opener A", value: openerA, set: setOpenerA },
            { label: "Opener B", value: openerB, set: setOpenerB },
            { label: "Opener C (optional)", value: openerC, set: setOpenerC },
          ].map((f) => (
            <div key={f.label}>
              <label className="mb-1 block text-[10px] font-medium text-slate-500">{f.label}</label>
              <textarea value={f.value} onChange={(e) => f.set(e.target.value)} rows={2}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none" />
            </div>
          ))}
          {/* Ziele */}
          <div>
            <label className="mb-1 block text-[10px] font-medium text-slate-500">Kampagnen-Ziele (kommagetrennt)</label>
            <input value={ziele} onChange={(e) => setZiele(e.target.value)} placeholder="Terminbuchung, Lead-Qualifizierung, Angebot"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="shrink-0 border-t border-white/[0.06] px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.04] transition-colors">Abbrechen</button>
          <button onClick={handleSave} disabled={saving || !name.trim() || !branche.trim()}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Vorlage speichern
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── Haupt-Seite ──────────────────────── */

export default function CampaignTemplatesPage() {
  const { tenantName, loading: authLoading } = useTenantInfo();
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [filterBranche, setFilterBranche] = useState<string>("ALL");

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/campaigns/templates");
      if (res.ok) { const d = await res.json(); setTemplates(d.templates); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // Kampagne aus Vorlage erstellen → zur Kampagnen-Seite mit Daten
  function useTemplate(t: TemplateData) {
    // Daten in sessionStorage speichern fuer die Kampagnen-Seite
    sessionStorage.setItem("campaign_template", JSON.stringify({
      name: t.name,
      description: `Zielgruppe: ${t.briefing.zielgruppe}\nAngebot: ${t.briefing.ziel}\nTon: ${t.briefing.tonalitaet}\nErgebnis: ${t.briefing.ergebnis}`,
      openers: t.openers,
      abVarianten: t.abVarianten,
    }));
    window.location.href = "/dashboard/campaigns?from=template";
  }

  // Branchen fuer Filter
  const branchen = Array.from(new Set(templates.map((t) => t.branche)));
  const filtered = filterBranche === "ALL" ? templates : templates.filter((t) => t.branche === filterBranche);
  const systemTemplates = filtered.filter((t) => t.isSystem);
  const userTemplates = filtered.filter((t) => !t.isSystem);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center" style={{ background: "#07070d" }}><Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" /></div>;
  }

  return (
    <div className="relative min-h-screen text-white" style={{ background: "#07070d", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <style>{`:root{--bg:#07070d;--surface:#0e0e1a;--gold:#c9a84c;--gold-border:rgba(201,168,76,0.1);--purple:#8b5cf6;--serif:Georgia,serif}`}</style>

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[5%] h-[600px] w-[600px] rounded-full bg-[rgba(201,168,76,0.05)] blur-[160px]" />
        <div className="absolute -right-[5%] top-[30%] h-[400px] w-[400px] rounded-full bg-[rgba(139,92,246,0.04)] blur-[140px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-md" style={{ borderBottom: "1px solid var(--gold-border)", background: "rgba(7,7,13,0.8)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/dashboard/campaigns" className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs text-slate-400 hover:border-[rgba(201,168,76,0.2)] hover:text-[#c9a84c] transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Kampagnen
            </a>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-[#c9a84c]" />
              <span style={{ fontFamily: "Georgia, serif", color: "#c9a84c" }}>Vorlagen</span>
              <span className="text-sm font-normal text-slate-500">&bull; {tenantName}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSave(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-3 py-1.5 text-sm font-medium text-black hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" /> Eigene Vorlage
            </button>
            <button onClick={() => { setLoading(true); fetchTemplates(); }}
              className="rounded-lg border border-white/[0.06] p-1.5 text-slate-500 hover:bg-white/[0.04] hover:text-[#c9a84c] transition-colors">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-6">
        {/* Branchen-Filter */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button onClick={() => setFilterBranche("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${filterBranche === "ALL" ? "bg-[rgba(201,168,76,0.15)] text-[#c9a84c] border border-[rgba(201,168,76,0.3)]" : "text-slate-500 border border-transparent hover:text-slate-300"}`}>
            Alle ({templates.length})
          </button>
          {branchen.map((b) => {
            const cfg = BRANCHE_CONFIG[b] ?? DEFAULT_CONFIG;
            const Icon = cfg.icon;
            const count = templates.filter((t) => t.branche === b).length;
            return (
              <button key={b} onClick={() => setFilterBranche(filterBranche === b ? "ALL" : b)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${filterBranche === b ? `${cfg.bg} ${cfg.color} border ${cfg.border}` : "text-slate-500 border border-transparent hover:text-slate-300"}`}>
                <Icon className="h-3.5 w-3.5" /> {b} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" /></div>
        ) : (
          <div className="space-y-8">
            {/* System-Templates */}
            {systemTemplates.length > 0 && (
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-slate-600">Branchen-Vorlagen</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {systemTemplates.map((t, i) => {
                    const cfg = BRANCHE_CONFIG[t.branche] ?? DEFAULT_CONFIG;
                    const Icon = cfg.icon;
                    return (
                      <motion.button key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        onClick={() => setSelectedTemplate(t)}
                        className={`group rounded-2xl border ${cfg.border} ${cfg.bg} p-5 text-left transition-all hover:scale-[1.02]`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.bg}`}>
                            <Icon className={`h-5 w-5 ${cfg.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{t.name}</p>
                            <p className={`text-[10px] ${cfg.color}`}>{t.branche}</p>
                          </div>
                        </div>
                        {t.beschreibung && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{t.beschreibung}</p>}
                        <div className="flex items-center gap-3 text-[10px] text-slate-600">
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {t.openers.length} Opener</span>
                          <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {t.ziele.length} Ziele</span>
                          {t.abVarianten && <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> A/B Test</span>}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Eigene Templates */}
            {userTemplates.length > 0 && (
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-slate-600">Eigene Vorlagen</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {userTemplates.map((t, i) => {
                    const cfg = BRANCHE_CONFIG[t.branche] ?? DEFAULT_CONFIG;
                    const Icon = cfg.icon;
                    return (
                      <motion.button key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        onClick={() => setSelectedTemplate(t)}
                        className="group rounded-2xl border border-purple-500/15 bg-purple-500/[0.03] p-5 text-left transition-all hover:scale-[1.02]">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                            <Icon className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{t.name}</p>
                            <p className="text-[10px] text-purple-400">{t.branche} &bull; Eigene Vorlage</p>
                          </div>
                        </div>
                        {t.beschreibung && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{t.beschreibung}</p>}
                        <div className="flex items-center gap-3 text-[10px] text-slate-600">
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {t.openers.length} Opener</span>
                          <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {t.ziele.length} Ziele</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Sparkles className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">Keine Vorlagen in dieser Kategorie</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {selectedTemplate && (
          <TemplateDetailModal template={selectedTemplate} onClose={() => setSelectedTemplate(null)} onUseTemplate={useTemplate} />
        )}
        {showSave && (
          <SaveTemplateModal onClose={() => setShowSave(false)} onSaved={fetchTemplates} />
        )}
      </AnimatePresence>
    </div>
  );
}
