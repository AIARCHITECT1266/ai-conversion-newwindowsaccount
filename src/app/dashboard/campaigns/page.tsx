"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, RefreshCw, ArrowLeft, Megaphone, Plus, X, Check,
  Users, Target, CalendarClock, Euro, TrendingUp, BarChart3,
  Link2, Copy, CheckCircle2, Sparkles, MessageSquare, Mail,
  Share2, Send, ClipboardCheck,
} from "lucide-react";

/* ───────────────────────────── Typen ───────────────────────────── */

interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { leads: number };
}

interface CampaignStats {
  campaign: { id: string; name: string; slug: string; isActive: boolean; createdAt: string };
  metrics: {
    totalLeads: number;
    avgScore: number;
    qualifiedLeads: number;
    appointments: number;
    totalValue: number;
    pipeline: Record<string, number>;
  };
}

/* ───────────────────────────── Hilfs-Funktionen ────────────────── */

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatCurrency(v: number) {
  return v.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

/* ───────────────────────────── Auth Hook ────────────────────────── */

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

/* ───────────────────────────── Funnel-Visualisierung ─────────────── */

const FUNNEL_STEPS = [
  { key: "NEU", label: "Neu", color: "bg-slate-500" },
  { key: "QUALIFIZIERT", label: "Qualifiziert", color: "bg-blue-500" },
  { key: "TERMIN", label: "Termin", color: "bg-purple-500" },
  { key: "ANGEBOT", label: "Angebot", color: "bg-[#c9a84c]" },
  { key: "GEWONNEN", label: "Gewonnen", color: "bg-emerald-500" },
];

function FunnelChart({ pipeline, total }: { pipeline: Record<string, number>; total: number }) {
  if (total === 0) return <p className="py-4 text-center text-xs text-slate-600">Keine Leads</p>;

  return (
    <div className="space-y-2">
      {FUNNEL_STEPS.map((step, i) => {
        const count = pipeline[step.key] || 0;
        // Kumulativ: alle die diese Stufe erreicht oder überschritten haben
        const reached = FUNNEL_STEPS.slice(i).reduce((s, st) => s + (pipeline[st.key] || 0), 0);
        const pct = Math.round((reached / total) * 100);
        return (
          <div key={step.key} className="flex items-center gap-3">
            <span className="w-20 text-right text-[11px] text-slate-500">{step.label}</span>
            <div className="h-6 flex-1 rounded-full bg-white/[0.04] overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className={`h-full rounded-full ${step.color} opacity-80`}
              />
              <span className="absolute inset-y-0 right-2 flex items-center text-[11px] font-medium text-white/80">
                {reached} ({pct}%)
              </span>
            </div>
            <span className="w-8 text-right text-xs font-semibold text-slate-300">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── Kampagnen-Detail Modal ──────────── */

function CampaignDetail({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/dashboard/campaigns/${slug}/stats`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d); })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-[rgba(201,168,76,0.15)] overflow-hidden"
        style={{ background: "#0e0e1a" }}
      >
        {loading || !stats ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-white/[0.06] px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "Georgia, serif" }}>
                    {stats.campaign.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Slug: {stats.campaign.slug} • Seit {formatDate(stats.campaign.createdAt)}
                  </p>
                </div>
                <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3 px-6 py-4">
              {[
                { label: "Leads", value: stats.metrics.totalLeads.toString(), icon: Users, color: "text-purple-400" },
                { label: "Ø Score", value: stats.metrics.avgScore.toString(), icon: Target, color: "text-[#c9a84c]" },
                { label: "Qualifiziert", value: stats.metrics.qualifiedLeads.toString(), icon: TrendingUp, color: "text-blue-400" },
                { label: "Termine", value: stats.metrics.appointments.toString(), icon: CalendarClock, color: "text-emerald-400" },
              ].map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                    <Icon className={`mx-auto h-4 w-4 ${kpi.color} mb-1`} />
                    <p className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{kpi.value}</p>
                    <p className="text-[10px] text-slate-500">{kpi.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Pipeline-Wert */}
            {stats.metrics.totalValue > 0 && (
              <div className="mx-6 mb-4 rounded-lg border border-[rgba(201,168,76,0.15)] bg-[rgba(201,168,76,0.03)] p-3 text-center">
                <Euro className="mx-auto h-4 w-4 text-[#c9a84c] mb-1" />
                <p className="text-lg font-bold text-[#c9a84c]" style={{ fontFamily: "Georgia, serif" }}>
                  {formatCurrency(stats.metrics.totalValue)}
                </p>
                <p className="text-[10px] text-[#c9a84c]/60">Pipeline-Wert</p>
              </div>
            )}

            {/* Funnel */}
            <div className="px-6 pb-6">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-[#c9a84c]" />
                <span className="text-sm font-semibold text-slate-200">Pipeline-Funnel</span>
              </div>
              <FunnelChart pipeline={stats.metrics.pipeline} total={stats.metrics.totalLeads} />
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── Neue Kampagne Modal ──────────────── */

function CreateCampaignModal({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[rgba(201,168,76,0.15)] p-6"
        style={{ background: "#0e0e1a" }}
      >
        <h3 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: "Georgia, serif" }}>
          Neue Kampagne
        </h3>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Name</label>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Facebook Ads Q1"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none"
          />
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Beschreibung (optional)</label>
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            rows={3} placeholder="Kurze Beschreibung der Kampagne…"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none"
          />
        </div>

        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.04] transition-colors">
            Abbrechen
          </button>
          <button
            onClick={handleCreate} disabled={saving || name.trim().length < 2}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Erstellen
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── KI-Content Generator Modal ────────── */

interface ContentPack {
  whatsappOpeners: string[];
  adCopy: { platform: string; headline: string; primaryText: string; description: string; cta: string }[];
  email: { subject: string; body: string };
  socialPosts: string[];
  followUpSequence: string[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 rounded-md p-1 text-slate-600 hover:text-[#c9a84c] transition-colors"
      title="Kopieren"
    >
      {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function ContentCard({ icon: Icon, color, label, children }: { icon: typeof MessageSquare; color: string; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs font-semibold text-slate-300">{label}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function GenerateContentModal({ slug, campaignName, onClose }: { slug: string; campaignName: string; onClose: () => void }) {
  const [audience, setAudience] = useState("");
  const [offer, setOffer] = useState("");
  const [tone, setTone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<ContentPack | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/campaigns/${slug}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, offer, tone: tone || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setContent(data.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[rgba(201,168,76,0.15)]"
        style={{ background: "#0e0e1a" }}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white" style={{ fontFamily: "Georgia, serif" }}>
                <Sparkles className="h-5 w-5 text-[#c9a84c]" />
                KI-Content Generator
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">Kampagne: {campaignName}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Briefing-Eingabe */}
          {!content && !loading && (
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Zielgruppe *</label>
                <input
                  value={audience} onChange={(e) => setAudience(e.target.value)}
                  placeholder="z.B. KMU-Geschäftsführer im DACH-Raum, 30-55 Jahre"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Angebot *</label>
                <textarea
                  value={offer} onChange={(e) => setOffer(e.target.value)} rows={3}
                  placeholder="z.B. KI-WhatsApp-Bot für automatisierte Lead-Qualifizierung, 30% mehr Conversions, kostenlose Testphase"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Tonalität (optional)</label>
                <input
                  value={tone} onChange={(e) => setTone(e.target.value)}
                  placeholder="z.B. Professionell aber nahbar, Premium-Feeling"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={!audience.trim() || !offer.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a84c] to-purple-500 px-4 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Sparkles className="h-4 w-4" />
                Content-Paket generieren
              </button>
            </div>
          )}

          {/* Ladeanimation */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative mb-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#c9a84c]/20 to-purple-500/20 animate-pulse" />
                <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-[#c9a84c] animate-pulse" />
              </div>
              <p className="text-sm text-slate-300">Claude erstellt dein Content-Paket…</p>
              <p className="mt-1 text-xs text-slate-600">Dies kann 10-15 Sekunden dauern</p>
            </div>
          )}

          {/* Ergebnis */}
          {content && !loading && (
            <div className="p-6 space-y-5">
              {/* Zurück-Button */}
              <button
                onClick={() => setContent(null)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#c9a84c] transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Neues Briefing
              </button>

              {/* WhatsApp Eröffnungsnachrichten */}
              <ContentCard icon={MessageSquare} color="text-emerald-400" label="WhatsApp Eröffnungsnachrichten">
                <div className="space-y-2.5">
                  {content.whatsappOpeners.map((msg, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-white/[0.03] px-3 py-2.5">
                      <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400">{i + 1}</span>
                      <p className="flex-1 text-sm text-slate-300">{msg}</p>
                      <CopyButton text={msg} />
                    </div>
                  ))}
                </div>
              </ContentCard>

              {/* Ad Copy */}
              <ContentCard icon={Target} color="text-purple-400" label="Ad Copy (Meta & Google)">
                <div className="space-y-4">
                  {content.adCopy.map((ad, i) => (
                    <div key={i} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-purple-400">{ad.platform}</span>
                        <CopyButton text={`${ad.headline}\n${ad.primaryText}\n${ad.description}\n${ad.cta}`} />
                      </div>
                      <p className="text-sm font-semibold text-white mb-1">{ad.headline}</p>
                      <p className="text-xs text-slate-300 mb-1">{ad.primaryText}</p>
                      <p className="text-xs text-slate-500 mb-1">{ad.description}</p>
                      <span className="inline-block rounded-md bg-[#c9a84c]/10 px-2 py-0.5 text-[10px] font-medium text-[#c9a84c]">{ad.cta}</span>
                    </div>
                  ))}
                </div>
              </ContentCard>

              {/* E-Mail */}
              <ContentCard icon={Mail} color="text-[#c9a84c]" label="E-Mail">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">Betreff:</span>
                      <span className="text-sm font-semibold text-white">{content.email.subject}</span>
                    </div>
                    <CopyButton text={`Betreff: ${content.email.subject}\n\n${content.email.body}`} />
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-4 py-3">
                    <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">{content.email.body}</p>
                  </div>
                </div>
              </ContentCard>

              {/* Social Posts */}
              <ContentCard icon={Share2} color="text-blue-400" label="Social-Media Posts">
                <div className="space-y-2.5">
                  {content.socialPosts.map((post, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-white/[0.03] px-3 py-2.5">
                      <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-400">{i + 1}</span>
                      <p className="flex-1 text-sm text-slate-300">{post}</p>
                      <CopyButton text={post} />
                    </div>
                  ))}
                </div>
              </ContentCard>

              {/* Follow-Up Sequenz */}
              <ContentCard icon={Send} color="text-purple-400" label="WhatsApp Follow-Up Sequenz">
                <div className="space-y-2.5">
                  {content.followUpSequence.map((msg, i) => {
                    const dayLabels = ["Tag 1", "Tag 3", "Tag 7"];
                    return (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-white/[0.03] px-3 py-2.5">
                        <span className="shrink-0 rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-400">{dayLabels[i] ?? `#${i + 1}`}</span>
                        <p className="flex-1 text-sm text-slate-300">{msg}</p>
                        <CopyButton text={msg} />
                      </div>
                    );
                  })}
                </div>
              </ContentCard>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── Haupt-Seite ──────────────────────── */

export default function CampaignsPage() {
  const { tenantName, loading: authLoading } = useTenantInfo();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [generateCampaign, setGenerateCampaign] = useState<{ slug: string; name: string } | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/campaigns");
      if (res.ok) { const d = await res.json(); setCampaigns(d.campaigns); }
    } catch { /* ignorieren */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  function copyTrackingLink(slug: string) {
    const link = `wa.me/?text=campaign:${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#07070d" }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-white" style={{ background: "#07070d", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <style>{`
        :root {
          --bg: #07070d; --surface: #0e0e1a; --gold: #c9a84c;
          --gold-border: rgba(201,168,76,0.1); --gold-border-hover: rgba(201,168,76,0.35);
          --purple: #8b5cf6; --text: #ede8df; --text-muted: rgba(237,232,223,0.45); --serif: Georgia, serif;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[5%] h-[600px] w-[600px] rounded-full bg-[rgba(201,168,76,0.05)] blur-[160px]" />
        <div className="absolute -right-[5%] top-[30%] h-[400px] w-[400px] rounded-full bg-[rgba(139,92,246,0.04)] blur-[140px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-md" style={{ borderBottom: "1px solid var(--gold-border)", background: "rgba(7,7,13,0.8)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs text-slate-400 hover:border-[rgba(201,168,76,0.2)] hover:text-[#c9a84c] transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </a>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <Megaphone className="h-5 w-5 text-[#c9a84c]" />
              <span style={{ fontFamily: "Georgia, serif", color: "#c9a84c" }}>Kampagnen</span>
              <span className="text-sm font-normal text-slate-500">• {tenantName}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-3 py-1.5 text-sm font-medium text-black hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Neue Kampagne
            </button>
            <button
              onClick={() => { setLoading(true); fetchCampaigns(); }}
              className="rounded-lg border border-white/[0.06] p-1.5 text-slate-500 hover:bg-white/[0.04] hover:text-[#c9a84c] transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Megaphone className="h-12 w-12 text-slate-700 mb-4" />
            <p className="text-sm text-slate-500 mb-4">Noch keine Kampagnen erstellt</p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-2 text-sm font-medium text-black hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Erste Kampagne erstellen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 transition-colors hover:border-[rgba(201,168,76,0.2)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-200">{c.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        c.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"
                      }`}>
                        {c.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                    </div>
                    {c.description && (
                      <p className="mt-1 text-xs text-slate-500">{c.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-600">
                      <span>Seit {formatDate(c.createdAt)}</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {c._count.leads} Lead{c._count.leads !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Tracking-Link kopieren */}
                    <button
                      onClick={(e) => { e.stopPropagation(); copyTrackingLink(c.slug); }}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs text-slate-400 hover:text-[#c9a84c] hover:border-[rgba(201,168,76,0.2)] transition-colors"
                      title="Tracking-Link kopieren"
                    >
                      {copiedSlug === c.slug ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedSlug === c.slug ? "Kopiert" : "Link"}
                    </button>

                    {/* KI-Content */}
                    <button
                      onClick={() => setGenerateCampaign({ slug: c.slug, name: c.name })}
                      className="flex items-center gap-1.5 rounded-lg border border-[rgba(201,168,76,0.2)] bg-[rgba(201,168,76,0.05)] px-2.5 py-1.5 text-xs font-medium text-[#c9a84c] hover:bg-[rgba(201,168,76,0.1)] transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      KI-Content
                    </button>

                    {/* Details anzeigen */}
                    <button
                      onClick={() => setDetailSlug(c.slug)}
                      className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition-colors"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Stats
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateCampaignModal onClose={() => setShowCreate(false)} onCreated={fetchCampaigns} />
        )}
        {detailSlug && (
          <CampaignDetail slug={detailSlug} onClose={() => setDetailSlug(null)} />
        )}
        {generateCampaign && (
          <GenerateContentModal
            slug={generateCampaign.slug}
            campaignName={generateCampaign.name}
            onClose={() => setGenerateCampaign(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
