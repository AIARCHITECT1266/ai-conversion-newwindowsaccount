"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import {
  Bot, Kanban, Megaphone, UserCheck, MessageSquare, Target,
  TrendingUp, Send, Brain, Sparkles, BarChart3, CalendarClock,
  QrCode, FileSignature, Rocket, Shield, Check, ArrowRight,
  Building2, Hammer, GraduationCap, Briefcase, ShoppingCart,
  SlidersHorizontal, Euro, Clock, Globe, Lock,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   ANIMIERTER COUNTER
   ═══════════════════════════════════════════════════════ */

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1200;
    const start = performance.now();
    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [isInView, target]);

  return <span ref={ref}>{display.toLocaleString("de-DE")}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════
   ROI-RECHNER (identisch zur Pricing-Page)
   ═══════════════════════════════════════════════════════ */

function RoiCalculator() {
  const [avgDeal, setAvgDeal] = useState(2500);
  const [leadsPerMonth, setLeadsPerMonth] = useState(50);
  const [currentRate, setCurrentRate] = useState(5);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const boostedRate = Math.min(currentRate * 1.4, 100);
  const currentRevenue = leadsPerMonth * (currentRate / 100) * avgDeal;
  const boostedRevenue = leadsPerMonth * (boostedRate / 100) * avgDeal;
  const monthlyGain = boostedRevenue - currentRevenue;

  const plans = [
    { name: "Starter", monthly: 497, setup: 697 },
    { name: "Growth", monthly: 1297, setup: 1297 },
    { name: "Professional", monthly: 2497, setup: 1997 },
  ];

  function Slider({ label, value, onChange, min, max, step, unit, format }: {
    label: string; value: number; onChange: (v: number) => void;
    min: number; max: number; step: number; unit: string; format?: (v: number) => string;
  }) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">{label}</span>
          <span className="text-sm font-semibold text-white">{format ? format(value) : value.toLocaleString("de-DE")}{unit}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, #c9a84c 0%, #8b5cf6 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.06) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.06) 100%)` }} />
      </div>
    );
  }

  return (
    <section ref={ref} id="roi" className="relative z-10 mx-auto max-w-5xl px-6 py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-10">
        <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#c9a84c]">Return on Investment</p>
        <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
          Berechnen Sie Ihren <span className="text-[#c9a84c]">ROI</span>
        </h2>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.2 }} className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.06] p-6 space-y-6" style={{ background: "#0e0e1a" }}>
          <div className="flex items-center gap-2 mb-2"><SlidersHorizontal className="h-4 w-4 text-[#c9a84c]" /><span className="text-sm font-semibold text-slate-200">Ihre Kennzahlen</span></div>
          <Slider label="Ø Auftragswert" value={avgDeal} onChange={setAvgDeal} min={500} max={50000} step={500} unit=" EUR" format={v => v.toLocaleString("de-DE")} />
          <Slider label="Leads pro Monat" value={leadsPerMonth} onChange={setLeadsPerMonth} min={10} max={500} step={10} unit="" />
          <Slider label="Aktuelle Conversion-Rate" value={currentRate} onChange={setCurrentRate} min={1} max={30} step={1} unit="%" />
        </div>

        <div className="rounded-2xl border border-[rgba(201,168,76,0.15)] p-6" style={{ background: "rgba(201,168,76,0.02)" }}>
          <div className="flex items-center gap-2 mb-5"><TrendingUp className="h-4 w-4 text-[#c9a84c]" /><span className="text-sm font-semibold text-slate-200">Ihr Potenzial</span></div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
              <p className="text-[10px] text-slate-500 mb-1">Aktuell ({currentRate}%)</p>
              <p className="text-xl font-bold text-slate-400" style={{ fontFamily: "Georgia, serif" }}>{currentRevenue.toLocaleString("de-DE", { maximumFractionDigits: 0 })} EUR</p>
            </div>
            <div className="rounded-xl border border-[rgba(201,168,76,0.2)] bg-[rgba(201,168,76,0.03)] p-4 text-center">
              <p className="text-[10px] text-[#c9a84c]/60 mb-1">Mit AI Conversion ({boostedRate.toFixed(1)}%)</p>
              <p className="text-xl font-bold text-[#c9a84c]" style={{ fontFamily: "Georgia, serif" }}>{boostedRevenue.toLocaleString("de-DE", { maximumFractionDigits: 0 })} EUR</p>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-4 text-center mb-5">
            <p className="text-[10px] text-emerald-400/60 mb-1">Mehreinnahmen pro Monat</p>
            <p className="text-3xl font-bold text-emerald-400" style={{ fontFamily: "Georgia, serif" }}>+{monthlyGain.toLocaleString("de-DE", { maximumFractionDigits: 0 })} EUR</p>
          </div>
          <p className="text-[10px] text-slate-500 mb-2">Amortisierung (Setup + 1. Monat):</p>
          <div className="space-y-2">
            {plans.map((plan) => {
              const total = plan.monthly + plan.setup;
              const days = monthlyGain > 0 ? Math.ceil((total / monthlyGain) * 30) : 999;
              return (
                <div key={plan.name} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                  <span className="text-xs text-slate-300">{plan.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${days <= 30 ? "bg-emerald-500/10 text-emerald-400" : days <= 90 ? "bg-[#c9a84c]/10 text-[#c9a84c]" : "bg-slate-500/10 text-slate-400"}`}>
                    {days > 365 ? ">365" : days} Tage
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   HAUPTSEITE
   ═══════════════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#07070d] text-white" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {/* Slider-Thumb Styles */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: linear-gradient(135deg, #c9a84c, #8b5cf6); border: 2px solid #0e0e1a; cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: linear-gradient(135deg, #c9a84c, #8b5cf6); border: 2px solid #0e0e1a; cursor: pointer;
        }
      `}</style>

      <Navigation />

      {/* Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[700px] w-[900px] rounded-full bg-purple-500/[0.04] blur-[160px]" />
        <div className="absolute right-[10%] top-[60%] h-[400px] w-[400px] rounded-full bg-[#c9a84c]/[0.03] blur-[120px]" />
      </div>

      {/* ═══════ 1. HERO ═══════ */}
      <section className="relative z-10 pt-36 pb-28 sm:pt-40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Links: Copy */}
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#c9a84c]/15 bg-[#c9a84c]/[0.05] px-4 py-1.5">
                  <Shield className="h-3.5 w-3.5 text-[#c9a84c]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#c9a84c]/80">DSGVO &bull; Frankfurt &bull; Made in Germany</span>
                </div>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl font-bold leading-tight sm:text-5xl" style={{ fontFamily: "Georgia, serif" }}>
                <span className="bg-gradient-to-r from-[#c9a84c] via-[#e8d5a0] to-[#c9a84c] bg-clip-text text-transparent">Das Revenue Operating System</span>
                <br /><span className="text-white">fuer DACH-Unternehmen</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
                className="mt-4 text-xl text-slate-300 leading-relaxed" style={{ fontFamily: "Georgia, serif" }}>
                Ihr Vertrieb arbeitet 24/7 &ndash; auch wenn Sie schlafen.
              </motion.p>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-3 max-w-lg text-sm text-slate-400 leading-relaxed">
                Von der ersten WhatsApp-Nachricht bis zum gewonnenen Kunden &ndash; vollautomatisch.
                Sales Agent, CRM Pipeline, Marketing Suite und Client Portal in einer Plattform.
              </motion.p>

              {/* Garantie-Box */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
                className="mt-6 inline-flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-5 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                  <Shield className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-400">100 qualifizierte Leads in 30 Tagen</p>
                  <p className="text-[11px] text-emerald-400/60">oder Geld zurueck &ndash; garantiert</p>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-8 flex flex-wrap gap-4">
                <a href="mailto:hello@ai-conversion.ai?subject=Demo%20Anfrage"
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/25 transition-all hover:bg-purple-500">
                  Demo ansehen <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#roi" className="flex items-center gap-2 rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/[0.05] px-6 py-3 text-sm font-semibold text-[#c9a84c] transition-all hover:bg-[#c9a84c]/[0.1]">
                  ROI berechnen <Euro className="h-4 w-4" />
                </a>
              </motion.div>
            </div>

            {/* Rechts: Animierte Metriken-Card */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
              className="rounded-2xl border border-[rgba(201,168,76,0.15)] bg-[#0e0e1a] p-6 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium text-slate-400">Live Dashboard</span>
                </div>
                <span className="text-[10px] text-slate-600">AI Conversion</span>
              </div>

              {/* KPI-Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-slate-500">Neue Leads heute</p>
                  <p className="text-2xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}><AnimatedNumber target={12} /></p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-slate-500">Ø Lead-Score</p>
                  <p className="text-2xl font-bold text-emerald-400" style={{ fontFamily: "Georgia, serif" }}><AnimatedNumber target={78} /></p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-slate-500">Pipeline-Wert</p>
                  <p className="text-2xl font-bold text-[#c9a84c]" style={{ fontFamily: "Georgia, serif" }}><AnimatedNumber target={47} suffix="k" /></p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[10px] text-slate-500">Conversion-Rate</p>
                  <p className="text-2xl font-bold text-purple-400" style={{ fontFamily: "Georgia, serif" }}><AnimatedNumber target={34} suffix="%" /></p>
                </div>
              </div>

              {/* Mini-Pipeline */}
              <div className="space-y-2">
                {[
                  { name: "M. Schneider", score: 94, status: "Termin", color: "bg-purple-500" },
                  { name: "A. Fischer", score: 87, status: "Qualifiziert", color: "bg-blue-500" },
                  { name: "T. Krueger", score: 72, status: "Angebot", color: "bg-[#c9a84c]" },
                ].map((lead) => (
                  <div key={lead.name} className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-bold text-slate-400">
                      {lead.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate">{lead.name}</p>
                      <div className="mt-0.5 h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                        <div className={`h-full rounded-full ${lead.color}`} style={{ width: `${lead.score}%` }} />
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/[0.04] px-2 py-0.5 text-[9px] text-slate-500">{lead.status}</span>
                    <span className="shrink-0 text-xs font-semibold text-emerald-400">{lead.score}</span>
                  </div>
                ))}
              </div>

              {/* Stats-Footer */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[
                  { value: "43", label: "Routes" },
                  { value: "7", label: "Module" },
                  { value: "24/7", label: "Online" },
                  { value: "AES", label: "256-bit" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-xs font-bold text-white">{s.value}</p>
                    <p className="text-[9px] text-slate-600">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ 2. PRODUKT-MODULE ═══════ */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-28">
        <div className="text-center mb-12">
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#c9a84c]">Plattform</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
            Vier Module. <span className="text-[#c9a84c]">Ein System.</span>
          </h2>
          <p className="mt-3 text-sm text-slate-400 max-w-xl mx-auto">Jedes Modul arbeitet nahtlos zusammen &ndash; vom Erstkontakt bis zur Kundenbetreuung.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Bot, color: "text-emerald-400", border: "border-emerald-500/15", bg: "bg-emerald-500/[0.03]", name: "Sales Agent", desc: "WhatsApp KI-Bot, Lead-Scoring, Follow-Up Scheduler, Multi-Sprachen", tag: "Leads generieren" },
            { icon: Kanban, color: "text-purple-400", border: "border-purple-500/15", bg: "bg-purple-500/[0.03]", name: "CRM Pipeline", desc: "Kanban-Board, Predictive Score, AI-Analyse, Proposal Generator", tag: "Leads konvertieren" },
            { icon: Megaphone, color: "text-[#c9a84c]", border: "border-[rgba(201,168,76,0.15)]", bg: "bg-[rgba(201,168,76,0.03)]", name: "Marketing Suite", desc: "Kampagnen-Tracking, A/B Testing, Broadcast, AI Content Creator", tag: "Leads skalieren" },
            { icon: UserCheck, color: "text-blue-400", border: "border-blue-500/15", bg: "bg-blue-500/[0.03]", name: "Client Portal", desc: "Onboarding-Checkliste, KI-Dokumente, Meilensteine, Notizen", tag: "Kunden binden" },
          ].map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div key={mod.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`rounded-2xl border ${mod.border} ${mod.bg} p-6 transition-all hover:scale-[1.02]`}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${mod.bg}`}>
                  <Icon className={`h-6 w-6 ${mod.color}`} />
                </div>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{mod.tag}</p>
                <h3 className="mt-1 text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{mod.name}</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{mod.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ═══════ SOCIAL PROOF ═══════ */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#c9a84c]">Ergebnisse</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
            Das erreichen unsere <span className="text-[#c9a84c]">Kunden</span>
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Building2, color: "text-[#c9a84c]", border: "border-[rgba(201,168,76,0.15)]", bg: "bg-[rgba(201,168,76,0.03)]",
              metric: "+47", unit: "Leads/Monat", branche: "Immobilienmakler", desc: "Von 12 auf 59 qualifizierte Anfragen pro Monat. Besichtigungstermine werden automatisch gebucht." },
            { icon: Hammer, color: "text-purple-400", border: "border-purple-500/15", bg: "bg-purple-500/[0.03]",
              metric: "3,4x", unit: "Conversion", branche: "Handwerksbetrieb", desc: "Conversion-Rate von 4% auf 13,6% gesteigert. Kein verpasster Auftrag mehr durch 24/7 Erreichbarkeit." },
            { icon: GraduationCap, color: "text-emerald-400", border: "border-emerald-500/15", bg: "bg-emerald-500/[0.03]",
              metric: "-80%", unit: "Qualifizierungszeit", branche: "Business Coach", desc: "Erstgespraeche nur noch mit vorqualifizierten Interessenten. 4 Stunden pro Woche eingespart." },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.branche} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`rounded-2xl border ${item.border} ${item.bg} p-6`}>
                <Icon className={`h-8 w-8 ${item.color} mb-4`} />
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-4xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{item.metric}</span>
                  <span className="text-sm text-slate-400 mb-1">{item.unit}</span>
                </div>
                <p className={`text-xs font-semibold ${item.color} mb-2`}>{item.branche}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ═══════ 3. FEATURE DEEP-DIVE ═══════ */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-28">
        <div className="text-center mb-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#c9a84c]">Features</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
            Alles was Ihr Vertrieb <span className="text-[#c9a84c]">braucht</span>
          </h2>
        </div>

        {[
          {
            title: "Sales Agent", color: "text-emerald-400", icon: Bot,
            features: [
              { icon: MessageSquare, name: "WhatsApp KI-Gespraeche", desc: "Claude fuehrt empathische Verkaufsgespraeche in der Sie-Form, 24/7, in 50+ Sprachen" },
              { icon: Target, name: "Lead-Scoring 0-100", desc: "GPT-4o bewertet jeden Lead automatisch nach Kaufbereitschaft, Budget und Dringlichkeit" },
              { icon: Send, name: "Follow-Up Scheduler", desc: "3 Eskalationsstufen (24h/48h/72h) senden automatisch Nachfass-Nachrichten" },
              { icon: Shield, name: "DSGVO-konform", desc: "AES-256 Verschluesselung, Consent-Tracking, automatische Datenloeschung" },
            ],
          },
          {
            title: "CRM Pipeline", color: "text-purple-400", icon: Kanban,
            features: [
              { icon: Kanban, name: "5-Spalten Kanban", desc: "Drag & Drop von Neu bis Gewonnen mit Deal-Wert Tracking pro Spalte" },
              { icon: Brain, name: "Predictive Score", desc: "Claude berechnet Abschlusswahrscheinlichkeit aus 8 Metriken mit Next-Best-Action" },
              { icon: Sparkles, name: "AI Lead-Analyse", desc: "Interesse, Budget-Signal, Kaufbereitschaft, Einwaende und empfohlener naechster Schritt" },
              { icon: FileSignature, name: "Proposal Generator", desc: "Massgeschneidertes Angebot + Begleit-E-Mail aus Chat-Historie, als HTML downloadbar" },
            ],
          },
          {
            title: "Marketing Suite", color: "text-[#c9a84c]", icon: Megaphone,
            features: [
              { icon: Megaphone, name: "Kampagnen-Tracking", desc: "Tracking-Links, Funnel-Attribution, KPI-Dashboard und Pipeline-Wert pro Kampagne" },
              { icon: BarChart3, name: "A/B Testing", desc: "WhatsApp-Opener Varianten testen, automatischer Gewinner-Vorschlag nach 14 Tagen" },
              { icon: Sparkles, name: "AI Content Creator", desc: "Claude generiert WhatsApp-Opener, Ad Copy, E-Mails, Social Posts und Follow-Up Sequenzen" },
              { icon: QrCode, name: "QR-Codes & Broadcast", desc: "Tracking-QR-Codes als PNG/Druckvorlage + Segment-basierter WhatsApp-Broadcast" },
            ],
          },
          {
            title: "Client Portal", color: "text-blue-400", icon: UserCheck,
            features: [
              { icon: Rocket, name: "5-Schritte Onboarding", desc: "Kick-off, Bot-Config, WhatsApp-Verifikation, Testphase, Go-Live mit Klick-Checkliste" },
              { icon: Sparkles, name: "KI-Onboarding-Dokumente", desc: "Claude generiert Begruessungsmail, Projektplan und FAQ aus dem Gespraechsverlauf" },
              { icon: Clock, name: "Meilenstein-Tracker", desc: "Manuelle Timeline mit Datum, automatische Status-Aenderung bei Abschluss" },
              { icon: Bot, name: "Auto-Client-Erstellung", desc: "Wird automatisch angelegt wenn ein Lead auf Gewonnen gesetzt wird" },
            ],
          },
        ].map((module, mi) => {
          const ModIcon = module.icon;
          const isLeft = mi % 2 === 0;
          return (
            <motion.div key={module.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5 }}
              className={`mb-16 flex flex-col gap-8 lg:flex-row ${!isLeft ? "lg:flex-row-reverse" : ""} items-center`}>
              {/* Text */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
                    <ModIcon className={`h-5 w-5 ${module.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{module.title}</h3>
                </div>
                <div className="space-y-4">
                  {module.features.map((f) => {
                    const FIcon = f.icon;
                    return (
                      <div key={f.name} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                          <FIcon className={`h-4 w-4 ${module.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{f.name}</p>
                          <p className="text-xs text-slate-500">{f.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Visual */}
              <div className="flex-1 flex items-center justify-center">
                <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.015] p-8 w-full max-w-sm text-center`}>
                  <ModIcon className={`mx-auto h-16 w-16 ${module.color} opacity-20`} />
                  <p className="mt-4 text-sm font-semibold text-slate-300">{module.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{module.features.length} Features</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* ═══════ DIFFERENZIERUNG ═══════ */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-28">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center mb-14">
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#c9a84c]">Vergleich</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
            Warum <span className="text-[#c9a84c]">AI Conversion</span>?
          </h2>
          <p className="mt-3 text-sm text-slate-400 max-w-xl mx-auto">
            Nicht nur ein Chatbot &ndash; ein komplettes Revenue Operating System.
            Dort, wo andere aufhoeren, fangen wir erst an.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
          className="overflow-x-auto rounded-2xl border border-white/[0.06]" style={{ background: "#0e0e1a" }}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-4 pl-6 pr-4 text-slate-500 font-medium w-[220px]">Feature</th>
                <th className="py-4 px-4 text-center">
                  <span className="text-[#c9a84c] font-semibold">AI Conversion</span>
                </th>
                <th className="py-4 px-4 text-center text-slate-600 font-medium">
                  <span className="block text-[11px] leading-tight">Typische<br />WhatsApp-Bots</span>
                </th>
                <th className="py-4 px-4 text-center text-slate-600 font-medium">
                  <span className="block text-[11px] leading-tight">Automatisierungs-<br />Tools</span>
                </th>
                <th className="py-4 px-4 pr-6 text-center text-slate-600 font-medium">
                  <span className="block text-[11px] leading-tight">Standard CRM +<br />Bot Loesungen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "WhatsApp KI-Verkaufsbot",       ai: true,  c1: "basic", c2: true,    c3: true },
                { feature: "Lead-Scoring (0\u2013100)",     ai: true,  c1: false,   c2: false,   c3: "basic" },
                { feature: "Predictive Close Score",        ai: true,  c1: false,   c2: false,   c3: false },
                { feature: "KI-Lead-Analyse + Zusammenfassung", ai: true, c1: false, c2: false,  c3: false },
                { feature: "KI-Angebotsgenerator",          ai: true,  c1: false,   c2: false,   c3: false },
                { feature: "CRM Pipeline (Kanban)",         ai: true,  c1: false,   c2: "basic", c3: true },
                { feature: "AI Asset Studio",               ai: true,  c1: false,   c2: false,   c3: false },
                { feature: "Kampagnen-Attribution + A/B",   ai: true,  c1: "basic", c2: true,    c3: "basic" },
                { feature: "Client Onboarding Portal",      ai: true,  c1: false,   c2: false,   c3: false },
                { feature: "QR-Code Tracking",              ai: true,  c1: false,   c2: true,    c3: "basic" },
                { feature: "Broadcast Manager",             ai: true,  c1: true,    c2: true,    c3: true },
                { feature: "HubSpot Auto-Sync",             ai: true,  c1: false,   c2: false,   c3: "basic" },
                { feature: "DSGVO + AES-256 Verschluesselung", ai: true, c1: "basic", c2: false, c3: "basic" },
                { feature: "Automatische Follow-Ups",       ai: true,  c1: false,   c2: "basic", c3: false },
              ].map((row, i) => (
                <tr key={row.feature} className={`border-b border-white/[0.02] ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                  <td className="py-3 pl-6 pr-4 text-slate-300 font-medium">{row.feature}</td>
                  {[row.ai, row.c1, row.c2, row.c3].map((val, j) => (
                    <td key={j} className={`py-3 px-4 text-center ${j === 3 ? "pr-6" : ""}`}>
                      {val === true
                        ? <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${j === 0 ? "bg-[#c9a84c]/15" : "bg-white/[0.04]"}`}>
                            <Check className={`h-3 w-3 ${j === 0 ? "text-[#c9a84c]" : "text-slate-500"}`} />
                          </span>
                        : val === "basic"
                        ? <span className="text-[10px] font-medium text-slate-600 bg-white/[0.03] rounded-full px-2 py-0.5">Teilweise</span>
                        : <span className="text-slate-700/60">&ndash;</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Fazit unter der Tabelle */}
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-6 flex items-center justify-center gap-3 text-xs text-slate-500">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#c9a84c]/15">
            <Check className="h-3 w-3 text-[#c9a84c]" />
          </span>
          <span>= Vollstaendig integriert</span>
          <span className="ml-4 text-[10px] font-medium text-slate-600 bg-white/[0.03] rounded-full px-2 py-0.5">Teilweise</span>
          <span>= Eingeschraenkt oder nur mit Zusatzkosten</span>
          <span className="ml-4 text-slate-700/60">&ndash;</span>
          <span>= Nicht verfuegbar</span>
        </motion.div>
      </section>

      {/* ═══════ 4. ROI-RECHNER ═══════ */}
      <RoiCalculator />

      {/* ═══════ 5. BRANCHEN ═══════ */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-28">
        <div className="text-center mb-12">
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#c9a84c]">Branchen</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
            Gebaut fuer <span className="text-[#c9a84c]">Ihre Branche</span>
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { icon: Building2, name: "Immobilien", desc: "Exposé-Anfragen sofort beantworten, Besichtigungstermine automatisch buchen, Objekte qualifiziert zuordnen" },
            { icon: Hammer, name: "Handwerk", desc: "Auftragsanfragen 24/7 entgegennehmen, Termine koordinieren und Angebote automatisch nachfassen" },
            { icon: GraduationCap, name: "Coaching", desc: "Erstgespraeche vorqualifizieren, nur kaufbereite Interessenten zum Call einladen" },
            { icon: Briefcase, name: "Agentur", desc: "Lead-Qualifizierung automatisieren, Projektanfragen bewerten und Pipeline-Wert tracken" },
            { icon: ShoppingCart, name: "E-Commerce", desc: "Kaufberatung via WhatsApp, Warenkorbabbrecher zurueckholen und Upselling automatisieren" },
          ].map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div key={b.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 text-center transition-all hover:border-[rgba(201,168,76,0.2)]">
                <Icon className="mx-auto h-8 w-8 text-[#c9a84c] mb-3" />
                <p className="text-sm font-semibold text-white">{b.name}</p>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">{b.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ═══════ 6. INTEGRATIONEN ═══════ */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-24">
        <div className="text-center mb-10">
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#c9a84c]">Integrationen</p>
          <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: "Georgia, serif" }}>
            Verbunden mit Ihrem <span className="text-[#c9a84c]">Stack</span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6">
          {[
            { name: "WhatsApp Cloud API", color: "text-emerald-400" },
            { name: "HubSpot CRM", color: "text-purple-400" },
            { name: "Paddle Payments", color: "text-blue-400" },
            { name: "Claude (Anthropic)", color: "text-[#c9a84c]" },
            { name: "GPT-4o (OpenAI)", color: "text-emerald-400" },
            { name: "Notion", color: "text-slate-300" },
            { name: "Resend E-Mail", color: "text-purple-400" },
          ].map((int) => (
            <div key={int.name} className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2">
              <Globe className={`h-4 w-4 ${int.color}`} />
              <span className="text-xs font-medium text-slate-300">{int.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ 7. PRICING ═══════ */}
      <section id="pricing" className="relative z-10 mx-auto max-w-5xl px-6 py-28">
        <div className="text-center mb-12">
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#c9a84c]">Investition</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
            Transparente <span className="text-[#c9a84c]">Preise</span>
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {[
            { name: "Starter", price: 497, setup: 697, tag: "Fuer den Einstieg", features: ["1 WhatsApp Bot", "500 Konversationen/Mo.", "Lead-Scoring + Follow-Ups", "CRM Pipeline", "E-Mail Support"], highlighted: false },
            { name: "Growth", price: 1297, setup: 1297, tag: "Beliebteste Wahl", features: ["3 WhatsApp Bots", "2.000 Konversationen/Mo.", "Alles aus Starter", "Marketing Suite + A/B Testing", "Broadcast Manager", "Priority Support"], highlighted: true },
            { name: "Professional", price: 2497, setup: 1997, tag: "Maximale Power", features: ["10 WhatsApp Bots", "Unbegrenzte Konversationen", "Alles aus Growth", "Client Portal", "HubSpot Sync", "Dediziertes Onboarding + SLA"], highlighted: false },
          ].map((plan) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5 }}
              className={`rounded-2xl border p-6 ${plan.highlighted ? "border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.03)] ring-1 ring-[rgba(201,168,76,0.15)]" : "border-white/[0.06] bg-white/[0.015]"}`}>
              {plan.highlighted && (
                <div className="mb-3 inline-flex rounded-full bg-[#c9a84c]/10 px-3 py-1 text-[10px] font-semibold text-[#c9a84c]">Empfohlen</div>
              )}
              <p className="text-xs text-slate-500">{plan.tag}</p>
              <h3 className="mt-1 text-xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{plan.name}</h3>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-3xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>{plan.price.toLocaleString("de-DE")}</span>
                <span className="text-sm text-slate-500 mb-1">EUR/Monat</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">+ {plan.setup.toLocaleString("de-DE")} EUR einmalig Setup</p>
              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a84c]" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="mailto:hello@ai-conversion.ai?subject=Anfrage%20Plan%20${plan.name}"
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-[#c9a84c] text-black hover:bg-[#d4b85c]"
                    : "border border-white/[0.08] text-white hover:bg-white/[0.04]"
                }`}>
                Jetzt starten <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link href="/pricing" className="text-sm text-[#c9a84c] hover:text-[#d4b85c] transition-colors">
            Alle Details, Add-Ons & Enterprise ansehen &rarr;
          </Link>
        </div>
      </section>

      {/* ═══════ 8. FINAL CTA ═══════ */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="rounded-2xl border border-[rgba(201,168,76,0.15)] bg-[rgba(201,168,76,0.02)] p-12 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
            Bereit, Ihren <span className="bg-gradient-to-r from-[#c9a84c] to-purple-400 bg-clip-text text-transparent">Revenue</span> zu skalieren?
          </h2>
          <p className="mt-4 text-sm text-slate-400 max-w-lg mx-auto">
            Von WhatsApp-Lead bis Gewonnenem Kunden &ndash; AI Conversion automatisiert Ihren kompletten Vertriebsprozess.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href="mailto:hello@ai-conversion.ai?subject=Demo%20Anfrage"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c9a84c] to-purple-500 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90">
              Jetzt starten <ArrowRight className="h-4 w-4" />
            </a>
            <a href="https://wa.me/?text=Hallo%2C%20ich%20interessiere%20mich%20f%C3%BCr%20AI%20Conversion"
              className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] px-6 py-3 text-sm font-semibold text-emerald-400 transition-all hover:bg-emerald-500/[0.1]">
              <MessageSquare className="h-4 w-4" /> WhatsApp Kontakt
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 48h Setup</span>
            <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> DSGVO-konform</span>
            <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Monatlich kuendbar</span>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8">
        <div className="mx-auto max-w-5xl px-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} AI Conversion. Alle Rechte vorbehalten.</p>
          <div className="flex gap-4 text-xs text-slate-600">
            <Link href="/datenschutz" className="hover:text-slate-400 transition-colors">Datenschutz</Link>
            <Link href="/impressum" className="hover:text-slate-400 transition-colors">Impressum</Link>
            <Link href="/agb" className="hover:text-slate-400 transition-colors">AGB</Link>
            <Link href="/pricing" className="hover:text-slate-400 transition-colors">Preise</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
