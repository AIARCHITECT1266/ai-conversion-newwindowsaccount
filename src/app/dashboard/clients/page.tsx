"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Loader2, RefreshCw, ArrowLeft, UserCheck, Users,
  CheckCircle2, PauseCircle, PlayCircle, Euro,
} from "lucide-react";

/* ───────────────────────────── Typen ───────────────────────────── */

interface ClientItem {
  id: string; companyName: string; contactName: string | null;
  status: "ONBOARDING" | "ACTIVE" | "PAUSED"; onboardingStep: number;
  createdAt: string;
  lead: { score: number; dealValue: number | null; pipelineStatus: string };
}

/* ───────────────────────────── Hilfs ────────────────────────────── */

function formatDate(d: string) { return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }); }
function formatCurrency(v: number) { return v.toLocaleString("de-DE", { style: "currency", currency: "EUR" }); }

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  ONBOARDING: { label: "Onboarding", color: "bg-[#c9a84c]/10 text-[#c9a84c]", icon: PlayCircle },
  ACTIVE: { label: "Aktiv", color: "bg-emerald-500/10 text-emerald-400", icon: CheckCircle2 },
  PAUSED: { label: "Pausiert", color: "bg-slate-500/10 text-slate-400", icon: PauseCircle },
};

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

/* ───────────────────────────── Haupt-Seite ──────────────────────── */

export default function ClientsPage() {
  const { tenantName, loading: authLoading } = useTenantInfo();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/clients");
      if (res.ok) { const d = await res.json(); setClients(d.clients); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const totalValue = clients.reduce((s, c) => s + (c.lead.dealValue ?? 0), 0);

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

      <header className="relative z-10 backdrop-blur-md" style={{ borderBottom: "1px solid var(--gold-border)", background: "rgba(7,7,13,0.8)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs text-slate-400 hover:border-[rgba(201,168,76,0.2)] hover:text-[#c9a84c] transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </a>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <UserCheck className="h-5 w-5 text-emerald-400" />
              <span style={{ fontFamily: "Georgia, serif", color: "#c9a84c" }}>Clients</span>
              <span className="text-sm font-normal text-slate-500">• {tenantName}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {totalValue > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(201,168,76,0.15)] bg-[rgba(201,168,76,0.05)] px-3 py-1.5">
                <Euro className="h-3.5 w-3.5 text-[#c9a84c]" />
                <span className="text-sm font-semibold text-[#c9a84c]">{formatCurrency(totalValue)}</span>
              </div>
            )}
            <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
              {clients.length} Client{clients.length !== 1 ? "s" : ""}
            </span>
            <button onClick={() => { setLoading(true); fetchClients(); }}
              className="rounded-lg border border-white/[0.06] p-1.5 text-slate-500 hover:bg-white/[0.04] hover:text-[#c9a84c] transition-colors">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" /></div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <UserCheck className="h-12 w-12 text-slate-700 mb-4" />
            <p className="text-sm text-slate-500">Noch keine Clients</p>
            <p className="mt-1 text-xs text-slate-600">Clients werden automatisch erstellt wenn ein Lead auf "Gewonnen" gesetzt wird</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((c, i) => {
              const cfg = STATUS_CONFIG[c.status];
              const Icon = cfg.icon;
              const pct = Math.round((c.onboardingStep / 5) * 100);
              return (
                <motion.a
                  key={c.id} href={`/dashboard/clients/${c.id}`}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 transition-all hover:border-[rgba(201,168,76,0.2)] hover:bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">{c.companyName}</h3>
                      {c.contactName && <p className="mt-0.5 text-xs text-slate-500">{c.contactName}</p>}
                    </div>
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                      <Icon className="h-3 w-3" /> {cfg.label}
                    </span>
                  </div>

                  {/* Onboarding-Fortschritt */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500">Onboarding</span>
                      <span className="text-[10px] font-semibold text-[#c9a84c]">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-[#c9a84c] to-purple-500"}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-600">{c.onboardingStep}/5 Schritte</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Seit {formatDate(c.createdAt)}</span>
                    {c.lead.dealValue && <span className="text-[#c9a84c]">{formatCurrency(c.lead.dealValue)}</span>}
                  </div>
                </motion.a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
