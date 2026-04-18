"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Navigation from "@/components/Navigation";
import {
  Check,
  X,
  MessageCircle,
  ArrowRight,
  Shield,
  Mic,
  Mail,
  BarChart3,
  Sparkles,
  Zap,
  Building2,
  Rocket,
  Bot,
  Globe,
  Target,
  Brain,
  Calendar,
  BookOpen,
  Users,
  TrendingUp,
  Headphones,
  Megaphone,
  Palette,
  Clock,
  Lock,
  SlidersHorizontal,
  Link2,
  Server,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

// ═══════════════════════════════════════════════════════
// DATEN
// ═══════════════════════════════════════════════════════

const CALENDLY_URL = "https://calendly.com/philipp-ai-conversion/30min";

interface Plan {
  name: string;
  icon: React.ReactNode;
  listPrice: number;
  foundingPrice: number;
  tagline: string;
  description: string;
  bots: string;
  tenants: string;
  conversations: string;
  features: { text: string; icon: React.ReactNode }[];
  popular: boolean;
}

const plans: Plan[] = [
  {
    name: "Starter",
    icon: <Zap className="h-5 w-5" />,
    listPrice: 349,
    foundingPrice: 233,
    tagline: "Ihr erster KI-Vertriebsmitarbeiter",
    description: "Perfekt für den Einstieg in automatisierten KI-Vertrieb",
    bots: "1 KI-Bot",
    tenants: "1 Mandant",
    conversations: "500 Konversationen/Monat",
    features: [
      { text: "WhatsApp KI-Vertriebsbot (Claude Sonnet)", icon: <Bot className="h-3.5 w-3.5" /> },
      { text: "Multisprachen-Bot (erkennt Sprache automatisch)", icon: <Globe className="h-3.5 w-3.5" /> },
      { text: "Lead-Scoring 0-100 automatisch", icon: <Target className="h-3.5 w-3.5" /> },
      { text: "Lead-Pipeline Übersicht (MQL → SQL → Customer)", icon: <TrendingUp className="h-3.5 w-3.5" /> },
      { text: "ROI-Rechner im Tenant-Dashboard", icon: <BarChart3 className="h-3.5 w-3.5" /> },
      { text: "DSGVO-konforme Datenspeicherung (Frankfurt)", icon: <Shield className="h-3.5 w-3.5" /> },
      { text: "E-Mail Support", icon: <Mail className="h-3.5 w-3.5" /> },
    ],
    popular: false,
  },
  {
    name: "Growth",
    icon: <Rocket className="h-5 w-5" />,
    listPrice: 699,
    foundingPrice: 467,
    tagline: "Skaliert Ihren Vertrieb",
    description: "Erweiterte KI-Features für wachsende Teams",
    bots: "3 KI-Bots",
    tenants: "3 Mandanten",
    conversations: "2.000 Konversationen/Monat",
    features: [
      { text: "Alles aus Starter, plus:", icon: <Sparkles className="h-3.5 w-3.5" /> },
      { text: "Lead-Persönlichkeitsanalyse (analytisch/emotional/dominant)", icon: <Brain className="h-3.5 w-3.5" /> },
      { text: "Einwand-Bibliothek (lernt aus jedem Nein)", icon: <BookOpen className="h-3.5 w-3.5" /> },
      { text: "Gesprächs-Heatmap (wo springen Leads ab?)", icon: <BarChart3 className="h-3.5 w-3.5" /> },
      { text: "Termin-Intelligenz (optimiert nach Tag/Zeit)", icon: <Calendar className="h-3.5 w-3.5" /> },
      { text: "A/B Testing für Bot-Prompts", icon: <SlidersHorizontal className="h-3.5 w-3.5" /> },
      { text: "WhatsApp-Broadcast an alle aktiven Leads", icon: <Megaphone className="h-3.5 w-3.5" /> },
      { text: "Multi-AI Dashboard (Claude + GPT-4o)", icon: <Sparkles className="h-3.5 w-3.5" /> },
      { text: "Priority Support (24h Reaktionszeit)", icon: <Headphones className="h-3.5 w-3.5" /> },
    ],
    popular: true,
  },
  {
    name: "Professional",
    icon: <Building2 className="h-5 w-5" />,
    listPrice: 1299,
    foundingPrice: 869,
    tagline: "Ihr komplettes KI-Vertriebsteam",
    description: "Maximale Power für große Vertriebsorganisationen",
    bots: "10 KI-Bots",
    tenants: "10 Mandanten",
    conversations: "Unbegrenzte Konversationen",
    features: [
      { text: "Alles aus Growth, plus:", icon: <Sparkles className="h-3.5 w-3.5" /> },
      { text: "Gesprächs-Coaching (Bot analysiert sich selbst)", icon: <Users className="h-3.5 w-3.5" /> },
      { text: "CRM-Sync (HubSpot, Salesforce, Pipedrive)", icon: <Link2 className="h-3.5 w-3.5" /> },
      { text: "Kalender-Integration (Google/Outlook direkt buchen)", icon: <Calendar className="h-3.5 w-3.5" /> },
      { text: "Bot-Persona Designer (visuell ohne Prompt)", icon: <Palette className="h-3.5 w-3.5" /> },
      { text: "Voice Agent Add-on verfügbar", icon: <Mic className="h-3.5 w-3.5" /> },
      { text: "Dediziertes Onboarding durch unser Team", icon: <Rocket className="h-3.5 w-3.5" /> },
      { text: "SLA & persönlicher Ansprechpartner", icon: <Shield className="h-3.5 w-3.5" /> },
    ],
    popular: false,
  },
];

interface AddOn {
  name: string;
  price: string;
  icon: React.ReactNode;
  description: string;
}

const addons: AddOn[] = [
  { name: "Marketing Booster", price: "299", icon: <Megaphone className="h-5 w-5" />, description: "KI-Kampagnen-Generator, A/B Testing, QR-Codes & Broadcast Manager" },
  { name: "HubSpot Sync", price: "199", icon: <Link2 className="h-5 w-5" />, description: "Automatischer Lead-Push bei Score >70 mit Lifecycle-Stage Mapping" },
  { name: "Weekly Report", price: "99", icon: <BarChart3 className="h-5 w-5" />, description: "Wöchentlicher KI-Report: Trends, Top-Leads, Pipeline-Analyse per E-Mail" },
  { name: "White-Label", price: "500", icon: <Palette className="h-5 w-5" />, description: "Eigenes Branding, eigene Domain, kein AI Conversion Logo" },
];

// Vergleichstabelle
interface ComparisonRow {
  feature: string;
  tooltip?: string;
  category?: boolean;
  starter: boolean | string;
  growth: boolean | string;
  professional: boolean | string;
  enterprise: boolean | string;
}

const comparisonRows: ComparisonRow[] = [
  { feature: "Bots & Limits", category: true, starter: "", growth: "", professional: "", enterprise: "" },
  { feature: "KI-Bots", starter: "1", growth: "3", professional: "10", enterprise: "Unbegrenzt" },
  { feature: "Mandanten", starter: "1", growth: "3", professional: "10", enterprise: "Unbegrenzt" },
  { feature: "Konversationen/Monat", starter: "500", growth: "2.000", professional: "Unbegrenzt", enterprise: "Unbegrenzt" },
  { feature: "KI-Features", category: true, starter: "", growth: "", professional: "", enterprise: "" },
  { feature: "WhatsApp KI-Vertriebsbot", starter: true, growth: true, professional: true, enterprise: true },
  { feature: "Multisprachen-Bot", starter: true, growth: true, professional: true, enterprise: true },
  { feature: "Lead-Scoring 0\u2013100", tooltip: "KI bewertet jeden Lead 0-100 automatisch", starter: true, growth: true, professional: true, enterprise: true },
  { feature: "Competitor-Mentions Erkennung", starter: true, growth: true, professional: true, enterprise: true },
  { feature: "Lead-Persönlichkeitsanalyse", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "Einwand-Bibliothek", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "Gesprächs-Heatmap", tooltip: "Zeigt wo Leads abspringen", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "A/B Testing Bot-Prompts", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "Gesprächs-Coaching", starter: false, growth: false, professional: true, enterprise: true },
  { feature: "Bot-Persona Designer", tooltip: "Bot visuell konfigurieren ohne Prompts", starter: false, growth: false, professional: true, enterprise: true },
  { feature: "Vertrieb & Pipeline", category: true, starter: "", growth: "", professional: "", enterprise: "" },
  { feature: "Lead-Pipeline Übersicht", starter: true, growth: true, professional: true, enterprise: true },
  { feature: "ROI-Rechner", tooltip: "Zeigt live wie viel der Bot einspart", starter: true, growth: true, professional: true, enterprise: true },
  { feature: "Termin-Intelligenz", tooltip: "Optimiert Terminvorschläge nach Tag/Zeit", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "WhatsApp-Broadcast", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "CRM-Sync (HubSpot, Salesforce, Pipedrive)", starter: false, growth: false, professional: true, enterprise: true },
  { feature: "Kalender-Integration", starter: false, growth: false, professional: true, enterprise: true },
  { feature: "Plattform & Support", category: true, starter: "", growth: "", professional: "", enterprise: "" },
  { feature: "Multi-AI Dashboard", tooltip: "Claude + GPT-4o parallel vergleichen", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "DSGVO-konforme Speicherung", starter: true, growth: true, professional: true, enterprise: true },
  { feature: "White-Label", starter: false, growth: false, professional: false, enterprise: true },
  { feature: "Custom Integrationen", starter: false, growth: false, professional: false, enterprise: true },
  { feature: "Eigene Serverinfrastruktur", starter: false, growth: false, professional: false, enterprise: true },
  { feature: "E-Mail Support", starter: true, growth: true, professional: true, enterprise: true },
  { feature: "Priority Support (24h)", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "SLA & persönlicher Ansprechpartner", starter: false, growth: false, professional: true, enterprise: true },
  { feature: "Dediziertes Onboarding", starter: false, growth: false, professional: true, enterprise: true },
];

// ═══════════════════════════════════════════════════════
// HILFSFUNKTIONEN
// ═══════════════════════════════════════════════════════

function formatPrice(price: number): string {
  return price.toLocaleString("de-DE");
}

// ═══════════════════════════════════════════════════════
// KOMPONENTEN
// ═══════════════════════════════════════════════════════

// Plan-Karte
function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
      className={`group relative flex flex-col rounded-2xl transition-all duration-500 ${
        plan.popular
          ? "z-10 bg-gradient-to-b from-[#C9A84C]/[0.06] via-[#C9A84C]/[0.02] to-navy-900/80 lg:scale-[1.04]"
          : "border border-white/[0.06] bg-white/[0.015] hover:border-purple-500/15 hover:bg-white/[0.025]"
      }`}
      style={plan.popular ? {
        border: "2px solid rgba(201,168,76,0.4)",
        boxShadow: "0 0 60px rgba(201,168,76,0.08), 0 0 120px rgba(201,168,76,0.04)",
      } : undefined}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 rounded-full px-5 py-1.5 text-[11px] font-bold uppercase tracking-wider shadow-lg"
            style={{ background: "linear-gradient(135deg, #C9A84C, #e8d5a0, #C9A84C)", color: "#0e0e1a", boxShadow: "0 4px 20px rgba(201,168,76,0.3)" }}
          >
            <Sparkles className="h-3 w-3" />
            Empfohlen
          </motion.div>
        </div>
      )}

      <div className="p-8 pb-0">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 ${
            plan.popular ? "bg-[#C9A84C]/10" : "bg-white/[0.04]"
          }`}>
            <span className={plan.popular ? "text-[#C9A84C]" : "text-purple-300"}>{plan.icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
          </div>
        </div>

        {/* Tagline */}
        <p className={`mt-3 text-sm font-medium ${plan.popular ? "text-[#C9A84C]/90" : "text-purple-300/70"}`}>
          {plan.tagline}
        </p>
        <p className="mt-1 text-xs text-slate-500">{plan.description}</p>

        {/* Preis — Founding-Partner-Darstellung */}
        <div className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C9A84C]/70 mb-1">Founding Partner</p>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-4xl font-extrabold tracking-tight ${plan.popular ? "text-[#C9A84C]" : "text-white"}`}>
              {formatPrice(plan.foundingPrice)}€
            </span>
            <span className="text-sm text-slate-500">/Monat</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            statt <span className="line-through">{formatPrice(plan.listPrice)}€/Monat</span>
          </p>

          {/* Founding-Vorteile */}
          <div className="mt-3 space-y-1">
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-400/80">
              <Check className="h-3 w-3 shrink-0" /> 33% Rabatt (lebenslang, solange Vertrag ungekündigt)
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-400/80">
              <Check className="h-3 w-3 shrink-0" /> 30 Tage kostenlos starten
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-400/80">
              <Check className="h-3 w-3 shrink-0" /> 0€ Setup-Gebühr in der Pilotphase
            </p>
          </div>
        </div>

        {/* Eckdaten */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[plan.bots, plan.tenants, plan.conversations].map((item, i) => (
            <span key={i} className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-slate-400 border border-white/[0.04]">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="flex-1 p-8 pt-5">
        <ul className="space-y-2.5">
          {plan.features.map((f, i) => {
            const isHeadline = f.text.endsWith(":");
            return (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                {isHeadline ? (
                  <span className="font-semibold text-purple-300/80 text-xs uppercase tracking-wide mt-1">{f.text}</span>
                ) : (
                  <>
                    <span className={`mt-0.5 shrink-0 ${plan.popular ? "text-[#C9A84C]/70" : "text-purple-400/70"}`}>{f.icon}</span>
                    <span className="text-slate-400">{f.text}</span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* CTA */}
      <div className="p-8 pt-0">
        <a
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition-all duration-300 ${
            plan.popular
              ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20 hover:bg-purple-500 hover:scale-[1.02]"
              : "border border-white/[0.08] text-slate-300 hover:border-purple-500/25 hover:bg-purple-500/[0.04] hover:text-white"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          Demo-Call buchen (30 Min)
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </motion.div>
  );
}

// Vergleichstabelle Zelle
function ComparisonCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm font-medium text-white">{value}</span>;
  }
  return value ? (
    <Check className="mx-auto h-4 w-4 text-purple-400" />
  ) : (
    <X className="mx-auto h-4 w-4 text-slate-700" />
  );
}

// ═══════════════════════════════════════════════════════
// ROI-RECHNER
// ═══════════════════════════════════════════════════════

function RoiCalculator() {
  const [avgDeal, setAvgDeal] = useState(2500);
  const [leadsPerMonth, setLeadsPerMonth] = useState(50);
  const [currentRate, setCurrentRate] = useState(5);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const CONVERSION_BOOST = 1.4;
  const boostedRate = Math.min(currentRate * CONVERSION_BOOST, 100);

  const currentRevenue = leadsPerMonth * (currentRate / 100) * avgDeal;
  const boostedRevenue = leadsPerMonth * (boostedRate / 100) * avgDeal;
  const monthlyGain = boostedRevenue - currentRevenue;

  // ROI-Baseline: Listenpreise, Setup=0 in Pilotphase
  // Laut ConvArch-Entscheidung vom 16.04.2026, Frage #3
  const planCosts = [
    { name: "Starter", monthly: 349, setup: 0 },
    { name: "Growth", monthly: 699, setup: 0 },
    { name: "Professional", monthly: 1299, setup: 0 },
  ];

  function SliderInput({ label, value, onChange, min, max, step, unit, format }: {
    label: string; value: number; onChange: (v: number) => void;
    min: number; max: number; step: number; unit: string; format?: (v: number) => string;
  }) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">{label}</span>
          <span className="text-sm font-semibold text-white">
            {format ? format(value) : value.toLocaleString("de-DE")}{unit}
          </span>
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #c9a84c 0%, #8b5cf6 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.06) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.06) 100%)`,
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
            background: linear-gradient(135deg, #c9a84c, #8b5cf6); border: 2px solid #0e0e1a;
            cursor: pointer; box-shadow: 0 0 12px rgba(201,168,76,0.3);
          }
          input[type="range"]::-moz-range-thumb {
            width: 18px; height: 18px; border-radius: 50%;
            background: linear-gradient(135deg, #c9a84c, #8b5cf6); border: 2px solid #0e0e1a;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  return (
    <section ref={ref} className="relative z-10 mx-auto max-w-5xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        {/* ROI-Disclaimer */}
        <div className="mx-auto mb-6 max-w-2xl rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-5 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/70" />
            <p className="text-xs text-amber-200/80 leading-relaxed text-left">
              <span className="font-semibold text-amber-200">Beispielrechnung — noch keine echten Pilot-Daten.</span>{" "}
              Diese Rechnung zeigt theoretische Einsparungen basierend auf branchenüblichen Annahmen. Echte Pilot-Daten werden ab Q3 2026 hier publiziert.
            </p>
          </div>
        </div>
        <p className="text-[13px] font-medium uppercase tracking-[0.12em]" style={{ color: "#C9A84C" }}>
          Return on Investment
        </p>
        <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "Georgia, serif" }}>
          Berechnen Sie Ihren <span className="text-[#C9A84C]">ROI</span>
        </h2>
        <p className="mt-3 text-sm text-slate-400 max-w-lg mx-auto">
          Sehen Sie live, wie AI Conversion Ihre Conversion-Rate um bis zu 40% steigern kann
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid gap-6 lg:grid-cols-2"
      >
        <div className="rounded-2xl border border-white/[0.06] p-6 space-y-6" style={{ background: "#0e0e1a" }}>
          <div className="flex items-center gap-2 mb-2">
            <SlidersHorizontal className="h-4 w-4 text-[#C9A84C]" />
            <span className="text-sm font-semibold text-slate-200">Ihre Kennzahlen</span>
          </div>
          <SliderInput label="Ø Auftragswert" value={avgDeal} onChange={setAvgDeal}
            min={500} max={50000} step={500} unit=" €" format={v => v.toLocaleString("de-DE")} />
          <SliderInput label="Leads pro Monat" value={leadsPerMonth} onChange={setLeadsPerMonth}
            min={10} max={500} step={10} unit="" />
          <SliderInput label="Aktuelle Conversion-Rate" value={currentRate} onChange={setCurrentRate}
            min={1} max={30} step={1} unit="%" />
        </div>

        <div className="rounded-2xl border border-[rgba(201,168,76,0.15)] p-6" style={{ background: "rgba(201,168,76,0.02)" }}>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-4 w-4 text-[#C9A84C]" />
            <span className="text-sm font-semibold text-slate-200">Ihr Potenzial mit AI Conversion</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
              <p className="text-[10px] text-slate-500 mb-1">Aktuell ({currentRate}%)</p>
              <p className="text-xl font-bold text-slate-400" style={{ fontFamily: "Georgia, serif" }}>
                {currentRevenue.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €
              </p>
              <p className="text-[10px] text-slate-600">Umsatz/Monat</p>
            </div>
            <div className="rounded-xl border border-[rgba(201,168,76,0.2)] bg-[rgba(201,168,76,0.03)] p-4 text-center">
              <p className="text-[10px] text-[#c9a84c]/60 mb-1">Mit AI Conversion ({boostedRate.toFixed(1)}%)</p>
              <p className="text-xl font-bold text-[#C9A84C]" style={{ fontFamily: "Georgia, serif" }}>
                {boostedRevenue.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €
              </p>
              <p className="text-[10px] text-[#c9a84c]/60">Umsatz/Monat</p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-4 text-center mb-5">
            <p className="text-[10px] text-emerald-400/60 mb-1">Mehreinnahmen pro Monat</p>
            <p className="text-3xl font-bold text-emerald-400" style={{ fontFamily: "Georgia, serif" }}>
              +{monthlyGain.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €
            </p>
          </div>

          <p className="text-[10px] text-slate-500 mb-2">Amortisierung (1. Monat):</p>
          <div className="space-y-2">
            {planCosts.map((plan) => {
              const totalFirstMonth = plan.monthly + plan.setup;
              const daysToRoi = monthlyGain > 0 ? Math.ceil((totalFirstMonth / monthlyGain) * 30) : 999;
              return (
                <div key={plan.name} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                  <span className="text-xs text-slate-300">{plan.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{totalFirstMonth.toLocaleString("de-DE")} €</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      daysToRoi <= 30 ? "bg-emerald-500/10 text-emerald-400" :
                      daysToRoi <= 90 ? "bg-[#c9a84c]/10 text-[#c9a84c]" :
                      "bg-slate-500/10 text-slate-400"
                    }`}>
                      {daysToRoi > 365 ? ">365" : daysToRoi} Tage
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════
// SEITE
// ═══════════════════════════════════════════════════════

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-navy-950">
      <Navigation />

      {/* Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-purple-500/[0.04] blur-[140px]" />
        <div className="absolute right-[10%] top-[60%] h-[400px] w-[400px] rounded-full bg-[#C9A84C]/[0.02] blur-[120px]" />
      </div>

      {/* ═══════ HERO ═══════ */}
      <section className="relative z-10 overflow-hidden pt-36 pb-16 sm:pt-40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/15 bg-[#C9A84C]/[0.05] px-4 py-1.5">
                <Shield className="h-3.5 w-3.5 text-[#C9A84C]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#C9A84C]/80">
                  Made in Germany &bull; DSGVO &bull; Frankfurt hosted
                </span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-extrabold tracking-tight text-white"
              style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)", lineHeight: 1.15 }}
            >
              Transparente Preise für{" "}
              <span style={{ color: "#C9A84C" }}>Founding Partner</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 max-w-lg mx-auto text-lg leading-relaxed text-slate-400"
            >
              Monatlich kündbar. Keine versteckten Kosten. 33% Founding-Partner-Rabatt, lebenslang.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ═══════ FOUNDING DISCLAIMER ═══════ */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-8">
        <div className="rounded-xl border border-[rgba(201,168,76,0.2)] bg-[rgba(201,168,76,0.03)] px-6 py-4">
          <p className="text-xs text-slate-300 leading-relaxed text-center">
            Founding Partner zahlen 33% weniger, solange der Vertrag ungekündigt bleibt. Die durchgestrichenen Preise gelten ab Vollverfügbarkeit. Founding Partner aus der aktuellen Pilotphase sichern sich ihre Konditionen dauerhaft.
          </p>
        </div>
      </section>

      {/* ═══════ PRICING HEADER ═══════ */}
      <section id="pricing" className="relative z-10 mx-auto max-w-6xl px-6 pt-4 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-[13px] font-medium uppercase tracking-[0.12em]" style={{ color: "#C9A84C" }}>
            Transparente Preise
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Wählen Sie Ihren Plan
          </h2>
        </motion.div>
      </section>

      {/* ═══════ PRICING CARDS ═══════ */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-8">
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          {plans.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} index={i} />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-6 text-center text-xs text-slate-600"
        >
          Zusätzlich fallen WhatsApp-Nachrichtenkosten an (ca. 0,11€ pro Marketing-Nachricht in DE, direkt über Meta).
          Service-Antworten innerhalb 24h sind kostenlos.
        </motion.p>
      </section>

      {/* ═══════ VALUE BANNER ═══════ */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-[#C9A84C]/15 bg-gradient-to-r from-[#C9A84C]/[0.04] via-navy-900/80 to-[#C9A84C]/[0.04] px-8 py-6 text-center"
        >
          <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
            <span className="font-bold" style={{ color: "#C9A84C" }}>Growth</span>{" "}
            skaliert Ihren Vertrieb, ohne ein weiteres Teammitglied einzustellen.
          </p>
        </motion.div>
      </section>

      {/* ═══════ ENTERPRISE ═══════ */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-[#C9A84C]/20 bg-gradient-to-br from-[#C9A84C]/[0.05] via-navy-900 to-purple-500/[0.03]"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#C9A84C]/[0.06] blur-[80px]" />

          <div className="relative flex flex-col gap-8 p-10 sm:p-14 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#C9A84C]/20 shadow-lg" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))" }}>
                  <Building2 className="h-7 w-7 text-[#C9A84C]" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white sm:text-3xl">Enterprise</h3>
                  <p className="text-sm" style={{ color: "rgba(201,168,76,0.6)" }}>
                    Auf Anfrage &mdash; individuelle Konditionen für größere Teams
                  </p>
                </div>
              </div>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400">
                Maßgeschneiderte Lösung für Unternehmen mit hohem Volumen.
                White-Label, eigene Infrastruktur und dedizierter Support.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  "Unbegrenzt Bots & Mandanten",
                  "White-Label Lösung",
                  "Custom Integrationen",
                  "Eigene Serverinfrastruktur möglich",
                  "Dediziertes Onboarding & persönlicher Ansprechpartner",
                ].map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-2 text-sm text-slate-300">
                    <Check className="h-4 w-4 shrink-0 text-[#C9A84C]" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 lg:items-end">
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #C9A84C, #a8893a)", boxShadow: "0 4px 24px rgba(201,168,76,0.2)" }}
              >
                <MessageCircle className="h-4 w-4" />
                Demo-Call buchen (30 Min)
                <ArrowRight className="h-4 w-4" />
              </a>
              <span className="text-xs text-slate-600">Antwort innerhalb 24 Stunden</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════ TRENNUNG ═══════ */}
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A84C]/15 to-transparent" />
          <Sparkles className="h-4 w-4 text-[#C9A84C]/30" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A84C]/15 to-transparent" />
        </div>
      </div>

      {/* ═══════ ROI-RECHNER ═══════ */}
      <RoiCalculator />

      {/* ═══════ ADD-ONS ═══════ */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-[13px] font-medium uppercase tracking-[0.12em]" style={{ color: "#C9A84C" }}>
            Erweiterungen
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Optionale Add-ons
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Für alle Pakete buchbar. Jederzeit hinzufüg- und kündbar.
          </p>
        </motion.div>

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {addons.map((addon, i) => (
            <motion.div
              key={addon.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-6 transition-all duration-300 hover:border-[#C9A84C]/15 hover:bg-white/[0.025]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C9A84C]/10 text-[#C9A84C] transition group-hover:bg-[#C9A84C]/15">
                  {addon.icon}
                </div>
                <h3 className="text-sm font-semibold text-white">{addon.name}</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">{addon.description}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-xl font-bold text-white">+{addon.price}€</span>
                <span className="text-xs text-slate-600">/Monat</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════ VERGLEICHSTABELLE ═══════ */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <div className="divider-purple mb-12" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-[13px] font-medium uppercase tracking-[0.12em]" style={{ color: "#C9A84C" }}>
            Im Detail
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Alle Features im Vergleich
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-10 overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.01]"
        >
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="sticky left-0 z-10 bg-navy-950 px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Feature
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Starter</th>
                <th className="px-4 py-4 text-center">
                  <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider" style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C" }}>
                    Growth
                  </span>
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Professional</th>
                <th className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => {
                if (row.category) {
                  return (
                    <tr key={i} className="border-t border-white/[0.06] bg-white/[0.02]">
                      <td colSpan={5} className="sticky left-0 z-10 bg-[rgba(255,255,255,0.02)] px-6 py-4 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "#C9A84C" }}>
                        {row.feature}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={i} className="border-t border-white/[0.03] transition hover:bg-white/[0.015]">
                    <td className="sticky left-0 z-10 bg-navy-950 px-6 py-4 text-sm text-slate-400">
                      <span>{row.feature}</span>
                      {row.tooltip && (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] text-purple-400/50" title={row.tooltip}>
                          &#9432;
                          <span className="text-[10px] text-slate-600">{row.tooltip}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center"><ComparisonCell value={row.starter} /></td>
                    <td className="px-4 py-4 text-center bg-[#C9A84C]/[0.02]"><ComparisonCell value={row.growth} /></td>
                    <td className="px-4 py-4 text-center"><ComparisonCell value={row.professional} /></td>
                    <td className="px-4 py-4 text-center"><ComparisonCell value={row.enterprise} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      </section>

      {/* ═══════ BOTTOM CTA ═══════ */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl border border-[#C9A84C]/15 bg-[#C9A84C]/[0.02] p-10 text-center sm:p-14"
          style={{ boxShadow: "0 0 80px rgba(201,168,76,0.04), 0 0 160px rgba(201,168,76,0.02)" }}
        >
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Bereit, Founding Partner zu werden?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-slate-500">
            Persönliches Onboarding. Monatlich kündbar. 33% Founding-Partner-Rabatt.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-purple-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-500 hover:scale-[1.02]"
            >
              <MessageCircle className="h-4 w-4" />
              Demo-Call buchen (30 Min)
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link href="/faq" className="text-sm text-slate-500 transition hover:text-[#C9A84C]">
              Häufige Fragen &rarr;
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ═══════ TRUST BAR ═══════ */}
      <section className="relative z-10 border-t border-white/[0.04] py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-6">
          {[
            { icon: <Shield className="h-3.5 w-3.5 text-[#C9A84C]/50" />, text: "DSGVO-konform" },
            { icon: <Server className="h-3.5 w-3.5 text-[#C9A84C]/50" />, text: "Hosting Frankfurt" },
            { icon: <Globe className="h-3.5 w-3.5 text-[#C9A84C]/50" />, text: "Made in Germany" },
            { icon: <Lock className="h-3.5 w-3.5 text-[#C9A84C]/50" />, text: "AES-256-GCM" },
            { icon: <Clock className="h-3.5 w-3.5 text-[#C9A84C]/50" />, text: "99,9% Uptime" },
            { icon: <Users className="h-3.5 w-3.5 text-[#C9A84C]/50" />, text: "Multi-Tenant" },
          ].map((item, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
              {item.icon}
              {item.text}
              {i < 5 && <span className="ml-4 h-3 w-px bg-white/[0.06]" />}
            </span>
          ))}
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-4 text-center text-[11px] text-slate-500">
            AI Conversion befindet sich in der Founding-Partner-Phase. Erste Case Studies werden ab Q3 2026 publiziert.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="text-xs text-slate-600">
              &copy; 2026 AI Conversion. Alle Rechte vorbehalten.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/impressum" className="text-xs text-slate-600 transition hover:text-[#C9A84C]">
                Impressum
              </Link>
              <Link href="/datenschutz" className="text-xs text-slate-600 transition hover:text-[#C9A84C]">
                Datenschutz
              </Link>
              <Link href="/agb" className="text-xs text-slate-600 transition hover:text-[#C9A84C]">
                AGB
              </Link>
              <span className="text-xs text-slate-600">hello@ai-conversion.ai</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
