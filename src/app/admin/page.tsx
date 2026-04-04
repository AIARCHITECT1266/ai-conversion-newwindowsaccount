"use client";

import { useEffect, useState, useCallback } from "react";

// ---------- Typen ----------

interface Tenant {
  id: string;
  name: string;
  slug: string;
  whatsappPhoneId: string;
  brandName: string;
  brandColor: string;
  retentionDays: number;
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
  const [selectedTenant, setSelectedTenant] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantDetail | null>(null);
  const [saving, setSaving] = useState(false);

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
    <div className="min-h-screen bg-navy-950 p-6 md:p-10">
      {/* Header */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-purple-300/60">
            AI Conversion – Tenant-Verwaltung
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="rounded-lg border border-purple-500/20 bg-navy-800 px-4 py-2 text-sm text-purple-300 transition hover:border-purple-500/40 hover:bg-navy-700 disabled:opacity-50"
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
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
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
        <div className="glass-card rounded-xl bg-navy-900/60 p-6">
          {totalLeads === 0 ? (
            <p className="text-sm text-purple-300/40">
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
        <div className="glass-card overflow-hidden rounded-xl bg-navy-900/60">
          {loading && tenants.length === 0 ? (
            <div className="p-10 text-center text-purple-300/40">
              Daten werden geladen…
            </div>
          ) : tenants.length === 0 ? (
            <div className="p-10 text-center text-purple-300/40">
              Keine Tenants vorhanden
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-purple-500/10 text-xs uppercase tracking-wider text-purple-300/50">
                    <th className="px-6 py-4">Tenant</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">WhatsApp ID</th>
                    <th className="px-6 py-4 text-right">Conversations</th>
                    <th className="px-6 py-4 text-right">Leads</th>
                    <th className="px-6 py-4">Pipeline</th>
                    <th className="px-6 py-4">Letzter Kontakt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/5">
                  {tenants.map((tenant) => {
                    const ts = getTenantStats(tenant.id);
                    return (
                      <tr
                        key={tenant.id}
                        onClick={() => loadTenantDetail(tenant.id)}
                        className="cursor-pointer transition hover:bg-purple-500/5"
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
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                tenant.isActive
                                  ? "bg-emerald-400"
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Modal: Neuen Tenant anlegen */}
      {showCreateForm && (
        <CreateTenantModal
          creating={creating}
          onClose={() => setShowCreateForm(false)}
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
              setShowCreateForm(false);
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
    <div className="glass-card rounded-xl bg-navy-900/60 p-5">
      <p className="text-xs uppercase tracking-wider text-purple-300/50">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-bold ${
          highlight ? "text-emerald-400" : "text-white"
        }`}
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
  onClose,
  onCreate,
}: {
  creating: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    slug: string;
    whatsappPhoneId: string;
    brandName: string;
    brandColor: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    whatsappPhoneId: "",
    brandName: "",
    brandColor: "#7c3aed",
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
      <div className="glass-card w-full max-w-lg rounded-2xl bg-navy-900 p-8">
        <h3 className="mb-6 text-xl font-semibold text-white">
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
            <label className="mb-1 block text-xs text-purple-300/50">
              Markenfarbe
            </label>
            <input
              type="color"
              value={form.brandColor}
              onChange={(e) =>
                setForm((f) => ({ ...f, brandColor: e.target.value }))
              }
              className="h-10 w-20 cursor-pointer rounded border border-purple-500/20 bg-navy-800"
            />
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-purple-500/20 px-4 py-2 text-sm text-gray-400 transition hover:border-purple-500/40 hover:text-white"
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
}: {
  tenant: TenantDetail | null;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-2xl rounded-2xl bg-navy-900 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !tenant ? (
          <div className="py-10 text-center text-purple-300/40">
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
                  <h3 className="text-xl font-semibold text-white">
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
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    tenant.isActive ? "bg-emerald-400" : "bg-red-400"
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

            {/* System-Prompt */}
            <div className="mb-6">
              <p className="mb-2 text-xs uppercase tracking-wider text-purple-300/50">
                System-Prompt
              </p>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-purple-500/10 bg-navy-800/50 p-4 text-sm leading-relaxed text-gray-300">
                {tenant.systemPrompt || (
                  <span className="italic text-gray-600">Kein System-Prompt definiert</span>
                )}
              </div>
            </div>

            {/* Aktionen */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-purple-500/20 px-4 py-2 text-sm text-gray-400 transition hover:border-purple-500/40 hover:text-white"
              >
                Schliessen
              </button>
              <button
                onClick={onEdit}
                className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-purple-500"
              >
                Bearbeiten
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
      <p className="mb-1 text-xs uppercase tracking-wider text-purple-300/50">
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

  const isValid = form.name && form.brandName && Number(form.retentionDays) > 0;

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
        className="glass-card w-full max-w-2xl rounded-2xl bg-navy-900 p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-6 text-xl font-semibold text-white">
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
              <label className="mb-1 block text-xs text-purple-300/50">
                Markenfarbe
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.brandColor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, brandColor: e.target.value }))
                  }
                  className="h-10 w-20 cursor-pointer rounded border border-purple-500/20 bg-navy-800"
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
            <label className="mb-1 block text-xs text-purple-300/50">
              System-Prompt
            </label>
            <textarea
              value={form.systemPrompt}
              onChange={(e) =>
                setForm((f) => ({ ...f, systemPrompt: e.target.value }))
              }
              rows={5}
              placeholder="Du bist ein freundlicher Assistent…"
              className="w-full resize-y rounded-lg border border-purple-500/20 bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-purple-500/50"
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
            className="rounded-lg border border-purple-500/20 px-4 py-2 text-sm text-gray-400 transition hover:border-purple-500/40 hover:text-white"
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
      <label className="mb-1 block text-xs text-purple-300/50">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-purple-500/20 bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-purple-500/50 ${
          mono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}
