"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  MessageSquare,
  Send,
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
import KpiCards from "./_components/KpiCards";
import TrendChart from "./_components/TrendChart";
import TopSignals from "./_components/TopSignals";
import ActionBoard from "./_components/ActionBoard";
import LivePulse from "./_components/LivePulse";
import ConversationAnalyticsTeaser from "./_components/ConversationAnalyticsTeaser";
import YesterdayResults from "./_components/YesterdayResults";

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
    externalId: string | null;
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

// Externe ID maskieren (DSGVO). Fuer WEB-Channel-Conversations ist
// externalId seit Phase 3a.5 nullable - wir zeigen dann den generischen
// Masken-Platzhalter.
function maskId(externalId: string | null): string {
  if (!externalId || externalId.length <= 6) return "•••••";
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

      {connected ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-emerald-400">Verbunden mit HubSpot</span>
          </div>
          <p className="mb-4 text-xs text-slate-500">
            Leads mit Score &gt;70 werden automatisch als Kontakte in HubSpot angelegt.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Neuen API-Key eingeben..."
              className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none"
            />
            {apiKey ? (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Speichern
              </button>
            ) : (
              <button onClick={() => { setApiKey(""); handleSave(); }} disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-2 text-sm font-medium text-red-400/80 transition-colors hover:bg-red-500/15 disabled:opacity-50">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                Trennen
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mb-4 text-xs text-slate-300">
            HubSpot verbinden – Leads mit Score &gt;70 werden automatisch synchronisiert.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="HubSpot Private App Token (pat-...)"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none mb-3"
          />
          <button onClick={handleSave} disabled={saving || !apiKey}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            Verbinden
          </button>
        </>
      )}

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

  // Defensive ?? []-Guards: die API garantiert Arrays (siehe
  // /api/dashboard/stats), aber ein zusaetzliches Sicherheitsnetz
  // gegen zukuenftige Shape-Regressionen schadet nicht.
  const conversations = stats?.conversations ?? [];
  const pipeline = stats?.pipeline ?? [];
  const totalLeads = pipeline.reduce((s, p) => s + p.count, 0);

  // Auth lädt noch
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white" style={{ background: '#07070d' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Phase 2b.3: Inline-Header, Top-Nav und Token-Block sind jetzt
          im gemeinsamen Layout (src/app/dashboard/layout.tsx) bzw.
          globals.css. Diese Page rendert nur noch Dashboard-Inhalt. */}

      {/* Dashboard-Inhalt — Wrapper-`<div>` statt `<main>`, weil das
          umgebende /dashboard/layout.tsx bereits ein `<main>` setzt
          und nested `<main>` semantisch nicht zulaessig ist. */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
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
            {/* Page-Header (Phase 2c.4): "Uebersicht" + LivePulse-Indikator
                rechts. Phase 2b.3 hatte den Inline-Header entfernt; dies
                hier ist ein neuer, schlankerer Header speziell fuer den
                Live-Indikator. Nicht doppelt mit dem Tab "Uebersicht" der
                TopNav — der Tab markiert die Section, der h1 oeffnet die
                Page-Section selbst. */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-[var(--text)]">
                Uebersicht
              </h1>
              <LivePulse />
            </div>

            {/* KPI-Karten + Trend-Chart (Phase 2c.2a/2c.2b/2c.2c).
                Self-contained Components mit eigenem Fetch — kein
                Polling. Live-Updates fuer KPIs als TD-Post-Demo,
                falls Demo-Wert besteht. */}
            <KpiCards />

            <div className="mt-8">
              <TrendChart />
            </div>

            {/* "Gestern"-Section (Phase 2e): Tages-Bilanz der gestrigen
                Leads, Berlin-Zeit DST-aware. Self-contained, fetcht
                /api/dashboard/yesterday + /api/dashboard/labels. */}
            <div className="mt-8">
              <YesterdayResults />
            </div>

            {/* Top-Signale (Phase 2c.3): aggregierte scoringSignals
                ueber alle Tenant-Leads. Self-contained, fetcht
                /api/dashboard/signals. */}
            <div className="mt-8">
              <TopSignals />
            </div>

            {/* Action-Board (Phase 2c.3): drei Spalten mit den
                wichtigsten anstehenden Lead-Aktionen. Mobile-First
                stacked, ab lg drei Spalten. "Als kontaktiert
                markieren"-Action ist im Pilot deaktiviert
                (Inline-Mutation kommt Post-Demo). */}
            <div className="mt-8">
              <ActionBoard />
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
                  {conversations.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 text-center py-6">
                      <p className="text-slate-500 text-sm">
                        Noch keine Gespraeche – starte jetzt deine erste Kampagne.
                      </p>
                      <a href="/dashboard/campaigns"
                         className="text-xs text-[#c9a84c] underline underline-offset-4 hover:text-[#d4b85c]">
                        QR-Code teilen oder Kampagne erstellen &rarr;
                      </a>
                    </div>
                  ) : (
                    /* Phase 2e Pflicht-Item: Items sind klickbar und
                       fuehren auf /dashboard/conversations/<id>.
                       <Link> statt <button onClick> — semantisch korrekt
                       und erlaubt Right-Click-Open-in-New-Tab im Demo. */
                    conversations.map((conv) => (
                      <Link
                        key={conv.id}
                        href={`/dashboard/conversations/${conv.id}`}
                        className="flex items-center gap-4 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition-colors hover:border-[rgba(201,168,76,0.25)] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
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
                      </Link>
                    ))
                  )}
                </div>
                {/* Footer-Link zur dedizierten List-View (Phase 6.3) */}
                {conversations.length > 0 && (
                  <div className="mt-4 flex justify-end border-t border-white/[0.06] pt-3">
                    <a
                      href="/dashboard/conversations"
                      className="text-xs text-[#c9a84c] underline underline-offset-4 transition-colors hover:text-[#d4b85c]"
                    >
                      Alle anzeigen &rarr;
                    </a>
                  </div>
                )}
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
                    pipeline.map((stage) => (
                      <div
                        key={stage.qualification}
                        className={`${pipelineColors[stage.qualification] ?? "bg-slate-500"} transition-all`}
                        style={{ width: `${(stage.count / totalLeads) * 100}%` }}
                      />
                    ))}
                </div>

                {/* Stufen-Details */}
                <div className="space-y-3">
                  {pipeline.map((stage) => (
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

            {/* Coming-Soon-Teaser (Phase 2c.4): Demo-Narrativ am Ende
                des Dashboards — signalisiert dass weitere Insights-
                Bereiche im Pilot zusammen mit dem Tenant entwickelt
                werden. Position bewusst nach HubSpot-Settings, weil
                HubSpot eine Setup-Sektion ist und der Teaser den
                inhaltlichen Schluss bildet. */}
            <div className="mt-5">
              <ConversationAnalyticsTeaser />
            </div>
          </>
        ) : null}
      </div>

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
