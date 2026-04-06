"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  RefreshCw,
  GripVertical,
  StickyNote,
  Euro,
  X,
  Check,
  ArrowLeft,
  Kanban,
  Star,
  CalendarClock,
  FileText,
  Trophy,
  Sparkles,
  Filter,
  MessageSquare,
  User,
  Bot,
  Clock,
  Shield,
  ChevronDown,
  Activity,
  Send,
} from "lucide-react";

/* ───────────────────────────── Typen ───────────────────────────── */

type PipelineStatus = "NEU" | "QUALIFIZIERT" | "TERMIN" | "ANGEBOT" | "GEWONNEN";

interface CrmLead {
  id: string;
  score: number;
  qualification: string;
  status: string;
  pipelineStatus: PipelineStatus;
  dealValue: number | null;
  notes: string | null;
  appointmentAt: string | null;
  createdAt: string;
  conversation: {
    externalId: string;
    status: string;
    updatedAt: string;
  };
}

interface LeadMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  messageType: string;
  timestamp: string;
}

interface LeadDetail {
  id: string;
  score: number;
  qualification: string;
  status: string;
  pipelineStatus: PipelineStatus;
  dealValue: number | null;
  notes: string | null;
  followUpCount: number;
  lastFollowUpAt: string | null;
  appointmentAt: string | null;
  createdAt: string;
  conversation: {
    id: string;
    externalId: string;
    status: string;
    language: string;
    consentGiven: boolean;
    consentAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  messages: LeadMessage[];
}

type FilterQualification = "ALL" | "UNQUALIFIED" | "MARKETING_QUALIFIED" | "SALES_QUALIFIED" | "OPPORTUNITY" | "CUSTOMER";
type FilterScore = "ALL" | "HIGH" | "MEDIUM" | "LOW";
type FilterDate = "ALL" | "TODAY" | "WEEK" | "MONTH";

/* ───────────────────────────── Konstanten ───────────────────────── */

const COLUMNS: { key: PipelineStatus; label: string; icon: typeof Star; gradient: string }[] = [
  { key: "NEU", label: "Neu", icon: Sparkles, gradient: "from-slate-400 to-slate-500" },
  { key: "QUALIFIZIERT", label: "Qualifiziert", icon: Star, gradient: "from-blue-400 to-blue-500" },
  { key: "TERMIN", label: "Termin", icon: CalendarClock, gradient: "from-purple-400 to-purple-500" },
  { key: "ANGEBOT", label: "Angebot", icon: FileText, gradient: "from-[#c9a84c] to-[#d4b85c]" },
  { key: "GEWONNEN", label: "Gewonnen", icon: Trophy, gradient: "from-emerald-400 to-emerald-500" },
];

const QUALIFICATION_LABELS: Record<string, string> = {
  UNQUALIFIED: "Unqualifiziert",
  MARKETING_QUALIFIED: "MQL",
  SALES_QUALIFIED: "SQL",
  OPPORTUNITY: "Opportunity",
  CUSTOMER: "Kunde",
};

const QUALIFICATION_COLORS: Record<string, string> = {
  UNQUALIFIED: "text-slate-400 bg-slate-500/10",
  MARKETING_QUALIFIED: "text-blue-400 bg-blue-500/10",
  SALES_QUALIFIED: "text-purple-400 bg-purple-500/10",
  OPPORTUNITY: "text-[#c9a84c] bg-[#c9a84c]/10",
  CUSTOMER: "text-emerald-400 bg-emerald-500/10",
};

/* ───────────────────────────── Hilfs-Funktionen ────────────────── */

function maskId(externalId: string): string {
  if (externalId.length <= 6) return "•••••";
  return externalId.slice(0, 3) + " •••• " + externalId.slice(-2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(value: number): string {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

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

function getScoreColor(score: number) {
  if (score > 70) return { bar: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10", glow: "shadow-emerald-500/20" };
  if (score >= 40) return { bar: "bg-[#c9a84c]", text: "text-[#c9a84c]", bg: "bg-[#c9a84c]/10", glow: "shadow-[#c9a84c]/20" };
  return { bar: "bg-red-500", text: "text-red-400", bg: "bg-red-500/10", glow: "shadow-red-500/20" };
}

/* ───────────────────────────── Auth Hook ────────────────────────── */

function useTenantInfo() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/dashboard/me")
      .then((r) => { if (!r.ok) { window.location.href = "/dashboard/login"; return null; } return r.json(); })
      .then((data) => { if (data) { setTenantId(data.tenantId); setTenantName(data.tenantName); } })
      .catch(() => { window.location.href = "/dashboard/login"; })
      .finally(() => setLoading(false));
  }, []);
  return { tenantId, tenantName, loading };
}

/* ───────────────────────────── Score-Balken ─────────────────────── */

function ScoreBar({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const colors = getScoreColor(score);
  const h = size === "lg" ? "h-2.5" : "h-1.5";
  const w = size === "lg" ? "w-full" : "w-full";

  return (
    <div className="flex items-center gap-2">
      <div className={`${h} ${w} rounded-full bg-white/[0.06] overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${colors.bar}`}
        />
      </div>
      <span className={`shrink-0 text-xs font-semibold ${colors.text}`}>{score}</span>
    </div>
  );
}

/* ───────────────────────────── Filter-Leiste ────────────────────── */

function FilterBar({
  scoreFilter, setScoreFilter,
  dateFilter, setDateFilter,
  qualFilter, setQualFilter,
}: {
  scoreFilter: FilterScore; setScoreFilter: (v: FilterScore) => void;
  dateFilter: FilterDate; setDateFilter: (v: FilterDate) => void;
  qualFilter: FilterQualification; setQualFilter: (v: FilterQualification) => void;
}) {
  function SelectButton({ value, label, active, onClick }: { value: string; label: string; active: boolean; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
          active
            ? "bg-[rgba(201,168,76,0.15)] text-[#c9a84c] border border-[rgba(201,168,76,0.3)]"
            : "text-slate-500 border border-transparent hover:text-slate-300 hover:bg-white/[0.04]"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3">
      <Filter className="h-4 w-4 text-[#c9a84c]" />

      {/* Score Filter */}
      <div className="flex items-center gap-1 border-r border-white/[0.06] pr-3">
        <span className="mr-1 text-[11px] text-slate-600">Score:</span>
        {([["ALL", "Alle"], ["HIGH", ">70"], ["MEDIUM", "40-70"], ["LOW", "<40"]] as const).map(([val, lbl]) => (
          <SelectButton key={val} value={val} label={lbl} active={scoreFilter === val} onClick={() => setScoreFilter(val)} />
        ))}
      </div>

      {/* Datum Filter */}
      <div className="flex items-center gap-1 border-r border-white/[0.06] pr-3">
        <span className="mr-1 text-[11px] text-slate-600">Zeitraum:</span>
        {([["ALL", "Alle"], ["TODAY", "Heute"], ["WEEK", "7 Tage"], ["MONTH", "30 Tage"]] as const).map(([val, lbl]) => (
          <SelectButton key={val} value={val} label={lbl} active={dateFilter === val} onClick={() => setDateFilter(val)} />
        ))}
      </div>

      {/* Qualifikation Filter */}
      <div className="flex items-center gap-1">
        <span className="mr-1 text-[11px] text-slate-600">Qualif.:</span>
        {([["ALL", "Alle"], ["UNQUALIFIED", "Neu"], ["MARKETING_QUALIFIED", "MQL"], ["SALES_QUALIFIED", "SQL"], ["OPPORTUNITY", "Opp."], ["CUSTOMER", "Kunde"]] as const).map(([val, lbl]) => (
          <SelectButton key={val} value={val} label={lbl} active={qualFilter === val} onClick={() => setQualFilter(val)} />
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────── Lead-Karte ──────────────────────── */

function LeadCard({
  lead, onEdit, onDragStart,
}: {
  lead: CrmLead;
  onEdit: (lead: CrmLead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
}) {
  const colors = getScoreColor(lead.score);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, lead.id)}
      onClick={() => onEdit(lead)}
      className="group cursor-grab rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-[rgba(201,168,76,0.25)] hover:bg-white/[0.04] active:cursor-grabbing"
    >
      {/* Header: ID + Qualifikation */}
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="text-sm font-medium text-slate-200">
            {maskId(lead.conversation.externalId)}
          </span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${QUALIFICATION_COLORS[lead.qualification] ?? "text-slate-400 bg-slate-500/10"}`}>
          {QUALIFICATION_LABELS[lead.qualification] ?? lead.qualification}
        </span>
      </div>

      {/* Score-Balken */}
      <div className="mb-3">
        <ScoreBar score={lead.score} />
      </div>

      {/* Deal-Wert */}
      {lead.dealValue !== null && lead.dealValue > 0 && (
        <div className="mb-2 flex items-center gap-1.5">
          <Euro className="h-3.5 w-3.5 text-[#c9a84c]" />
          <span className="text-sm font-semibold text-[#c9a84c]">
            {formatCurrency(lead.dealValue)}
          </span>
        </div>
      )}

      {/* Notiz-Vorschau */}
      {lead.notes && (
        <div className="mb-2 flex items-start gap-1.5">
          <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-purple-400/60" />
          <p className="line-clamp-2 text-xs text-slate-500">{lead.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-600">
        <span>{timeAgo(lead.createdAt)}</span>
        {lead.appointmentAt && (
          <span className="flex items-center gap-1 text-purple-400">
            <CalendarClock className="h-3 w-3" />
            {formatDate(lead.appointmentAt)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ───────────────────────────── Detail-Modal ─────────────────────── */

function DetailModal({
  leadId, onClose, onSave,
}: {
  leadId: string;
  onClose: () => void;
  onSave: (id: string, data: { dealValue?: number | null; notes?: string | null }) => Promise<void>;
}) {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"chat" | "details" | "timeline">("chat");
  const [dealValue, setDealValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/dashboard/leads/${leadId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.lead) {
          setDetail(data.lead);
          setDealValue(data.lead.dealValue?.toString() ?? "");
          setNotes(data.lead.notes ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [leadId]);

  useEffect(() => {
    if (activeTab === "chat") chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTab, detail]);

  async function handleSave() {
    setSaving(true);
    await onSave(leadId, {
      dealValue: dealValue === "" ? null : Number(dealValue),
      notes: notes || null,
    });
    setSaving(false);
    onClose();
  }

  // Aktivitäts-Timeline aus den Nachrichten generieren
  function buildTimeline(d: LeadDetail) {
    const events: { time: string; icon: typeof Activity; color: string; label: string }[] = [];
    events.push({ time: d.conversation.createdAt, icon: Sparkles, color: "text-[#c9a84c]", label: "Konversation gestartet" });
    if (d.conversation.consentAt) {
      events.push({ time: d.conversation.consentAt, icon: Shield, color: "text-emerald-400", label: "DSGVO-Consent erteilt" });
    }
    events.push({ time: d.createdAt, icon: Star, color: "text-purple-400", label: `Lead erstellt (Score: ${d.score})` });
    if (d.appointmentAt) {
      events.push({ time: d.appointmentAt, icon: CalendarClock, color: "text-blue-400", label: "Termin vereinbart" });
    }
    if (d.lastFollowUpAt) {
      events.push({ time: d.lastFollowUpAt, icon: Send, color: "text-[#c9a84c]", label: `Follow-Up ${d.followUpCount} gesendet` });
    }
    return events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }

  const scoreColors = detail ? getScoreColor(detail.score) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[rgba(201,168,76,0.15)]"
        style={{ background: "#0e0e1a" }}
      >
        {loading || !detail ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
          </div>
        ) : (
          <>
            {/* Modal-Header */}
            <div className="shrink-0 border-b border-white/[0.06] px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "Georgia, serif" }}>
                    {maskId(detail.conversation.externalId)}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${QUALIFICATION_COLORS[detail.qualification]}`}>
                      {QUALIFICATION_LABELS[detail.qualification]}
                    </span>
                    <span className="text-xs text-slate-500">Sprache: {detail.conversation.language.toUpperCase()}</span>
                    <span className="text-xs text-slate-500">Erstellt: {formatDate(detail.createdAt)}</span>
                  </div>
                </div>
                <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Score-Bereich */}
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">Lead-Score</span>
                  <span className={`text-lg font-bold ${scoreColors!.text}`}>{detail.score}/100</span>
                </div>
                <ScoreBar score={detail.score} size="lg" />
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-red-400">Kalt</span>
                  <span className="text-[#c9a84c]">Warm</span>
                  <span className="text-emerald-400">Heiß</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-4 flex gap-1">
                {([
                  { key: "chat" as const, label: "Chat-Verlauf", icon: MessageSquare },
                  { key: "details" as const, label: "Details & Notizen", icon: FileText },
                  { key: "timeline" as const, label: "Aktivität", icon: Activity },
                ]).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        activeTab === tab.key
                          ? "bg-[rgba(201,168,76,0.15)] text-[#c9a84c] border border-[rgba(201,168,76,0.3)]"
                          : "text-slate-500 border border-transparent hover:text-slate-300"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab-Inhalt */}
            <div className="flex-1 overflow-y-auto">
              {/* Chat-Verlauf */}
              {activeTab === "chat" && (
                <div className="space-y-3 p-4">
                  {detail.messages.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-600">Keine Nachrichten vorhanden</p>
                  ) : (
                    detail.messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}>
                        <div className={`flex max-w-[80%] gap-2 ${msg.role === "USER" ? "flex-row-reverse" : ""}`}>
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            msg.role === "USER" ? "bg-purple-500/15" : "bg-[rgba(201,168,76,0.1)]"
                          }`}>
                            {msg.role === "USER" ? <User className="h-3.5 w-3.5 text-purple-400" /> : <Bot className="h-3.5 w-3.5 text-[#c9a84c]" />}
                          </div>
                          <div>
                            <div className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                              msg.role === "USER"
                                ? "rounded-br-md bg-purple-500/15 text-purple-100"
                                : "rounded-bl-md bg-white/[0.04] text-slate-300"
                            }`}>
                              {msg.content}
                            </div>
                            <p className={`mt-1 text-[10px] text-slate-600 ${msg.role === "USER" ? "text-right" : ""}`}>
                              {formatDateTime(msg.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* Details & Notizen */}
              {activeTab === "details" && (
                <div className="space-y-4 p-6">
                  {/* Info-Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Pipeline-Status", value: detail.pipelineStatus },
                      { label: "Qualifikation", value: QUALIFICATION_LABELS[detail.qualification] },
                      { label: "Konversation", value: detail.conversation.status },
                      { label: "Follow-Ups", value: `${detail.followUpCount}/3 gesendet` },
                      { label: "Erstellt", value: formatDate(detail.createdAt) },
                      { label: "Letzte Aktivität", value: timeAgo(detail.conversation.updatedAt) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                        <p className="text-[11px] text-slate-600">{item.label}</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-200">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Deal-Wert */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">Deal-Wert (EUR)</label>
                    <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                      <Euro className="h-4 w-4 text-[#c9a84c]" />
                      <input
                        type="number" min="0" step="100" value={dealValue}
                        onChange={(e) => setDealValue(e.target.value)}
                        placeholder="z.B. 5000"
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Notizen */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">Notizen</label>
                    <textarea
                      value={notes} onChange={(e) => setNotes(e.target.value)}
                      rows={5} placeholder="Notizen zum Lead..."
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none"
                    />
                  </div>

                  {/* Speichern */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleSave} disabled={saving}
                      className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-5 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Speichern
                    </button>
                  </div>
                </div>
              )}

              {/* Aktivitäts-Timeline */}
              {activeTab === "timeline" && (
                <div className="p-6">
                  <div className="relative border-l border-white/[0.08] pl-6">
                    {buildTimeline(detail).map((event, i) => {
                      const Icon = event.icon;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="relative mb-6 last:mb-0"
                        >
                          <div className={`absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full bg-[#0e0e1a] border border-white/[0.08]`}>
                            <Icon className={`h-3 w-3 ${event.color}`} />
                          </div>
                          <p className="text-sm text-slate-200">{event.label}</p>
                          <p className="mt-0.5 text-[11px] text-slate-600">{formatDateTime(event.time)}</p>
                        </motion.div>
                      );
                    })}

                    {/* Nachrichten-Statistik */}
                    <div className="relative mb-0">
                      <div className="absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full bg-[#0e0e1a] border border-white/[0.08]">
                        <MessageSquare className="h-3 w-3 text-purple-400" />
                      </div>
                      <p className="text-sm text-slate-200">
                        {detail.messages.length} Nachrichten insgesamt
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        {detail.messages.filter(m => m.role === "USER").length} vom Kunden,{" "}
                        {detail.messages.filter(m => m.role === "ASSISTANT").length} vom Bot
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── Pipeline-Spalte ────────────────── */

function PipelineColumn({
  column, leads, totalValue, onDragOver, onDrop, onEditLead, onDragStart, isDragOver,
}: {
  column: (typeof COLUMNS)[number];
  leads: CrmLead[];
  totalValue: number;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: PipelineStatus) => void;
  onEditLead: (lead: CrmLead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  isDragOver: boolean;
}) {
  const Icon = column.icon;

  return (
    <div
      className={`flex min-h-[400px] flex-col rounded-2xl border transition-colors duration-200 ${
        isDragOver ? "border-[rgba(201,168,76,0.35)] bg-[rgba(201,168,76,0.03)]" : "border-white/[0.06] bg-white/[0.015]"
      }`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.key)}
    >
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${column.gradient} bg-opacity-20`}>
              <Icon className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-200">{column.label}</span>
          </div>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/[0.06] px-1.5 text-[11px] font-medium text-slate-400">
            {leads.length}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-[#c9a84c]">{formatCurrency(totalValue)}</p>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        <AnimatePresence mode="popLayout">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onEdit={onEditLead} onDragStart={onDragStart} />
          ))}
        </AnimatePresence>
        {leads.length === 0 && (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.06] m-1">
            <GripVertical className="h-5 w-5 text-slate-700" />
            <p className="text-xs text-slate-600">Leads hierher ziehen</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Haupt-Seite ──────────────────────── */

export default function CrmPipelinePage() {
  const { tenantName, loading: authLoading } = useTenantInfo();
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<PipelineStatus | null>(null);
  const draggedLeadId = useRef<string | null>(null);

  // Filter-State
  const [scoreFilter, setScoreFilter] = useState<FilterScore>("ALL");
  const [dateFilter, setDateFilter] = useState<FilterDate>("ALL");
  const [qualFilter, setQualFilter] = useState<FilterQualification>("ALL");

  const fetchLeads = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/dashboard/leads");
      if (!res.ok) throw new Error("Fehler beim Laden der Leads");
      const data = await res.json();
      setLeads(data.leads);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Filter anwenden
  const filteredLeads = leads.filter((lead) => {
    if (scoreFilter === "HIGH" && lead.score <= 70) return false;
    if (scoreFilter === "MEDIUM" && (lead.score < 40 || lead.score > 70)) return false;
    if (scoreFilter === "LOW" && lead.score >= 40) return false;

    if (qualFilter !== "ALL" && lead.qualification !== qualFilter) return false;

    if (dateFilter !== "ALL") {
      const created = new Date(lead.createdAt).getTime();
      const now = Date.now();
      if (dateFilter === "TODAY" && now - created > 24 * 60 * 60 * 1000) return false;
      if (dateFilter === "WEEK" && now - created > 7 * 24 * 60 * 60 * 1000) return false;
      if (dateFilter === "MONTH" && now - created > 30 * 24 * 60 * 60 * 1000) return false;
    }

    return true;
  });

  async function updateLead(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/dashboard/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Fehler beim Aktualisieren");
    await fetchLeads();
  }

  function handleDragStart(e: React.DragEvent, leadId: string) {
    draggedLeadId.current = leadId;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, status: PipelineStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  }

  async function handleDrop(e: React.DragEvent, newStatus: PipelineStatus) {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = draggedLeadId.current;
    if (!leadId) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.pipelineStatus === newStatus) return;

    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, pipelineStatus: newStatus } : l)));
    try {
      await updateLead(leadId, { pipelineStatus: newStatus });
    } catch {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, pipelineStatus: lead.pipelineStatus } : l)));
    }
    draggedLeadId.current = null;
  }

  async function handleSaveLeadDetails(id: string, data: { dealValue?: number | null; notes?: string | null }) {
    await updateLead(id, data);
  }

  function getLeadsForStatus(status: PipelineStatus) {
    return filteredLeads.filter((l) => l.pipelineStatus === status);
  }

  function getTotalValue(status: PipelineStatus) {
    return getLeadsForStatus(status).reduce((sum, l) => sum + (l.dealValue ?? 0), 0);
  }

  const totalPipelineValue = filteredLeads.reduce((sum, l) => sum + (l.dealValue ?? 0), 0);
  const hasActiveFilter = scoreFilter !== "ALL" || dateFilter !== "ALL" || qualFilter !== "ALL";

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
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:border-[rgba(201,168,76,0.2)] hover:text-[#c9a84c]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </a>
            <div>
              <h1 className="flex items-center gap-2 text-lg font-semibold">
                <Kanban className="h-5 w-5 text-[#c9a84c]" />
                <span style={{ fontFamily: "Georgia, serif", color: "#c9a84c" }}>CRM Pipeline</span>
                <span className="text-sm font-normal text-slate-500">• {tenantName}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalPipelineValue > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(201,168,76,0.15)] bg-[rgba(201,168,76,0.05)] px-3 py-1.5">
                <Euro className="h-3.5 w-3.5 text-[#c9a84c]" />
                <span className="text-sm font-semibold text-[#c9a84c]">{formatCurrency(totalPipelineValue)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1.5">
              <span className="text-xs font-medium text-purple-400">
                {filteredLeads.length}{hasActiveFilter ? ` / ${leads.length}` : ""} Lead{filteredLeads.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={() => { setLoading(true); fetchLeads(); }}
              className="rounded-lg border border-white/[0.06] p-1.5 text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-[#c9a84c]"
              title="Aktualisieren"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Pipeline-Board */}
      <main className="relative z-10 mx-auto max-w-[1600px] px-6 py-6" onDragLeave={() => setDragOverColumn(null)}>
        {/* Filter-Leiste */}
        <FilterBar
          scoreFilter={scoreFilter} setScoreFilter={setScoreFilter}
          dateFilter={dateFilter} setDateFilter={setDateFilter}
          qualFilter={qualFilter} setQualFilter={setQualFilter}
        />

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-4">
            {COLUMNS.map((col) => (
              <PipelineColumn
                key={col.key} column={col}
                leads={getLeadsForStatus(col.key)} totalValue={getTotalValue(col.key)}
                onDragOver={(e) => handleDragOver(e, col.key)} onDrop={handleDrop}
                onEditLead={(lead) => setSelectedLeadId(lead.id)}
                onDragStart={handleDragStart} isDragOver={dragOverColumn === col.key}
              />
            ))}
          </div>
        )}
      </main>

      {/* Detail-Modal */}
      <AnimatePresence>
        {selectedLeadId && (
          <DetailModal
            leadId={selectedLeadId}
            onClose={() => setSelectedLeadId(null)}
            onSave={handleSaveLeadDetails}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
