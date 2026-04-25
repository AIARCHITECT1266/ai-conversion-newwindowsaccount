"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, RefreshCw, ArrowLeft, Radio, Send, X, Check,
  Users, AlertTriangle, CheckCircle2, XCircle, Megaphone,
  Filter, ChevronDown,
} from "lucide-react";

/* ───────────────────────────── Typen ───────────────────────────── */

interface BroadcastItem {
  id: string; message: string; segment: string;
  totalSent: number; totalFailed: number; status: string;
  createdAt: string; sentAt: string | null;
  campaign: { name: string; slug: string } | null;
  _count: { recipients: number };
}

interface CampaignOption { id: string; name: string; slug: string }

/* ───────────────────────────── Hilfs ────────────────────────────── */

function formatDate(d: string) { return new Date(d).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }

function useTenantInfo() {
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/dashboard/me")
      .then(r => { if (!r.ok) { window.location.href = "/dashboard/login"; return null; } return r.json(); })
      .then(d => { if (d) setTenantName(d.tenantName); })
      .catch(() => { window.location.href = "/dashboard/login"; })
      .finally(() => setLoading(false));
  }, []);
  return { tenantName, loading };
}

/* ───────────────────────────── Neuer Broadcast Modal ──────────── */

function CreateBroadcastModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [message, setMessage] = useState("");
  const [minScore, setMinScore] = useState("");
  const [pipelineStatus, setPipelineStatus] = useState("");
  const [preview, setPreview] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/campaigns").then(r => r.json()).then(d => {
      if (d.campaigns) setCampaigns(d.campaigns.map((c: { id: string; name: string; slug: string }) => ({ id: c.id, name: c.name, slug: c.slug })));
    });
  }, []);

  async function loadPreview() {
    setPreviewLoading(true);
    try {
      const segment: Record<string, string> = {};
      if (minScore) segment.minScore = minScore;
      if (pipelineStatus) segment.pipelineStatus = pipelineStatus;
      const res = await fetch("/api/dashboard/broadcasts/preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaignId || undefined, segment }),
      });
      const data = await res.json();
      setPreview(data.count ?? 0);
    } finally { setPreviewLoading(false); }
  }

  async function handleSend() {
    setSending(true); setError(null);
    try {
      const segment: Record<string, string> = {};
      if (minScore) segment.minScore = minScore;
      if (pipelineStatus) segment.pipelineStatus = pipelineStatus;
      const res = await fetch("/api/dashboard/broadcasts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, campaignId: campaignId || undefined, segment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      onCreated(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Fehler"); setShowConfirm(false); }
    finally { setSending(false); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[rgba(201,168,76,0.15)]"
        style={{ background: "#0e0e1a" }}>

        <div className="shrink-0 border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white" style={{ fontFamily: "Georgia, serif" }}>
              <Radio className="h-5 w-5 text-[#c9a84c]" />Neuer Broadcast
            </h3>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!showConfirm ? (
            <>
              {/* Kampagne (optional) */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Kampagne (optional)</label>
                <select value={campaignId} onChange={e => setCampaignId(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white focus:outline-none">
                  <option value="">Alle Leads</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Segment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Min. Score</label>
                  <select value={minScore} onChange={e => setMinScore(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white focus:outline-none">
                    <option value="">Alle</option>
                    <option value="70">Score &gt; 70</option>
                    <option value="50">Score &gt; 50</option>
                    <option value="30">Score &gt; 30</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">Pipeline-Status</label>
                  <select value={pipelineStatus} onChange={e => setPipelineStatus(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white focus:outline-none">
                    <option value="">Alle</option>
                    <option value="NEU">Neu</option>
                    <option value="QUALIFIZIERT">Qualifiziert</option>
                    <option value="TERMIN">Termin</option>
                    <option value="ANGEBOT">Angebot</option>
                    <option value="GEWONNEN">Gewonnen</option>
                  </select>
                </div>
              </div>

              {/* Vorschau */}
              <button onClick={loadPreview} disabled={previewLoading}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                {previewLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Users className="h-3 w-3" />}
                Empfänger-Vorschau laden
              </button>
              {preview !== null && (
                <div className="rounded-lg border border-purple-500/15 bg-purple-500/[0.03] px-3 py-2 text-center">
                  <span className="text-2xl font-bold text-purple-400" style={{ fontFamily: "Georgia, serif" }}>{preview}</span>
                  <p className="text-[10px] text-slate-500">Empfänger im Segment</p>
                </div>
              )}

              {/* Nachricht */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">WhatsApp-Nachricht</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                  placeholder="Ihre Broadcast-Nachricht…"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none" />
                <p className="mt-1 text-[10px] text-slate-600">{message.length}/4096 Zeichen</p>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button onClick={() => { if (message.trim() && preview !== null && preview > 0) setShowConfirm(true); else setError("Nachricht eingeben und Vorschau laden"); }}
                disabled={!message.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-2.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40 transition-opacity">
                <Send className="h-4 w-4" /> Weiter zur Bestätigung
              </button>
            </>
          ) : (
            /* Bestätigungs-Dialog */
            <div className="space-y-4">
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-400 mb-2">Broadcast senden – Risiko-Hinweis</p>
                    <ul className="space-y-1.5 text-xs text-slate-400">
                      <li>• <strong>Meta-Regeln:</strong> Nachrichten außerhalb des 24h-Fensters erfordern genehmigte Templates</li>
                      <li>• <strong>Opt-in Pflicht:</strong> Nur Leads mit DSGVO-Consent dürfen kontaktiert werden</li>
                      <li>• <strong>Rate-Limits:</strong> Meta kann bei zu vielen Nachrichten den Account sperren</li>
                      <li>• <strong>Nicht rückgängig:</strong> Gesendete Nachrichten können nicht zurückgeholt werden</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-xs text-slate-500 mb-1">Nachricht an {preview} Empfänger:</p>
                <p className="text-sm text-slate-300">{message.slice(0, 200)}{message.length > 200 ? "…" : ""}</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-slate-400 hover:bg-white/[0.04] transition-colors">
                  Zurück
                </button>
                <button onClick={handleSend} disabled={sending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-all">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Jetzt senden ({preview})
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── Haupt-Seite ──────────────────────── */

export default function BroadcastsPage() {
  const { tenantName, loading: authLoading } = useTenantInfo();
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchBroadcasts = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/broadcasts");
      if (res.ok) { const d = await res.json(); setBroadcasts(d.broadcasts); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  const statusColors: Record<string, string> = {
    PENDING: "bg-[#c9a84c]/10 text-[#c9a84c]",
    SENDING: "bg-blue-500/10 text-blue-400",
    COMPLETED: "bg-emerald-500/10 text-emerald-400",
    FAILED: "bg-red-500/10 text-red-400",
  };
  const statusLabels: Record<string, string> = {
    PENDING: "Bereit", SENDING: "Sendet…", COMPLETED: "Gesendet", FAILED: "Fehlgeschlagen",
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center" style={{ background: "#07070d" }}><Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" /></div>;
  }

  return (
    <div className="relative">
      {/* Phase 2b.4a.2: Inline-Style-Token-Block, eigener <header>
          mit Back-Button und min-h-screen-Wrapper entfernt — kommt
          jetzt aus globals.css + /dashboard/layout.tsx. Page-Title
          + Action-Buttons bleiben als Page-spezifischer Heading. */}
      <div className="mx-auto max-w-5xl px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Radio className="h-5 w-5 text-[#c9a84c]" />
            <span style={{ fontFamily: "Georgia, serif", color: "#c9a84c" }}>Broadcasts</span>
            <span className="text-sm font-normal text-slate-500">• {tenantName}</span>
          </h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-3 py-1.5 text-sm font-medium text-black hover:opacity-90 transition-opacity">
              <Send className="h-4 w-4" /> Neuer Broadcast
            </button>
            <button onClick={() => { setLoading(true); fetchBroadcasts(); }}
              className="rounded-lg border border-white/[0.06] p-1.5 text-slate-500 hover:bg-white/[0.04] hover:text-[#c9a84c] transition-colors">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Radio className="h-12 w-12 text-slate-700 mb-4" />
            <p className="text-sm text-slate-500 mb-4">Noch keine Broadcasts gesendet</p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-2 text-sm font-medium text-black hover:opacity-90 transition-opacity">
              <Send className="h-4 w-4" /> Ersten Broadcast erstellen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b, i) => {
              const seg = (() => { try { return JSON.parse(b.segment); } catch { return {}; } })();
              return (
                <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[b.status] ?? "bg-slate-500/10 text-slate-400"}`}>
                          {statusLabels[b.status] ?? b.status}
                        </span>
                        {b.campaign && (
                          <span className="text-[10px] text-purple-400">{b.campaign.name}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 line-clamp-2">{b.message}</p>
                    </div>
                    <div className="shrink-0 text-right ml-4">
                      <p className="text-xs text-slate-500">{formatDate(b.sentAt ?? b.createdAt)}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Users className="h-3 w-3" /> {b._count.recipients} Empfänger
                    </span>
                    {b.totalSent > 0 && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> {b.totalSent} gesendet
                      </span>
                    )}
                    {b.totalFailed > 0 && (
                      <span className="flex items-center gap-1 text-red-400">
                        <XCircle className="h-3 w-3" /> {b.totalFailed} fehlgeschlagen
                      </span>
                    )}
                    {seg.minScore && <span className="text-slate-600">Score ≥{seg.minScore}</span>}
                    {seg.pipelineStatus && <span className="text-slate-600">{seg.pipelineStatus}</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && <CreateBroadcastModal onClose={() => setShowCreate(false)} onCreated={fetchBroadcasts} />}
      </AnimatePresence>
    </div>
  );
}
