"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  MessageSquare,
  Users,
  TrendingUp,
  Send,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Calendar,
  BarChart3,
  Activity,
  HelpCircle,
  Loader2,
  ChevronDown,
  Phone,
  RefreshCw,
  Kanban,
  Settings,
  Link2,
  Unlink,
  Megaphone,
} from "lucide-react";

/* ───────────────────────────── Typen ───────────────────────────── */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface DashboardStats {
  kpis: {
    conversationsToday: number;
    activeConversations: number;
    newLeadsToday: number;
    conversionRate: number;
  };
  conversations: {
    id: string;
    externalId: string;
    status: "ACTIVE" | "PAUSED" | "CLOSED" | "ARCHIVED";
    updatedAt: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
  }[];
  pipeline: {
    qualification: string;
    label: string;
    count: number;
  }[];
  botActivity: {
    messagesLast24h: number;
    appointments: number;
  };
}

/* ───────────────────────────── Hilfs-Funktionen ────────────────── */

// Relative Zeitanzeige
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days > 1 ? "en" : ""}`;
}

// Externe ID maskieren (DSGVO)
function maskId(externalId: string): string {
  if (externalId.length <= 6) return "•••••";
  return externalId.slice(0, 3) + " •••• " + externalId.slice(-2);
}

/* ───────────────────────────── Hilfs-Komponenten ────────────────── */

const statusColors: Record<string, string> = {
  ACTIVE: "bg-purple-500/20 text-purple-400",
  PAUSED: "bg-[rgba(201,168,76,0.2)] text-[#c9a84c]",
  CLOSED: "bg-slate-500/20 text-slate-400",
  ARCHIVED: "bg-slate-500/20 text-slate-400",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  CLOSED: "Beendet",
  ARCHIVED: "Archiviert",
};

const pipelineColors: Record<string, string> = {
  UNQUALIFIED: "bg-slate-500",
  MARKETING_QUALIFIED: "bg-blue-500",
  SALES_QUALIFIED: "bg-purple-500",
  OPPORTUNITY: "bg-emerald-500",
  CUSTOMER: "bg-amber-500",
};

const qualColors: Record<string, string> = {
  UNQUALIFIED: "text-slate-400",
  MARKETING_QUALIFIED: "text-blue-400",
  SALES_QUALIFIED: "text-purple-400",
  OPPORTUNITY: "text-emerald-400",
  CUSTOMER: "text-amber-400",
};

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-[#c9a84c]" : "bg-red-500/70";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-slate-400">{score}</span>
    </div>
  );
}

/* ───────────────────────────── HubSpot-Einstellungen ──────────────── */

function HubSpotSettings() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setConnected(data.hubspotConnected); })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hubspotApiKey: apiKey || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error ?? "Fehler beim Speichern" });
      } else {
        setConnected(!!apiKey);
        setApiKey("");
        setMessage({ type: "success", text: apiKey ? "HubSpot verbunden" : "HubSpot getrennt" });
      }
    } catch {
      setMessage({ type: "error", text: "Verbindungsfehler" });
    } finally {
      setSaving(false);
    }
  }

  const spring = { type: "spring" as const, stiffness: 80, damping: 20 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.65 }}
      className="mt-5 rounded-2xl p-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--gold-border)' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Settings className="h-4 w-4 text-[#c9a84c]/60" />
          <h2 className="text-sm font-semibold">HubSpot-Integration</h2>
        </div>
        {connected !== null && (
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
            connected ? "bg-emerald-500/10" : "bg-slate-500/10"
          }`}>
            {connected ? <Link2 className="h-3 w-3 text-emerald-400" /> : <Unlink className="h-3 w-3 text-slate-400" />}
            <span className={`text-[11px] font-medium ${connected ? "text-emerald-400" : "text-slate-400"}`}>
              {connected ? "Verbunden" : "Nicht verbunden"}
            </span>
          </div>
        )}
      </div>

      <p className="mb-4 text-xs text-slate-500">
        Leads mit Score &gt;70 werden automatisch als Kontakte in HubSpot angelegt.
      </p>

      <div className="flex gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={connected ? "Neuen API-Key eingeben oder leer lassen zum Trennen" : "HubSpot Private App Token (pat-...)"}
          className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {apiKey ? "Speichern" : "Trennen"}
        </button>
      </div>

      {message && (
        <p className={`mt-2 text-xs ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}
    </motion.div>
  );
}

/* ───────────────────────────── Haupt-Dashboard ──────────────────── */

// Tenant-Info aus dem authentifizierten Cookie laden
function useTenantInfo(): { tenantId: string | null; tenantName: string | null; loading: boolean } {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/dashboard/me")
      .then((r) => {
        if (!r.ok) {
          // Nicht authentifiziert – zur Login-Seite weiterleiten
          window.location.href = "/dashboard/login";
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setTenantId(data.tenantId);
          setTenantName(data.tenantName);
        }
      })
      .catch(() => {
        window.location.href = "/dashboard/login";
      })
      .finally(() => setLoading(false));
  }, []);
  return { tenantId, tenantName, loading };
}

export default function TenantDashboard() {
  const { tenantId, tenantName, loading: authLoading } = useTenantInfo();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hallo! 👋 Ich bin der AI Conversion Plattform-Assistent. Wie kann ich dir helfen? Du kannst mich alles zur Plattform fragen — Funktionen, Einrichtung, Lead-Pipeline, DSGVO und mehr.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchStats = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Fehler beim Laden der Daten");
      const data: DashboardStats = await res.json();
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Daten laden und alle 30s aktualisieren (pausiert wenn Tab nicht sichtbar)
  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchStats();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Chat: Automatisch zum Ende scrollen
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function sendMessage() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/platform-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: chatMessages,
        }),
      });

      const data = await res.json();

      if (data.reply) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Entschuldigung, da ist etwas schiefgelaufen. Bitte versuche es erneut." },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Verbindungsfehler. Bitte prüfe deine Internetverbindung." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const spring = { type: "spring" as const, stiffness: 80, damping: 20 };

  // KPI-Daten aufbereiten
  const kpis = stats
    ? [
        {
          label: "Nachrichten heute",
          value: stats.botActivity.messagesLast24h.toLocaleString("de-DE"),
          icon: MessageSquare,
          color: "purple",
        },
        {
          label: "Aktive Gespräche",
          value: stats.kpis.activeConversations.toString(),
          icon: Users,
          color: "emerald",
        },
        {
          label: "Neue Leads",
          value: stats.kpis.newLeadsToday.toString(),
          icon: TrendingUp,
          color: "blue",
        },
        {
          label: "Konversionsrate",
          value: `${stats.kpis.conversionRate}%`,
          icon: Zap,
          color: "amber",
        },
      ]
    : [];

  const totalLeads = stats
    ? stats.pipeline.reduce((s, p) => s + p.count, 0)
    : 0;

  // Auth lädt noch
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white" style={{ background: '#07070d' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen text-white"
      style={{ background: 'var(--bg)', fontFamily: 'var(--sans)' }}
    >
      {/* Design-Token CSS-Variablen (Fonts via next/font im Layout) */}
      <style>{`
        :root {
          --bg: #07070d;
          --surface: #0e0e1a;
          --gold: #c9a84c;
          --gold-border: rgba(201,168,76,0.1);
          --gold-border-hover: rgba(201,168,76,0.35);
          --purple: #8b5cf6;
          --text: #ede8df;
          --text-muted: rgba(237,232,223,0.45);
          --serif: Georgia, serif;
          --sans: var(--font-inter), system-ui, sans-serif;
        }
      `}</style>

      {/* Hintergrund-Glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[5%] h-[600px] w-[600px] rounded-full bg-[rgba(201,168,76,0.05)] blur-[160px]" />
      </div>

      {/* ═══ Header ═══ */}
      <header className="relative z-10" style={{ borderBottom: '1px solid var(--gold-border)', background: 'rgba(7,7,13,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="mx-auto max-w-7xl px-6">
          {/* Obere Zeile: Brand + Status + Aktionen */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <h1 className="flex items-baseline gap-2">
                <span style={{ fontFamily: 'var(--serif)', color: 'var(--gold)', fontSize: '1.2rem', fontWeight: 700 }}>AI Conversion.</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{tenantName ?? "Dashboard"}</span>
              </h1>
              {/* Bot-Status — subtiler Indikator */}
              <div className="flex items-center gap-1.5 pl-4 border-l border-white/[0.06]">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-[11px] text-emerald-400/70">Bot aktiv</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchStats} title="Aktualisieren"
                className="rounded-lg p-2 text-slate-600 hover:text-[#c9a84c] hover:bg-white/[0.03] transition-colors">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={() => setChatOpen(!chatOpen)} title="Plattform-Hilfe"
                className="rounded-lg p-2 text-slate-600 hover:text-purple-400 hover:bg-purple-500/5 transition-colors">
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Navigation — saubere, einheitliche Links */}
          <nav className="flex items-center gap-1 -mb-px">
            {[
              { href: "/dashboard", label: "Uebersicht", icon: Activity, active: true },
              { href: "/dashboard/crm", label: "CRM", icon: Kanban },
              { href: "/dashboard/campaigns", label: "Kampagnen", icon: Megaphone },
              { href: "/dashboard/broadcasts", label: "Broadcasts", icon: Send },
              { href: "/dashboard/clients", label: "Clients", icon: Users },
              { href: "/dashboard/assets", label: "Asset Studio", icon: Zap },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <a key={item.href} href={item.href}
                  className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 ${
                    item.active
                      ? "border-[#c9a84c] text-[#c9a84c]"
                      : "border-transparent text-slate-500 hover:text-[#ede8df]/80 hover:border-white/10"
                  }`}>
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Dashboard-Inhalt */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        {/* Fehlermeldung */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Lade-Skeleton oder echte Daten */}
        {loading && !stats ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
          </div>
        ) : stats ? (
          <>
            {/* KPI-Karten */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((kpi, i) => {
                const Icon = kpi.icon;
                const iconColors: Record<string, string> = {
                  purple: "text-purple-400/70",
                  emerald: "text-emerald-400/70",
                  blue: "text-blue-400/70",
                  amber: "text-[#c9a84c]/70",
                };
                return (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: i * 0.06 }}
                    className="group rounded-2xl p-6 transition-colors hover:border-[rgba(201,168,76,0.18)]"
                    style={{ background: 'var(--surface)', border: '1px solid var(--gold-border)' }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <Icon className={`h-5 w-5 ${iconColors[kpi.color]}`} />
                    </div>
                    <p className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--serif)', color: 'var(--text)' }}>{kpi.value}</p>
                    <p className="mt-1.5 text-xs tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Mittlerer Bereich: Conversations + Lead-Pipeline */}
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {/* Letzte Gespräche */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.35 }}
                className="rounded-2xl p-6 lg:col-span-2"
                style={{ background: 'var(--surface)', border: '1px solid var(--gold-border)' }}
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-[#c9a84c]/60" />
                    <h2 className="text-sm font-semibold tracking-wide">Letzte Gespraeche</h2>
                  </div>
                  <span className="text-[11px] text-slate-600 uppercase tracking-wider">Live</span>
                </div>
                <div className="space-y-3">
                  {stats.conversations.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-600">
                      Noch keine Gespräche vorhanden
                    </p>
                  ) : (
                    stats.conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="flex items-center gap-4 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition-colors hover:border-[rgba(201,168,76,0.15)] hover:bg-white/[0.03]"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                          <MessageSquare className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{maskId(conv.externalId)}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[conv.status]}`}>
                              {statusLabels[conv.status]}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {conv.lastMessage ?? "Keine Nachricht"}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-slate-600">
                          {conv.lastMessageAt ? timeAgo(conv.lastMessageAt) : timeAgo(conv.updatedAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>

              {/* Lead-Pipeline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.45 }}
                className="rounded-2xl p-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--gold-border)' }}
              >
                <div className="mb-6 flex items-center gap-2.5">
                  <BarChart3 className="h-4 w-4 text-[#c9a84c]/60" />
                  <h2 className="text-sm font-semibold tracking-wide">Lead-Pipeline</h2>
                </div>

                {/* Gestapelter Balken */}
                <div className="mb-6 flex h-3 overflow-hidden rounded-full bg-white/[0.04]">
                  {totalLeads > 0 &&
                    stats.pipeline.map((stage) => (
                      <div
                        key={stage.qualification}
                        className={`${pipelineColors[stage.qualification] ?? "bg-slate-500"} transition-all`}
                        style={{ width: `${(stage.count / totalLeads) * 100}%` }}
                      />
                    ))}
                </div>

                {/* Stufen-Details */}
                <div className="space-y-3">
                  {stats.pipeline.map((stage) => (
                    <div key={stage.qualification} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${pipelineColors[stage.qualification] ?? "bg-slate-500"}`} />
                        <span className="text-xs text-slate-400">{stage.label}</span>
                      </div>
                      <span className="text-sm font-semibold">{stage.count}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-white/[0.06] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Gesamt</span>
                    <span className="text-lg font-bold">{totalLeads}</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Bot-Aktivität */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.55 }}
              className="mt-5 rounded-2xl p-6"
              style={{ background: 'var(--surface)', border: '1px solid var(--gold-border)' }}
            >
              <div className="mb-6 flex items-center gap-2.5">
                <Bot className="h-4 w-4 text-[#c9a84c]/60" />
                <h2 className="text-sm font-semibold tracking-wide">Bot-Aktivitaet (24h)</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Beantwortete Nachrichten", value: stats.botActivity.messagesLast24h.toLocaleString("de-DE"), icon: CheckCircle2, color: "text-emerald-400" },
                  { label: "Termine vereinbart", value: stats.botActivity.appointments.toString(), icon: Calendar, color: "text-purple-400" },
                  { label: "Gespräche heute", value: stats.kpis.conversationsToday.toString(), icon: Clock, color: "text-blue-400" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="flex items-center gap-4 rounded-lg p-4"
                      style={{ border: '1px solid var(--gold-border)', background: 'var(--surface)' }}
                    >
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                      <div>
                        <p className="text-xl font-bold">{stat.value}</p>
                        <p className="text-[11px] text-slate-500">{stat.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* HubSpot-Integration */}
            <HubSpotSettings />
          </>
        ) : null}
      </main>

      {/* ──────────── Plattform-Bot Chat-Widget ──────────── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/40 backdrop-blur-xl"
            style={{ border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(14,14,26,0.95)' }}
          >
            {/* Chat-Header */}
            <div
              className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: '1px solid rgba(201,168,76,0.1)', background: 'rgba(201,168,76,0.04)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
                  <HelpCircle className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Plattform-Assistent</p>
                  <p className="text-[10px] text-slate-500">Frag mich alles zur Plattform</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Nachrichten */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-br-md bg-purple-500/20 text-purple-100"
                        : "rounded-bl-md bg-white/[0.06] text-slate-300"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-white/[0.06] px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Eingabe */}
            <div className="border-t border-white/[0.06] p-3">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Frage zur Plattform stellen…"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 transition-colors hover:bg-purple-500/30 disabled:opacity-30"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-slate-600">
                Powered by AI Conversion • Claude AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat-Toggle (wenn geschlossen) */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 shadow-lg shadow-purple-600/30 transition-transform hover:scale-105"
          >
            <HelpCircle className="h-6 w-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
