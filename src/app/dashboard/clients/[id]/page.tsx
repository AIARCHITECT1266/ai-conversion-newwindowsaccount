"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Loader2, ArrowLeft, UserCheck, Check, X, Sparkles,
  Phone, Settings, ShieldCheck, TestTube, Rocket,
  FileText, Mail, HelpCircle, Plus, Clock, Copy, ClipboardCheck,
} from "lucide-react";
import { useParams } from "next/navigation";

/* ───────────────────────────── Typen ───────────────────────────── */

interface ClientDetail {
  id: string; companyName: string; contactName: string | null;
  status: string; onboardingStep: number; milestones: string | null;
  notes: string | null; docsGenerated: string | null; createdAt: string;
  lead: {
    id: string; score: number; dealValue: number | null;
    qualification: string; pipelineStatus: string; notes: string | null;
    createdAt: string;
    conversation: { externalId: string; status: string; createdAt: string };
  };
}

interface OnboardingDocs {
  welcomeEmail: { subject: string; body: string };
  projectPlan: { title: string; phases: { name: string; duration: string; tasks: string[] }[] };
  faq: { question: string; answer: string }[];
}

const ONBOARDING_STEPS = [
  { icon: Phone, label: "Kick-off Call", description: "Kennenlerngespräch und Anforderungsaufnahme" },
  { icon: Settings, label: "Bot-Konfiguration", description: "System-Prompt, Brand, Tonalität einrichten" },
  { icon: ShieldCheck, label: "WhatsApp-Verifikation", description: "Meta Business Verifikation und Webhook" },
  { icon: TestTube, label: "Testphase", description: "Bot im Testbetrieb mit internen Leads" },
  { icon: Rocket, label: "Go-Live", description: "Bot produktiv schalten" },
];

