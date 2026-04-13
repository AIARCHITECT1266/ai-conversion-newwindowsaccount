"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ---------- Typen ----------

interface Tenant {
  id: string;
  name: string;
  slug: string;
  whatsappPhoneId: string;
  brandName: string;
  brandColor: string;
  retentionDays: number;
  paddlePlan: string | null;
  systemPrompt: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    conversations: number;
    leads: number;
  };
}

interface TenantDetail extends Tenant {
  systemPrompt: string;
}

interface TenantStats {
  tenantId: string;
  lastContact: string | null;
  leadPipeline: Record<string, number>;
}

interface Stats {
  pipeline: Record<string, number>;
  statusDistribution: Record<string, number>;
  tenantStats: TenantStats[];
}

// ---------- Pipeline-Konfiguration ----------

const PIPELINE_STAGES = [
  { key: "UNQUALIFIED", label: "Neu", color: "bg-gray-500" },
  { key: "MARKETING_QUALIFIED", label: "MQL", color: "bg-blue-500" },
  { key: "SALES_QUALIFIED", label: "SQL", color: "bg-purple-500" },
  { key: "OPPORTUNITY", label: "Opportunity", color: "bg-amber-500" },
  { key: "CUSTOMER", label: "Customer", color: "bg-emerald-500" },
];

