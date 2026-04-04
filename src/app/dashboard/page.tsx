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
  ACTIVE: "bg-emerald-500/20 text-emerald-400",
  PAUSED: "bg-amber-500/20 text-amber-400",
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
    score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500/70";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-slate-400">{score}</span>
    </div>
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

  // Daten laden und alle 30s aktualisieren
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
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
      <div className="flex min-h-screen items-center justify-center bg-navy-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-navy-950 text-white">
      {/* Hintergrund-Glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[5%] h-[600px] w-[600px] rounded-full bg-purple-600/[0.08] blur-[160px]" />
        <div className="absolute right-[5%] top-[30%] h-[400px] w-[400px] rounded-full bg-emerald-500/[0.05] blur-[140px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] bg-navy-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15">
              <Bot className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{tenantName ?? "Mein Dashboard"}</h1>
              <p className="text-xs text-slate-500">AI Conversion • WhatsApp Bot</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchStats}
              className="rounded-lg border border-white/[0.06] p-1.5 text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-white"
              title="Aktualisieren"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Bot aktiv</span>
            </div>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-sm font-medium text-purple-300 transition-colors hover:bg-purple-500/20"
            >
              <HelpCircle className="h-4 w-4" />
              Plattform-Hilfe
            </button>
          </div>
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
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        ) : stats ? (
          <>
            {/* KPI-Karten */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((kpi, i) => {
                const Icon = kpi.icon;
                const colorMap: Record<string, string> = {
                  purple: "bg-purple-500/[0.08] text-purple-400",
                  emerald: "bg-emerald-500/[0.08] text-emerald-400",
                  blue: "bg-blue-500/[0.08] text-blue-400",
                  amber: "bg-amber-500/[0.08] text-amber-400",
                };
                return (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: i * 0.08 }}
                    className="glass-card rounded-xl bg-navy-900/60 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[kpi.color]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold">{kpi.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{kpi.label}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Mittlerer Bereich: Conversations + Lead-Pipeline */}
            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {/* Letzte Gespräche */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.35 }}
                className="glass-card rounded-xl bg-navy-900/60 p-6 lg:col-span-2"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-purple-400" />
                    <h2 className="text-sm font-semibold">Letzte Gespräche</h2>
                  </div>
                  <span className="text-xs text-slate-500">Live-Übersicht</span>
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
                        className="flex items-center gap-4 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition-colors hover:border-purple-500/10 hover:bg-purple-500/[0.02]"
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
                className="glass-card rounded-xl bg-navy-900/60 p-6"
              >
                <div className="mb-5 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-400" />
                  <h2 className="text-sm font-semibold">Lead-Pipeline</h2>
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
              className="glass-card mt-6 rounded-xl bg-navy-900/60 p-6"
            >
              <div className="mb-5 flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-semibold">Bot-Aktivität (24h)</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Beantwortete Nachrichten", value: stats.botActivity.messagesLast24h.toLocaleString("de-DE"), icon: CheckCircle2, color: "text-emerald-400" },
                  { label: "Termine vereinbart", value: stats.botActivity.appointments.toString(), icon: Calendar, color: "text-purple-400" },
                  { label: "Gespräche heute", value: stats.kpis.conversationsToday.toString(), icon: Clock, color: "text-blue-400" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="flex items-center gap-4 rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
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
            className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-navy-900/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
          >
            {/* Chat-Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-purple-500/[0.06] px-5 py-3.5">
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