function formatDate(d: string) { return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }); }

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

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 rounded-md p-1 text-slate-600 hover:text-[#c9a84c] transition-colors">
      {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/* ───────────────────────────── Haupt-Seite ──────────────────────── */

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { loading: authLoading } = useTenantInfo();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"onboarding" | "docs" | "milestones" | "notes">("onboarding");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [docs, setDocs] = useState<OnboardingDocs | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [milestones, setMilestones] = useState<string[]>([]);
  const [newMilestone, setNewMilestone] = useState("");

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/clients/${clientId}`);
      if (res.ok) {
        const d = await res.json();
        setClient(d.client);
        setNotes(d.client.notes ?? "");
        setCompanyName(d.client.companyName);
        setContactName(d.client.contactName ?? "");
        if (d.client.docsGenerated) {
          try { setDocs(JSON.parse(d.client.docsGenerated)); } catch {}
        }
        if (d.client.milestones) {
          try { setMilestones(JSON.parse(d.client.milestones)); } catch {}
        }
      }
    } finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  async function updateClient(data: Record<string, unknown>) {
    setSaving(true);
    try {
      await fetch(`/api/dashboard/clients/${clientId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      await fetchClient();
    } finally { setSaving(false); }
  }

  async function toggleStep(step: number) {
    if (!client) return;
    const newStep = client.onboardingStep >= step + 1 ? step : step + 1;
    await updateClient({ onboardingStep: newStep });
  }

  async function generateDocs() {
    setDocsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/clients/${clientId}/docs`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      if (res.ok) { const d = await res.json(); setDocs(d.docs); }
    } finally { setDocsLoading(false); }
  }

  async function addMilestone() {
    if (!newMilestone.trim()) return;
    const updated = [...milestones, `${new Date().toLocaleDateString("de-DE")}: ${newMilestone.trim()}`];
    setMilestones(updated);
    setNewMilestone("");
    await updateClient({ milestones: updated });
  }

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center" style={{ background: "#07070d" }}><Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" /></div>;
  }

  if (!client) {
    return <div className="flex min-h-screen items-center justify-center text-white" style={{ background: "#07070d" }}><p className="text-slate-500">Client nicht gefunden</p></div>;
  }

  const pct = Math.round((client.onboardingStep / 5) * 100);

  return (
    <div className="relative min-h-screen text-white" style={{ background: "#07070d", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <style>{`:root{--bg:#07070d;--surface:#0e0e1a;--gold:#c9a84c;--gold-border:rgba(201,168,76,0.1);--purple:#8b5cf6;--serif:Georgia,serif}`}</style>

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[5%] h-[600px] w-[600px] rounded-full bg-[rgba(201,168,76,0.05)] blur-[160px]" />
      </div>

      <header className="relative z-10 backdrop-blur-md" style={{ borderBottom: "1px solid var(--gold-border)", background: "rgba(7,7,13,0.8)" }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/dashboard/clients" className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-2.5 py-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Clients
            </a>
            <div>
              <h1 className="text-lg font-semibold text-white" style={{ fontFamily: "Georgia, serif" }}>{client.companyName}</h1>
              <p className="text-xs text-slate-500">{client.contactName ?? "Kein Ansprechpartner"} • Score {client.lead.score}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
              client.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" :
              client.status === "ONBOARDING" ? "bg-[#c9a84c]/10 text-[#c9a84c]" :
              "bg-slate-500/10 text-slate-400"
            }`}>{client.status}</span>
            <span className="text-xs text-[#c9a84c] font-semibold">{pct}%</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-6">
        {/* Client-Info editierbar */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            <label className="mb-1 block text-[10px] text-slate-500">Firmenname</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)}
              onBlur={() => companyName !== client.companyName && updateClient({ companyName })}
              className="w-full bg-transparent text-sm text-white focus:outline-none" />
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            <label className="mb-1 block text-[10px] text-slate-500">Ansprechpartner</label>
            <input value={contactName} onChange={e => setContactName(e.target.value)}
              onBlur={() => contactName !== (client.contactName ?? "") && updateClient({ contactName: contactName || null })}
              placeholder="Name eingeben…"
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none" />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1">
          {([
            { key: "onboarding" as const, label: "Onboarding", icon: Rocket },
            { key: "docs" as const, label: "KI-Dokumente", icon: FileText },
            { key: "milestones" as const, label: "Meilensteine", icon: Clock },
            { key: "notes" as const, label: "Notizen", icon: FileText },
          ]).map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-[rgba(201,168,76,0.15)] text-[#c9a84c] border border-[rgba(201,168,76,0.3)]"
                    : "text-slate-500 border border-transparent hover:text-slate-300"
                }`}>
                <Icon className="h-3.5 w-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Onboarding-Checkliste */}
        {activeTab === "onboarding" && (
          <div className="space-y-3">
            {ONBOARDING_STEPS.map((step, i) => {
              const Icon = step.icon;
              const done = client.onboardingStep > i;
              const current = client.onboardingStep === i;
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  onClick={() => toggleStep(i)}
                  className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                    done ? "border-emerald-500/20 bg-emerald-500/[0.03]" :
                    current ? "border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.03)]" :
                    "border-white/[0.06] bg-white/[0.015] opacity-60"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    done ? "bg-emerald-500/15" : current ? "bg-[#c9a84c]/15" : "bg-white/[0.06]"
                  }`}>
                    {done ? <Check className="h-5 w-5 text-emerald-400" /> : <Icon className={`h-5 w-5 ${current ? "text-[#c9a84c]" : "text-slate-500"}`} />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${done ? "text-emerald-400" : current ? "text-white" : "text-slate-400"}`}>
                      Schritt {i + 1}: {step.label}
                    </p>
                    <p className="text-xs text-slate-500">{step.description}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    done ? "bg-emerald-500/10 text-emerald-400" : current ? "bg-[#c9a84c]/10 text-[#c9a84c]" : "bg-white/[0.04] text-slate-600"
                  }`}>{done ? "Erledigt" : current ? "Aktuell" : "Ausstehend"}</span>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* KI-Dokumente */}
        {activeTab === "docs" && (
          <div>
            {!docs && !docsLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-10 w-10 text-[#c9a84c] mb-3" />
                <p className="text-sm text-slate-300 mb-1">KI-Onboarding-Dokumente</p>
                <p className="text-xs text-slate-500 mb-5 max-w-xs text-center">Claude erstellt Begrüßungsmail, Projektplan und FAQ aus dem Gesprächsverlauf</p>
                <button onClick={generateDocs}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a84c] to-purple-500 px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity">
                  <Sparkles className="h-4 w-4" /> Dokumente generieren
                </button>
              </div>
            )}

            {docsLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c] mb-3" />
                <p className="text-sm text-slate-300">Claude erstellt Onboarding-Dokumente…</p>
              </div>
            )}

            {docs && !docsLoading && (
              <div className="space-y-5">
                {/* Begrüßungsmail */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#c9a84c]" /><span className="text-xs font-semibold text-slate-300">Begrüßungsmail</span></div>
                    <CopyBtn text={`Betreff: ${docs.welcomeEmail.subject}\n\n${docs.welcomeEmail.body}`} />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Betreff: <span className="text-white font-medium">{docs.welcomeEmail.subject}</span></p>
                    <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">{docs.welcomeEmail.body}</p>
                  </div>
                </div>

                {/* Projektplan */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
                    <Rocket className="h-4 w-4 text-purple-400" /><span className="text-xs font-semibold text-slate-300">{docs.projectPlan.title}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {docs.projectPlan.phases.map((phase, i) => (
                      <div key={i} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-200">Phase {i + 1}: {phase.name}</span>
                          <span className="text-[10px] text-slate-500">{phase.duration}</span>
                        </div>
                        <ul className="space-y-1">
                          {phase.tasks.map((task, j) => (
                            <li key={j} className="flex items-start gap-2 text-xs text-slate-400">
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-purple-400/60" />{task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FAQ */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
                    <HelpCircle className="h-4 w-4 text-emerald-400" /><span className="text-xs font-semibold text-slate-300">FAQ</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {docs.faq.map((item, i) => (
                      <div key={i} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                        <p className="text-sm font-medium text-slate-200 mb-1">{item.question}</p>
                        <p className="text-xs text-slate-400">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={generateDocs}
                  className="text-xs text-slate-500 hover:text-[#c9a84c] transition-colors">Neu generieren</button>
              </div>
            )}
          </div>
        )}

        {/* Meilensteine */}
        {activeTab === "milestones" && (
          <div>
            <div className="mb-4 flex gap-2">
              <input value={newMilestone} onChange={e => setNewMilestone(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addMilestone()}
                placeholder="Meilenstein hinzufügen…"
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none" />
              <button onClick={addMilestone} disabled={!newMilestone.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-40 transition-opacity">
                <Plus className="h-4 w-4" /> Hinzufügen
              </button>
            </div>

            {milestones.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-600">Noch keine Meilensteine</p>
            ) : (
              <div className="relative border-l border-white/[0.08] pl-6 space-y-4">
                {milestones.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="relative">
                    <div className="absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full bg-[#0e0e1a] border border-white/[0.08]">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <p className="text-sm text-slate-300">{m}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notizen */}
        {activeTab === "notes" && (
          <div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={10}
              placeholder="Notizen zum Client…"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-[rgba(201,168,76,0.3)] focus:outline-none" />
            <div className="mt-3 flex justify-end">
              <button onClick={() => updateClient({ notes })} disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Speichern
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