// ---------- Hilfsfunktionen ----------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "–";
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- Hauptkomponente ----------

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdMagicLink, setCreatedMagicLink] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Escape schließt Edit-Modal / Delete-Dialog / Menü
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (deleteTarget) setDeleteTarget(null);
        else if (editingTenant) setEditingTenant(null);
        else if (selectedTenant) setSelectedTenant(null);
        else if (openMenuId) setOpenMenuId(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingTenant, selectedTenant, openMenuId, deleteTarget]);

  // Click-Outside schliesst Dropdown
  useEffect(() => {
    if (!openMenuId) return;
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [openMenuId]);

  // Toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tenantsRes, statsRes] = await Promise.all([
        fetch("/api/admin/tenants"),
        fetch("/api/admin/stats"),
      ]);

      if (!tenantsRes.ok || !statsRes.ok) {
        throw new Error("API-Fehler beim Laden der Daten");
      }

      const tenantsData = await tenantsRes.json();
      const statsData = await statsRes.json();

      setTenants(tenantsData.tenants);
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTenantDetail = useCallback(async (id: string) => {
    setOpenMenuId(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`);
      if (!res.ok) throw new Error("Fehler beim Laden");
      const data = await res.json();
      setSelectedTenant(data.tenant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const saveTenant = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/admin/tenants/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Fehler beim Speichern");
        }
        const data = await res.json();
        setSelectedTenant(data.tenant);
        setEditingTenant(null);
        await loadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Fehler");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [loadData]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stats für einen Tenant finden
  function getTenantStats(tenantId: string): TenantStats | undefined {
    return stats?.tenantStats.find((s) => s.tenantId === tenantId);
  }

  // Pipeline-Gesamtzahl
  const totalLeads = stats
    ? Object.values(stats.pipeline).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div
      className="min-h-screen p-6 md:p-10"
      style={{ background: "var(--bg)", fontFamily: "var(--sans)" }}
    >
      {/* CSS-Variablen und Font-Import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700;900&family=Geist:wght@400;500;600&display=swap');
        :root {
          --bg: #07070d;
          --surface: #0e0e1a;
          --gold: #c9a84c;
          --gold-subtle: rgba(201,168,76,0.08);
          --gold-border: rgba(201,168,76,0.1);
          --gold-border-hover: rgba(201,168,76,0.35);
          --purple: #8b5cf6;
          --text: #ede8df;
          --text-muted: rgba(237,232,223,0.45);
          --serif: 'Cormorant Garamond', Georgia, serif;
          --sans: 'Geist', system-ui, sans-serif;
        }
      `}</style>

      {/* Header */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1">
            <span
              style={{
                fontFamily: "var(--serif)",
                color: "var(--gold)",
                fontSize: "1.5rem",
                fontWeight: 700,
              }}
            >
              AI Conversion.
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Admin Dashboard
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            AI Conversion – Tenant-Verwaltung
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm transition disabled:opacity-50"
            style={{
              border: "1px solid var(--gold-border)",
              color: "var(--gold)",
              background: "transparent",
            }}
          >
            {loading ? "Laden…" : "Aktualisieren"}
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-500"
          >
            + Neuer Tenant
          </button>
        </div>
      </div>

      {/* Fehler-Anzeige */}
      {error && (
        <div
          className="mb-6 rounded-lg p-4"
          style={{
            border: "1px solid rgba(201,168,76,0.3)",
            background: "rgba(201,168,76,0.06)",
            color: "var(--gold)",
          }}
        >
          {error}
        </div>
      )}

      {/* KPI-Karten */}
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Tenants"
          value={tenants.length}
          sub={`${tenants.filter((t) => t.isActive).length} aktiv`}
        />
        <KpiCard
          label="Conversations"
          value={tenants.reduce((s, t) => s + t._count.conversations, 0)}
        />
        <KpiCard label="Leads" value={totalLeads} />
        <KpiCard
          label="Customers"
          value={stats?.pipeline.CUSTOMER ?? 0}
          highlight
        />
      </div>

      {/* Lead-Pipeline */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Lead-Pipeline
        </h2>
        <div
          className="rounded-xl p-6"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--gold-border)",
          }}
        >
          {totalLeads === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Noch keine Leads vorhanden
            </p>
          ) : (
            <>
              {/* Pipeline-Balken */}
              <div className="mb-4 flex h-4 overflow-hidden rounded-full bg-navy-800">
                {PIPELINE_STAGES.map((stage) => {
                  const count = stats?.pipeline[stage.key] ?? 0;
                  const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={stage.key}
                      className={`${stage.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                      title={`${stage.label}: ${count}`}
                    />
                  );
                })}
              </div>
              {/* Legende */}
              <div className="flex flex-wrap gap-6">
                {PIPELINE_STAGES.map((stage) => {
                  const count = stats?.pipeline[stage.key] ?? 0;
                  return (
                    <div key={stage.key} className="flex items-center gap-2">
                      <span
                        className={`inline-block h-3 w-3 rounded-full ${stage.color}`}
                      />
                      <span className="text-sm text-gray-400">
                        {stage.label}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Tenant-Tabelle */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Tenant-Übersicht
        </h2>
        <div
          className="overflow-visible rounded-xl"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--gold-border)",
          }}
        >
          {loading && tenants.length === 0 ? (
            <div className="p-10 text-center" style={{ color: "var(--text-muted)" }}>
              Daten werden geladen…
            </div>
          ) : tenants.length === 0 ? (
            <div className="p-10 text-center" style={{ color: "var(--text-muted)" }}>
              Keine Tenants vorhanden
            </div>
          ) : (
            <div className="overflow-visible">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr
                    className="border-b border-purple-500/10 text-xs uppercase tracking-wider"
                    style={{ color: "var(--gold)", opacity: 0.6 }}
                  >
                    <th className="px-6 py-4">Tenant</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">WhatsApp ID</th>
                    <th className="px-6 py-4 text-right">Conversations</th>
                    <th className="px-6 py-4 text-right">Leads</th>
                    <th className="px-6 py-4">Pipeline</th>
                    <th className="px-6 py-4">Letzter Kontakt</th>
                    <th className="px-6 py-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/5">
                  {tenants.map((tenant) => {
                    const ts = getTenantStats(tenant.id);
                    return (
                      <tr
                        key={tenant.id}
                        onClick={() => loadTenantDetail(tenant.id)}
                        className="cursor-pointer transition hover:bg-[rgba(201,168,76,0.04)]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 rounded-lg"
                              style={{
                                backgroundColor: tenant.brandColor + "20",
                                border: `1px solid ${tenant.brandColor}40`,
                              }}
                            >
                              <div className="flex h-full w-full items-center justify-center text-xs font-bold" style={{ color: tenant.brandColor }}>
                                {tenant.brandName.charAt(0)}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-white">
                                {tenant.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {tenant.slug}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              tenant.isActive
                                ? "bg-purple-500/10 text-purple-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                tenant.isActive
                                  ? "bg-purple-400"
                                  : "bg-red-400"
                              }`}
                            />
                            {tenant.isActive ? "Aktiv" : "Inaktiv"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-400">
                          {tenant.whatsappPhoneId}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-white">
                          {tenant._count.conversations}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-white">
                          {tenant._count.leads}
                        </td>
                        <td className="px-6 py-4">
                          <MiniPipeline data={ts?.leadPipeline} />
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {formatDate(ts?.lastContact ?? null)}
                        </td>
                        {/* Aktionen – stopPropagation verhindert Row-Click */}
                        <td className="relative px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === tenant.id ? null : tenant.id);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-[#c9a84c]"
                          >
                            ⋯
                          </button>
                          <AnimatePresence>
                            {openMenuId === tenant.id && (
                              <motion.div
                                ref={menuRef}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute right-0 top-8 z-[9999] w-40 rounded-xl border border-white/[0.06] bg-[#0e0e1a] py-1 shadow-xl"
                              >
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    loadTenantDetail(tenant.id);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-300 transition-colors hover:bg-white/[0.04] hover:text-white"
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setDeleteTarget({ id: tenant.id, name: tenant.name });
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                                >
                                  Löschen
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-medium shadow-xl"
          style={{ background: "var(--surface)", border: "1px solid var(--gold-border)", color: "var(--gold)" }}
        >
          {toast}
        </div>
      )}

      {/* Modal: Tenant löschen */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--gold-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-white">Tenant löschen</h3>
            <p className="mb-6 text-sm text-gray-400">
              Tenant „{deleteTarget.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-gray-400 transition hover:border-white/[0.15] hover:text-white"
                style={{ background: "transparent" }}
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  try {
                    const res = await fetch(`/api/admin/tenants/${deleteTarget.id}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("Fehler beim Löschen");
                    setDeleteTarget(null);
                    setToast("Tenant wurde gelöscht");
                    await loadData();
                  } catch (err) {
                    setToast(err instanceof Error ? err.message : "Fehler beim Löschen");
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
              >
                {deleting ? "Löschen…" : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Neuen Tenant anlegen */}
      {(showCreateForm || createdMagicLink) && (
        <CreateTenantModal
          creating={creating}
          magicLink={createdMagicLink}
          onClose={() => { setShowCreateForm(false); setCreatedMagicLink(null); }}
          onCreate={async (data) => {
            setCreating(true);
            try {
              const res = await fetch("/api/admin/tenants", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Fehler beim Erstellen");
              }
              const result = await res.json();
              // Magic-Link aus API-Response anzeigen
              if (result.dashboardLoginPath) {
                setCreatedMagicLink(
                  `${window.location.origin}${result.dashboardLoginPath}`
                );
              }
              await loadData();
            } catch (err) {
              alert(err instanceof Error ? err.message : "Fehler");
            } finally {
              setCreating(false);
            }
          }}
        />
      )}

      {/* Modal: Tenant-Detail */}
      {(selectedTenant || detailLoading) && !editingTenant && (
        <TenantDetailModal
          tenant={selectedTenant}
          loading={detailLoading}
          onClose={() => setSelectedTenant(null)}
          onEdit={() => setEditingTenant(selectedTenant)}
          onSavePrompt={async (prompt) => {
            if (!selectedTenant) return false;
            try {
              await saveTenant(selectedTenant.id, { systemPrompt: prompt });
              return true;
            } catch { return false; }
          }}
        />
      )}

      {/* Modal: Tenant bearbeiten */}
      {editingTenant && (
        <EditTenantModal
          tenant={editingTenant}
          saving={saving}
          onClose={() => setEditingTenant(null)}
          onSave={(updates) => saveTenant(editingTenant.id, updates)}
        />
      )}
    </div>
  );
}

// ---------- KPI-Karte ----------

function KpiCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--gold-border)",
      }}
    >
      <p
        className="text-xs uppercase tracking-wider"
        style={{
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontSize: "0.7rem",
        }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-3xl font-bold"
        style={{
          fontFamily: "var(--serif)",
          color: highlight ? "var(--gold)" : "var(--text)",
        }}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

// ---------- Mini-Pipeline pro Tenant ----------

function MiniPipeline({ data }: { data?: Record<string, number> }) {
  if (!data) return <span className="text-xs text-gray-600">–</span>;
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <span className="text-xs text-gray-600">–</span>;

  return (
    <div className="flex gap-1">
      {PIPELINE_STAGES.map((stage) => {
        const count = data[stage.key] ?? 0;
        if (count === 0) return null;
        return (
          <span
            key={stage.key}
            className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded px-1 text-[10px] font-medium text-white ${stage.color}/80`}
            title={`${stage.label}: ${count}`}
          >
            {count}
          </span>
        );
      })}
    </div>
  );
}

// ---------- Modal: Tenant erstellen ----------

function CreateTenantModal({
  creating,
  magicLink,
  onClose,
  onCreate,
}: {
  creating: boolean;
  magicLink: string | null;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    slug: string;
    whatsappPhoneId: string;
    brandName: string;
    brandColor: string;
    paddlePlan: string | null;
  }) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    whatsappPhoneId: "",
    brandName: "",
    brandColor: "#7c3aed",
    paddlePlan: null as string | null,
  });

  // Slug automatisch aus Name generieren
  function handleNameChange(name: string) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9äöüß -]/g, "")
      .replace(/[äöüß]/g, (c) =>
        ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" })[c] ?? c
      )
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    setForm((f) => ({ ...f, name, slug }));
  }

  const isValid =
    form.name && form.slug && form.whatsappPhoneId && form.brandName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-2xl p-8"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--gold-border)",
        }}
      >
        {magicLink ? (
          <>
            {/* Erfolgs-Ansicht nach Erstellung */}
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/15">
              <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3
              className="mb-2 text-xl font-semibold text-white"
              style={{ fontFamily: "var(--serif)" }}
            >
              Tenant erstellt
            </h3>
            <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
              Der Dashboard-Login-Link fuer den neuen Mandanten:
            </p>
            <div
              className="mb-4 flex items-center gap-2 rounded-lg p-3 font-mono text-xs break-all"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--gold-border)",
                color: "var(--gold)",
              }}
            >
              <span className="flex-1 select-all">{magicLink}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(magicLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition"
              style={{
                border: "1px solid var(--gold-border)",
                color: copied ? "#8b5cf6" : "var(--gold)",
                background: copied ? "rgba(139,92,246,0.08)" : "transparent",
              }}
            >
              {copied ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Kopiert!
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Link kopieren
                </>
              )}
            </button>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-purple-500"
              >
                Fertig
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Erstellungs-Formular */}
            <h3
              className="mb-6 text-xl font-semibold text-white"
              style={{ fontFamily: "var(--serif)" }}
            >
              Neuen Tenant anlegen
            </h3>
            <div className="space-y-4">
              <Field
                label="Firmenname"
                value={form.name}
                onChange={(v) => handleNameChange(v)}
                placeholder="Muster GmbH"
              />
              <Field
                label="Slug"
                value={form.slug}
                onChange={(v) => setForm((f) => ({ ...f, slug: v }))}
                placeholder="muster-gmbh"
                mono
              />
              <Field
                label="WhatsApp Phone ID"
                value={form.whatsappPhoneId}
                onChange={(v) => setForm((f) => ({ ...f, whatsappPhoneId: v }))}
                placeholder="1234567890"
                mono
              />
              <Field
                label="Markenname"
                value={form.brandName}
                onChange={(v) => setForm((f) => ({ ...f, brandName: v }))}
                placeholder="Muster"
              />
              <div>
                <label
                  className="mb-1 block text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Markenfarbe
                </label>
                <input
                  type="color"
                  value={form.brandColor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, brandColor: e.target.value }))
                  }
                  className="h-10 w-20 cursor-pointer rounded"
                  style={{
                    border: "1px solid var(--gold-border)",
                    background: "var(--surface)",
                  }}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Plan
                </label>
                <select
                  value={form.paddlePlan ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      paddlePlan: e.target.value || null,
                    }))
                  }
                  className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none transition focus:border-[rgba(201,168,76,0.35)]"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--gold-border)",
                  }}
                >
                  <option value="">Starter (kein Web-Widget)</option>
                  <option value="growth_monthly">Growth (Web-Widget aktiv)</option>
                  <option value="professional_monthly">Professional</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm transition"
                style={{
                  border: "1px solid var(--gold-border)",
                  color: "var(--gold)",
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={() => isValid && onCreate(form)}
                disabled={!isValid || creating}
                className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
              >
                {creating ? "Erstelle…" : "Erstellen"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Tenant-Detail Modal ----------

function TenantDetailModal({
  tenant,
  loading,
  onClose,
  onEdit,
  onSavePrompt,
}: {
  tenant: TenantDetail | null;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSavePrompt: (prompt: string) => Promise<boolean>;
}) {
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(tenant?.systemPrompt || "");
  const [promptDirty, setPromptDirty] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [toast, setToast] = useState("");
  const tenantIdRef = useRef(tenant?.id);

  // Sync nur beim echten Tenant-Wechsel (nicht nach Speichern)
  useEffect(() => {
    if (tenant?.id !== tenantIdRef.current) {
      tenantIdRef.current = tenant?.id;
      setEditedPrompt(tenant?.systemPrompt || "");
      setPromptDirty(false);
      setToast("");
    }
  }, [tenant?.id, tenant?.systemPrompt]);

  async function loadPlanPrompt(plan: string) {
    setLoadingPrompt(true);
    setActivePlan(plan);
    try {
      const params = new URLSearchParams({ plan });
      if (selectedBranch) params.set("branch", selectedBranch);
      const res = await fetch(`/api/admin/plan-prompts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEditedPrompt(data.prompt);
        setPromptDirty(true);
      }
    } catch { /* ignore */ }
    finally { setLoadingPrompt(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-8"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--gold-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !tenant ? (
          <div className="py-10 text-center" style={{ color: "var(--text-muted)" }}>
            Lade Tenant-Details…
          </div>
        ) : (
          <>
            {/* Kopfzeile */}
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold"
                  style={{
                    backgroundColor: tenant.brandColor + "20",
                    border: `1px solid ${tenant.brandColor}40`,
                    color: tenant.brandColor,
                  }}
                >
                  {tenant.brandName.charAt(0)}
                </div>
                <div>
                  <h3
                    className="text-xl font-semibold text-white"
                    style={{ fontFamily: "var(--serif)" }}
                  >
                    {tenant.name}
                  </h3>
                  <p className="font-mono text-sm text-gray-500">
                    {tenant.slug}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  tenant.isActive
                    ? "bg-purple-500/10 text-purple-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    tenant.isActive ? "bg-purple-400" : "bg-red-400"
                  }`}
                />
                {tenant.isActive ? "Aktiv" : "Inaktiv"}
              </span>
            </div>

            {/* Einstellungen */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <DetailField label="WhatsApp Phone ID" value={tenant.whatsappPhoneId} mono />
              <DetailField label="Markenname" value={tenant.brandName} />
              <DetailField
                label="Markenfarbe"
                value={
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-4 rounded"
                      style={{ backgroundColor: tenant.brandColor }}
                    />
                    {tenant.brandColor}
                  </span>
                }
              />
              <DetailField label="DSGVO-Aufbewahrung" value={`${tenant.retentionDays} Tage`} />
              <DetailField
                label="Conversations"
                value={String(tenant._count.conversations)}
              />
              <DetailField label="Leads" value={String(tenant._count.leads)} />
              <DetailField
                label="Erstellt am"
                value={formatDate(tenant.createdAt)}
              />
            </div>

            {/* System-Prompt mit Vorlage-Buttons */}
            <div className="mb-6">
              <p
                className="mb-1 text-xs uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                System-Prompt
              </p>
              <p className="mb-2 text-[10px] text-slate-500">
                Lädt die optimierte Vorlage für den jeweiligen Plan – danach noch anpassbar.
              </p>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {(["starter", "growth", "professional"] as const).map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    disabled={loadingPrompt}
                    onClick={() => loadPlanPrompt(plan)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                      activePlan === plan
                        ? "border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.1)] text-[#c9a84c]"
                        : "border-white/[0.08] text-gray-400 hover:border-white/[0.15] hover:text-white"
                    }`}
                    style={{ background: activePlan === plan ? undefined : "transparent" }}
                  >
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}-Vorlage laden
                  </button>
                ))}
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="rounded-lg border border-white/[0.08] bg-transparent px-3 py-1.5 text-xs text-gray-400 outline-none transition hover:border-white/[0.15] hover:text-white focus:border-[rgba(201,168,76,0.3)]"
                >
                  <option value="">Keine Branche</option>
                  <option value="sanitaer">Sanitär &amp; Bad</option>
                  <option value="immobilien">Immobilien</option>
                  <option value="coaching">Coaching</option>
                  <option value="finanzen">Finanzen</option>
                  <option value="education">Bildung</option>
                </select>
              </div>
              <textarea
                value={editedPrompt}
                onChange={(e) => {
                  setEditedPrompt(e.target.value);
                  setPromptDirty(true);
                }}
                rows={5}
                placeholder="Du bist ein freundlicher Assistent…"
                className="w-full resize-y rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-[rgba(201,168,76,0.35)]"
                style={{
                  background: "rgba(14,14,26,0.5)",
                  border: "1px solid var(--gold-border)",
                }}
              />
              {promptDirty && !savingPrompt && (
                <button
                  type="button"
                  onClick={async () => {
                    setSavingPrompt(true);
                    setToast("");
                    try {
                      const ok = await onSavePrompt(editedPrompt);
                      if (ok) {
                        setPromptDirty(false);
                        setToast("Prompt gespeichert");
                      } else {
                        setToast("Fehler beim Speichern");
                      }
                    } catch {
                      setToast("Fehler beim Speichern");
                    } finally {
                      setSavingPrompt(false);
                      setTimeout(() => setToast(""), 3000);
                    }
                  }}
                  className="mt-2 rounded-lg bg-[rgba(201,168,76,0.15)] px-4 py-1.5 text-xs font-medium text-[#c9a84c] transition hover:bg-[rgba(201,168,76,0.25)]"
                  style={{ border: "1px solid rgba(201,168,76,0.3)" }}
                >
                  Prompt speichern
                </button>
              )}
              {savingPrompt && (
                <span className="mt-2 inline-block text-xs text-gray-400">Speichert…</span>
              )}
              {toast && (
                <span className={`mt-2 inline-block rounded-lg px-3 py-1.5 text-xs font-medium ${
                  toast.includes("Fehler")
                    ? "bg-red-500/10 text-red-400"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}>
                  {toast}
                </span>
              )}
            </div>

            {/* Aktionen */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm transition"
                style={{
                  border: "1px solid var(--gold-border)",
                  color: "var(--gold)",
                }}
              >
                Schliessen
              </button>
              <button
                disabled={savingPrompt}
                onClick={async () => {
                  if (!promptDirty) { onClose(); return; }
                  setSavingPrompt(true);
                  setToast("");
                  try {
                    const ok = await onSavePrompt(editedPrompt);
                    if (ok) {
                      setPromptDirty(false);
                      setToast("Prompt gespeichert");
                    } else {
                      setToast("Fehler beim Speichern");
                    }
                  } catch {
                    setToast("Fehler beim Speichern");
                  } finally {
                    setSavingPrompt(false);
                    setTimeout(() => setToast(""), 3000);
                  }
                }}
                className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
              >
                {savingPrompt ? "Speichert…" : "Änderungen speichern"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Detail-Feld ----------

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p
        className="mb-1 text-xs uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p className={`text-sm text-white ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

// ---------- Tenant bearbeiten Modal ----------

function EditTenantModal({
  tenant,
  saving,
  onClose,
  onSave,
}: {
  tenant: TenantDetail;
  saving: boolean;
  onClose: () => void;
  onSave: (updates: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState({
    name: tenant.name,
    brandName: tenant.brandName,
    brandColor: tenant.brandColor,
    retentionDays: String(tenant.retentionDays),
    systemPrompt: tenant.systemPrompt || "",
    isActive: tenant.isActive,
  });
  const [activePlan, setActivePlan] = useState<string | null>(() => {
    const pp = tenant.paddlePlan?.toLowerCase() ?? null;
    if (pp?.includes("professional") || pp?.includes("pro")) return "professional";
    if (pp?.includes("growth")) return "growth";
    return "starter";
  });
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");

  async function loadPlanPrompt(plan: string) {
    setLoadingPrompt(true);
    setActivePlan(plan);
    try {
      const params = new URLSearchParams({ plan });
      if (selectedBranch) params.set("branch", selectedBranch);
      const res = await fetch(`/api/admin/plan-prompts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setForm((f) => ({ ...f, systemPrompt: data.prompt }));
      }
    } catch { /* ignore */ }
    finally { setLoadingPrompt(false); }
  }

  const isValid = form.name && form.brandName && Number(form.retentionDays) > 0;

  // Lokalen Plan-Namen auf DB-Wert mappen
  function planToDbValue(plan: string | null): string | null {
    if (!plan || plan === "starter") return null;
    if (plan === "growth") return "growth_monthly";
    if (plan === "professional") return "professional_monthly";
    return plan;
  }

  function handleSave() {
    if (!isValid) return;
    const updates: Record<string, unknown> = {};
    if (form.name !== tenant.name) updates.name = form.name;
    if (form.brandName !== tenant.brandName) updates.brandName = form.brandName;
    if (form.brandColor !== tenant.brandColor) updates.brandColor = form.brandColor;
    if (Number(form.retentionDays) !== tenant.retentionDays)
      updates.retentionDays = Number(form.retentionDays);
    if (form.systemPrompt !== (tenant.systemPrompt || ""))
      updates.systemPrompt = form.systemPrompt;
    if (form.isActive !== tenant.isActive) updates.isActive = form.isActive;

    // Plan-Aenderung erkennen und als DB-Wert senden
    const newPlanDb = planToDbValue(activePlan);
    const currentPlanDb = tenant.paddlePlan ?? null;
    if (newPlanDb !== currentPlanDb) updates.paddlePlan = newPlanDb;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }
    onSave(updates);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-8"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--gold-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="mb-6 text-xl font-semibold text-white"
          style={{ fontFamily: "var(--serif)" }}
        >
          Tenant bearbeiten – {tenant.name}
        </h3>

        <div className="space-y-4">
          <Field
            label="Firmenname"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Muster GmbH"
          />
          <Field
            label="Markenname"
            value={form.brandName}
            onChange={(v) => setForm((f) => ({ ...f, brandName: v }))}
            placeholder="Muster"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="mb-1 block text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Markenfarbe
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.brandColor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, brandColor: e.target.value }))
                  }
                  className="h-10 w-20 cursor-pointer rounded"
                  style={{
                    border: "1px solid var(--gold-border)",
                    background: "var(--surface)",
                  }}
                />
                <span className="font-mono text-sm text-gray-400">
                  {form.brandColor}
                </span>
              </div>
            </div>
            <Field
              label="DSGVO-Aufbewahrung (Tage)"
              value={form.retentionDays}
              onChange={(v) => setForm((f) => ({ ...f, retentionDays: v }))}
              placeholder="90"
              mono
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Plan
            </label>
            <select
              value={activePlan ?? "starter"}
              onChange={(e) => setActivePlan(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none transition focus:border-[rgba(201,168,76,0.35)]"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--gold-border)",
              }}
            >
              <option value="starter">Starter (kein Web-Widget)</option>
              <option value="growth">Growth (Web-Widget aktiv)</option>
              <option value="professional">Professional</option>
            </select>
          </div>
          <div>
            <label
              className="mb-1 block text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              System-Prompt
            </label>
            <p className="mb-2 text-[10px] text-slate-500">
              Lädt die optimierte Vorlage für den jeweiligen Plan – danach noch anpassbar.
            </p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {(["starter", "growth", "professional"] as const).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  disabled={loadingPrompt}
                  onClick={() => loadPlanPrompt(plan)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    activePlan === plan
                      ? "border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.1)] text-[#c9a84c]"
                      : "border-white/[0.08] text-gray-400 hover:border-white/[0.15] hover:text-white"
                  }`}
                  style={{ background: activePlan === plan ? undefined : "transparent" }}
                >
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}-Vorlage laden
                </button>
              ))}
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="rounded-lg border border-white/[0.08] bg-transparent px-3 py-1.5 text-xs text-gray-400 outline-none transition hover:border-white/[0.15] hover:text-white focus:border-[rgba(201,168,76,0.3)]"
              >
                <option value="">Keine Branche</option>
                <option value="sanitaer">Sanitär & Bad</option>
                <option value="immobilien">Immobilien</option>
                <option value="coaching">Coaching</option>
                <option value="finanzen">Finanzen</option>
                <option value="education">Bildung</option>
              </select>
            </div>
            <textarea
              value={form.systemPrompt}
              onChange={(e) =>
                setForm((f) => ({ ...f, systemPrompt: e.target.value }))
              }
              rows={5}
              placeholder="Du bist ein freundlicher Assistent…"
              className="w-full resize-y rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-[rgba(201,168,76,0.35)]"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--gold-border)",
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                form.isActive ? "bg-emerald-500" : "bg-gray-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  form.isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm text-gray-300">
              {form.isActive ? "Aktiv" : "Inaktiv"}
            </span>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm transition"
            style={{
              border: "1px solid var(--gold-border)",
              color: "var(--gold)",
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
          >
            {saving ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Formularfeld ----------

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label
        className="mb-1 block text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-[rgba(201,168,76,0.35)] ${
          mono ? "font-mono" : ""
        }`}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--gold-border)",
        }}
      />
    </div>
  );
}
