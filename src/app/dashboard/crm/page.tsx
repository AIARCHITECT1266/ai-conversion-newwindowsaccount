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

/* ───────────────────────────── Konstanten ───────────────────────── */

const COLUMNS: { key: PipelineStatus; label: string; icon: typeof Star; gradient: string; dotColor: string }[] = [
  { key: "NEU", label: "Neu", icon: Sparkles, gradient: "from-slate-400 to-slate-500", dotColor: "bg-slate-400" },
  { key: "QUALIFIZIERT", label: "Qualifiziert", icon: Star, gradient: "from-blue-400 to-blue-500", dotColor: "bg-blue-400" },
  { key: "TERMIN", label: "Termin", icon: CalendarClock, gradient: "from-purple-400 to-purple-500", dotColor: "bg-purple-400" },
  { key: "ANGEBOT", label: "Angebot", icon: FileText, gradient: "from-[#c9a84c] to-[#d4b85c]", dotColor: "bg-[#c9a84c]" },
  { key: "GEWONNEN", label: "Gewonnen", icon: Trophy, gradient: "from-emerald-400 to-emerald-500", dotColor: "bg-emerald-400" },
];

/* ───────────────────────────── Hilfs-Funktionen ────────────────── */

function maskId(externalId: string): string {
  if (externalId.length <= 6) return "•••••";
  return externalId.slice(0, 3) + " •••• " + externalId.slice(-2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatCurrency(value: number): string {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

/* ───────────────────────────── Auth Hook ────────────────────────── */

function useTenantInfo(): { tenantId: string | null; tenantName: string | null; loading: boolean } {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/dashboard/me")
      .then((r) => {
        if (!r.ok) {
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

/* ───────────────────────────── Lead-Karte ──────────────────────── */

function LeadCard({
  lead,
  onEdit,
  onDragStart,
}: {
  lead: CrmLead;
  onEdit: (lead: CrmLead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
}) {
  const scoreColor =
    lead.score >= 80 ? "text-emerald-400" : lead.score >= 50 ? "text-[#c9a84c]" : "text-red-400";
  const scoreBg =
    lead.score >= 80 ? "bg-emerald-500/10" : lead.score >= 50 ? "bg-[#c9a84c]/10" : "bg-red-500/10";

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
      {/* Header: ID + Score */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="text-sm font-medium text-slate-200">
            {maskId(lead.conversation.externalId)}
          </span>
        </div>
        <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${scoreBg}`}>
          <span className={`text-xs font-semibold ${scoreColor}`}>{lead.score}</span>
        </div>
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

      {/* Footer: Datum + Termin */}
      <div className="flex items-center justify-between text-[11px] text-slate-600">
        <span>{formatDate(lead.createdAt)}</span>
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

/* ───────────────────────────── Edit-Modal ──────────────────────── */

function EditModal({
  lead,
  onClose,
  onSave,
}: {
  lead: CrmLead;
  onClose: () => void;
  onSave: (id: string, data: { dealValue?: number | null; notes?: string | null }) => Promise<void>;
}) {
  const [dealValue, setDealValue] = useState(lead.dealValue?.toString() ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(lead.id, {
      dealValue: dealValue === "" ? null : Number(dealValue),
      notes: notes || null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[rgba(201,168,76,0.15)] p-6"
        style={{ background: "#0e0e1a" }}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "Georgia, serif" }}>
              Lead bearbeiten
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {maskId(lead.conversation.externalId)} • Score {lead.score}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Deal-Wert */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Deal-Wert (EUR)
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
            <Euro className="h-4 w-4 text-[#c9a84c]" />
            <input
              type="number"
              min="0"
              step="100"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              placeholder="z.B. 5000"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Notizen */}
        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Notizen
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Notizen zum Lead..."
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none"
          />
        </div>

        {/* Aktionen */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-white/[0.04]"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Speichern
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── Pipeline-Spalte ────────────────── */

function PipelineColumn({
  column,
  leads,
  totalValue,
  onDragOver,
  onDrop,
  onEditLead,
  onDragStart,
  isDragOver,
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
        isDragOver
          ? "border-[rgba(201,168,76,0.35)] bg-[rgba(201,168,76,0.03)]"
          : "border-white/[0.06] bg-white/[0.015]"
      }`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.key)}
    >
      {/* Spalten-Header */}
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
        {totalValue > 0 && (
          <p className="mt-1.5 text-xs text-[#c9a84c]">{formatCurrency(totalValue)}</p>
        )}
      </div>

      {/* Lead-Karten */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        <AnimatePresence mode="popLayout">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onEdit={onEditLead}
              onDragStart={onDragStart}
            />
          ))}
        </AnimatePresence>
        {leads.length === 0 && (
          <div className="flex h-full min-h-[200px] items-center justify-center">
            <p className="text-xs text-slate-600">Keine Leads</p>
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
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<PipelineStatus | null>(null);
  const draggedLeadId = useRef<string | null>(null);

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

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Lead-Status per API aktualisieren
  async function updateLead(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/dashboard/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Fehler beim Aktualisieren");
    await fetchLeads();
  }

  // Drag & Drop Handler
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

    // Optimistisches Update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, pipelineStatus: newStatus } : l))
    );

    try {
      await updateLead(leadId, { pipelineStatus: newStatus });
    } catch {
      // Rollback bei Fehler
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, pipelineStatus: lead.pipelineStatus } : l))
      );
    }

    draggedLeadId.current = null;
  }

  // Notizen/Deal-Wert speichern
  async function handleSaveLeadDetails(
    id: string,
    data: { dealValue?: number | null; notes?: string | null }
  ) {
    await updateLead(id, data);
  }

  // Leads nach Pipeline-Status gruppieren
  function getLeadsForStatus(status: PipelineStatus): CrmLead[] {
    return leads.filter((l) => l.pipelineStatus === status);
  }

  function getTotalValue(status: PipelineStatus): number {
    return getLeadsForStatus(status).reduce((sum, l) => sum + (l.dealValue ?? 0), 0);
  }

  // Gesamt-Pipeline-Wert
  const totalPipelineValue = leads.reduce((sum, l) => sum + (l.dealValue ?? 0), 0);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#07070d" }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-white" style={{ background: "#07070d", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {/* CSS-Variablen */}
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
        }
      `}</style>

      {/* Hintergrund-Glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[5%] h-[600px] w-[600px] rounded-full bg-[rgba(201,168,76,0.05)] blur-[160px]" />
        <div className="absolute -right-[5%] top-[30%] h-[400px] w-[400px] rounded-full bg-[rgba(139,92,246,0.04)] blur-[140px]" />
      </div>

      {/* Header */}
      <header
        className="relative z-10 backdrop-blur-md"
        style={{ borderBottom: "1px solid var(--gold-border)", background: "rgba(7,7,13,0.8)" }}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:border-[rgba(201,168,76,0.2)] hover:text-[#c9a84c]"
            >
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
            {/* Pipeline-Gesamtwert */}
            {totalPipelineValue > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(201,168,76,0.15)] bg-[rgba(201,168,76,0.05)] px-3 py-1.5">
                <Euro className="h-3.5 w-3.5 text-[#c9a84c]" />
                <span className="text-sm font-semibold text-[#c9a84c]">
                  {formatCurrency(totalPipelineValue)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1.5">
              <span className="text-xs font-medium text-purple-400">
                {leads.length} Lead{leads.length !== 1 ? "s" : ""}
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
      <main
        className="relative z-10 mx-auto max-w-[1600px] px-6 py-6"
        onDragLeave={() => setDragOverColumn(null)}
      >
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-4">
            {COLUMNS.map((col) => (
              <PipelineColumn
                key={col.key}
                column={col}
                leads={getLeadsForStatus(col.key)}
                totalValue={getTotalValue(col.key)}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDrop={handleDrop}
                onEditLead={setEditingLead}
                onDragStart={handleDragStart}
                isDragOver={dragOverColumn === col.key}
              />
            ))}
          </div>
        )}
      </main>

      {/* Edit-Modal */}
      <AnimatePresence>
        {editingLead && (
          <EditModal
            lead={editingLead}
            onClose={() => setEditingLead(null)}
            onSave={handleSaveLeadDetails}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
