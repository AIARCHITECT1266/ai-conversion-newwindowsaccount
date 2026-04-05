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
  Instagram,
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
  Flame,
  Users,
  TrendingUp,
  Headphones,
  Megaphone,
  Palette,
  Clock,
  Server,
  Link2,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";

// ---------- Preisdaten ----------

interface Plan {
  name: string;
  icon: React.ReactNode;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  setupFee: string;
  description: string;
  bots: string;
  tenants: string;
  conversations: string;
  features: string[];
  cta: string;
  ctaLink: string;
  popular: boolean;
  gradient: string;
}

const plans: Plan[] = [
  {
    name: "Starter",
    icon: <Zap className="h-5 w-5" />,
    monthlyPrice: 497,
    yearlyPrice: 4970,
    setupFee: "497",
    description: "Perfekt fuer den Einstieg in KI-Vertrieb",
    bots: "1 KI-Bot",
    tenants: "1 Mandant",
    conversations: "500 Konversationen/Monat",
    features: [
      "WhatsApp KI-Vertriebsbot (Claude Sonnet)",
      "Multisprachen-Bot (erkennt Sprache automatisch)",
      "Lead-Pipeline Uebersicht (MQL \u2192 SQL \u2192 Customer)",
      "ROI-Rechner im Tenant-Dashboard",
      "Competitor-Mentions Erkennung",
      "DSGVO-konforme Datenspeicherung (Frankfurt)",
      "E-Mail Support",
    ],
    cta: "Jetzt starten",
    ctaLink:
      "https://wa.me/4917647666407?text=Hi%2C%20ich%20interessiere%20mich%20f%C3%BCr%20den%20Starter-Plan!",
    popular: false,
    gradient: "from-slate-500/20 to-slate-600/5",
  },
  {
    name: "Growth",
    icon: <Rocket className="h-5 w-5" />,
    monthlyPrice: 1497,
    yearlyPrice: 14970,
    setupFee: "997",
    description: "Fuer wachsende Vertriebsteams",
    bots: "3 KI-Bots",
    tenants: "3 Mandanten",
    conversations: "2.000 Konversationen/Monat",
    features: [
      "Alles aus Starter, plus:",
      "Lead-Persoenlichkeitsanalyse (analytisch/emotional/dominant)",
      "Einwand-Bibliothek (lernt aus jedem Nein automatisch)",
      "Gespraechs-Heatmap (wo springen Leads ab?)",
      "Termin-Intelligenz (optimiert nach Tag/Zeit)",
      "A/B Testing fuer Bot-Prompts",
      "WhatsApp-Broadcast an alle aktiven Leads",
      "Multi-AI Dashboard (Claude + GPT-4o)",
      "Priority Support (24h Reaktionszeit)",
    ],
    cta: "Jetzt starten",
    ctaLink:
      "https://wa.me/4917647666407?text=Hi%2C%20ich%20interessiere%20mich%20f%C3%BCr%20den%20Growth-Plan!",
    popular: true,
    gradient: "from-purple-500/20 to-purple-600/5",
  },
  {
    name: "Professional",
    icon: <Building2 className="h-5 w-5" />,
    monthlyPrice: 2997,
    yearlyPrice: 29970,
    setupFee: "1.997",
    description: "Maximale Power fuer grosse Teams",
    bots: "10 KI-Bots",
    tenants: "10 Mandanten",
    conversations: "Unbegrenzte Konversationen",
    features: [
      "Alles aus Growth, plus:",
      "Gespraechs-Coaching (Bot analysiert sich selbst)",
      "CRM-Sync (HubSpot, Salesforce, Pipedrive)",
      "Kalender-Integration (Google/Outlook direkt buchen)",
      "Bot-Persona Designer (visuell ohne Prompt schreiben)",
      "Voice Agent Add-on verfuegbar",
      "Dediziertes Onboarding durch unser Team",
      "SLA & persoenlicher Ansprechpartner",
    ],
    cta: "Jetzt starten",
    ctaLink:
      "https://wa.me/4917647666407?text=Hi%2C%20ich%20interessiere%20mich%20f%C3%BCr%20den%20Professional-Plan!",
    popular: false,
    gradient: "from-emerald-500/20 to-emerald-600/5",
  },
];

const enterprise = {
  name: "Enterprise",
  monthlyPrice: "ab 5.000",
  features: [
    "Unbegrenzt Bots & Mandanten",
    "White-Label Loesung",
    "Custom Integrationen",
    "Eigene Serverinfrastruktur moeglich",
    "Dediziertes Onboarding & persoenlicher Ansprechpartner",
    "Preis auf Anfrage",
  ],
};

interface AddOn {
  name: string;
  price: string;
  icon: React.ReactNode;
  description: string;
}

const addons: AddOn[] = [
  {
    name: "Voice Agent (Telnyx)",
    price: "500",
    icon: <Mic className="h-5 w-5" />,
    description: "Telefonische KI-Gespraeche fuer Inbound & Outbound",
  },
  {
    name: "Instagram DMs",
    price: "400",
    icon: <Instagram className="h-5 w-5" />,
    description: "Automatisierte Instagram Direct Messages",
  },
  {
    name: "E-Mail Agent",
    price: "300",
    icon: <Mail className="h-5 w-5" />,
    description: "KI-gestuetzte E-Mail-Follow-ups & Nurturing",
  },
  {
    name: "Multi-AI Dashboard",
    price: "200",
    icon: <BarChart3 className="h-5 w-5" />,
    description: "Claude + GPT-4o + Gemini parallel vergleichen",
  },
];

// ---------- Vergleichstabelle ----------

interface ComparisonRow {
  feature: string;
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
  { feature: "Competitor-Mentions Erkennung", starter: true, growth: true, professional: true, enterprise: true },
  { feature: "Lead-Persoenlichkeitsanalyse", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "Einwand-Bibliothek", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "Gespraechs-Heatmap", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "A/B Testing Bot-Prompts", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "Gespraechs-Coaching", starter: false, growth: false, professional: true, enterprise: true },
  { feature: "Bot-Persona Designer", starter: false, growth: false, professional: true, enterprise: true },
  { feature: "Vertrieb & Pipeline", category: true, starter: "", growth: "", professional: "", enterprise: "" },
  { feature: "Lead-Pipeline Uebersicht", starter: true, growth: true, professional: true, enterprise: true },
  { feature: "ROI-Rechner", starter: true, growth: true, professional: true, enterprise: true },
  { feature: "Termin-Intelligenz", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "WhatsApp-Broadcast", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "CRM-Sync (HubSpot, Salesforce, Pipedrive)", starter: false, growth: false, professional: true, enterprise: true },
  { feature: "Kalender-Integration", starter: false, growth: false, professional: true, enterprise: true },
  { feature: "Plattform & Support", category: true, starter: "", growth: "", professional: "", enterprise: "" },
  { feature: "Multi-AI Dashboard", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "DSGVO-konforme Speicherung", starter: true, growth: true, professional: true, enterprise: true },
  { feature: "White-Label", starter: false, growth: false, professional: false, enterprise: true },
  { feature: "Custom Integrationen", starter: false, growth: false, professional: false, enterprise: true },
  { feature: "Eigene Serverinfrastruktur", starter: false, growth: false, professional: false, enterprise: true },
  { feature: "E-Mail Support", starter: true, growth: true, professional: true, enterprise: true },
  { feature: "Priority Support (24h)", starter: false, growth: true, professional: true, enterprise: true },
  { feature: "SLA & persoenlicher Ansprechpartner", starter: false, growth: false, professional: true, enterprise: true },
  { feature: "Dediziertes Onboarding", starter: false, growth: false, professional: true, enterprise: true },
];

// ---------- Hilfsfunktionen ----------

function formatPrice(price: number): string {
  return price.toLocaleString("de-DE");
}

function formatMonthlyFromYearly(yearlyPrice: number): string {
  return Math.round(yearlyPrice / 12).toLocaleString("de-DE");
}

// ---------- Feature-Icon-Zuordnung ----------

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  "WhatsApp KI-Vertriebsbot": <Bot className="h-3.5 w-3.5" />,
  "Multisprachen-Bot": <Globe className="h-3.5 w-3.5" />,
  "Lead-Pipeline": <Target className="h-3.5 w-3.5" />,
  "ROI-Rechner": <TrendingUp className="h-3.5 w-3.5" />,
  "Competitor-Mentions": <Flame className="h-3.5 w-3.5" />,
  "DSGVO": <Shield className="h-3.5 w-3.5" />,
  "E-Mail Support": <Mail className="h-3.5 w-3.5" />,
  "Persoenlichkeitsanalyse": <Brain className="h-3.5 w-3.5" />,
  "Einwand-Bibliothek": <BookOpen className="h-3.5 w-3.5" />,
  "Heatmap": <BarChart3 className="h-3.5 w-3.5" />,
  "Termin-Intelligenz": <Calendar className="h-3.5 w-3.5" />,
  "A/B Testing": <SlidersHorizontal className="h-3.5 w-3.5" />,
  "Broadcast": <Megaphone className="h-3.5 w-3.5" />,
  "Multi-AI": <Sparkles className="h-3.5 w-3.5" />,
  "Priority Support": <Headphones className="h-3.5 w-3.5" />,
  "Coaching": <Users className="h-3.5 w-3.5" />,
  "CRM-Sync": <Link2 className="h-3.5 w-3.5" />,
  "Kalender-Integration": <Calendar className="h-3.5 w-3.5" />,
  "Bot-Persona": <Palette className="h-3.5 w-3.5" />,
  "Voice Agent": <Mic className="h-3.5 w-3.5" />,
  "Onboarding": <Rocket className="h-3.5 w-3.5" />,
  "SLA": <Shield className="h-3.5 w-3.5" />,
};

function getFeatureIcon(feature: string): React.ReactNode {
  for (const [key, icon] of Object.entries(FEATURE_ICONS)) {
    if (feature.includes(key)) return icon;
  }
  return <Check className="h-3.5 w-3.5" />;
}

// ---------- Animierter Counter ----------

function AnimatedCounter({ target, suffix = "" }: { target: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const num = parseInt(target, 10);
    if (isNaN(num)) {
      setDisplay(target);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * num).toString());
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {display}{suffix}
    </span>
  );
}

// ---------- Komponenten ----------

function BillingToggle({
  isYearly,
  onToggle,
}: {
  isYearly: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mx-auto inline-flex items-center gap-5 rounded-full border border-purple-500/20 bg-navy-900/60 px-6 py-3 backdrop-blur-sm">
      <span
        className={`text-base font-semibold transition-colors ${!isYearly ? "text-white" : "text-slate-500"}`}
      >
        Monatlich
      </span>
      <button
        onClick={onToggle}
        className="relative h-9 w-[4.5rem] rounded-full bg-navy-800 border border-purple-500/30 transition-colors hover:border-purple-500/50"
        aria-label="Abrechnungszeitraum wechseln"
      >
        <motion.div
          className="absolute top-1 h-7 w-7 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30"
          animate={{ left: isYearly ? 37 : 3 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
      <span
        className={`text-base font-semibold transition-colors ${isYearly ? "text-white" : "text-slate-500"}`}
      >
        Jaehrlich
      </span>
      <span
        className={`rounded-full px-4 py-1.5 text-sm font-bold transition-all duration-300 ${
          isYearly
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-white/[0.04] text-slate-500"
        }`}
      >
        2 Monate gratis &ndash; 17% sparen
      </span>
    </div>
  );
}

function PlanCard({
  plan,
  isYearly,
  index,
}: {
  plan: Plan;
  isYearly: boolean;
  index: number;
}) {
  const displayPrice = isYearly
    ? formatMonthlyFromYearly(plan.yearlyPrice!)
    : formatPrice(plan.monthlyPrice!);
  const totalYearly = isYearly ? formatPrice(plan.yearlyPrice!) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
      className={`group relative flex flex-col rounded-2xl border transition-all duration-500 ${
        plan.popular
          ? "z-10 border-purple-500/30 bg-gradient-to-b from-purple-500/[0.06] to-navy-900/80 shadow-[0_0_60px_rgba(139,92,246,0.08)] lg:scale-[1.04]"
          : "border-white/[0.06] bg-white/[0.015] hover:border-purple-500/15 hover:bg-white/[0.025]"
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 rounded-full bg-purple-500 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-500/25"
          >
            <Sparkles className="h-3 w-3" />
            Empfohlen
          </motion.div>
        </div>
      )}

      <div className="p-8 pb-0">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${plan.gradient} border border-white/5`}
          >
            <span className="text-purple-300">{plan.icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
            <p className="text-xs text-slate-500">{plan.description}</p>
          </div>
        </div>

        {/* Preis */}
        <div className="mt-6">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tracking-tight text-white">
              {displayPrice}€
            </span>
            <span className="text-sm text-slate-500">/Monat</span>
          </div>
          {totalYearly && (
            <p className="mt-1 text-xs text-purple-400/80">
              {totalYearly}€/Jahr (2 Monate gratis)
            </p>
          )}
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/15 bg-amber-500/[0.06] px-3 py-1 text-xs font-medium text-amber-400/90">
            + {plan.setupFee}€ einmalige Setup-Fee
          </p>
        </div>

        {/* Eckdaten */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[plan.bots, plan.tenants, plan.conversations].map((item, i) => (
            <span
              key={i}
              className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-slate-400 border border-white/[0.04]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="flex-1 p-8 pt-6">
        <ul className="space-y-3">
          {plan.features.map((f, i) => {
            const isHeadline = f.endsWith(":");
            return (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                {isHeadline ? (
                  <span className="font-semibold text-purple-300/80 text-xs uppercase tracking-wide mt-1">
                    {f}
                  </span>
                ) : (
                  <>
                    <span className="mt-0.5 shrink-0 text-purple-400/70">
                      {getFeatureIcon(f)}
                    </span>
                    <span className="text-slate-400">{f}</span>
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
          href={plan.ctaLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition-all duration-300 ${
            plan.popular
              ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20 hover:bg-purple-400 hover:shadow-purple-500/30 hover:scale-[1.02]"
              : "border border-white/[0.08] text-slate-300 hover:border-purple-500/25 hover:bg-purple-500/[0.04] hover:text-white"
          }`}
        >
          {plan.cta}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </motion.div>
  );
}

function ComparisonCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return (
      <span className="text-sm font-medium text-white">{value}</span>
    );
  }
  return value ? (
    <Check className="mx-auto h-4 w-4 text-emerald-400" />
  ) : (
    <X className="mx-auto h-4 w-4 text-slate-700" />
  );
}

// ---------- Seite ----------

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="min-h-screen bg-navy-950">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-8">
        {/* Dekorativer Hintergrund-Gradient */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-purple-500/[0.04] blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/15 bg-purple-500/[0.05] px-4 py-1.5">
              <Shield className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-purple-300/80">
                DSGVO-konform &bull; Hosting Frankfurt &bull; Made in Germany
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Der WhatsApp Inbound Sales Agent,
            <br />
            <span className="text-gradient-purple">der Vertriebskosten halbiert</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-5 max-w-xl text-lg text-slate-500"
          >
            Transparent. DSGVO-sicher. Messbar mehr Umsatz.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10"
          >
            <BillingToggle
              isYearly={isYearly}
              onToggle={() => setIsYearly(!isYearly)}
            />
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-16">
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          {plans.map((plan, i) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              isYearly={isYearly}
              index={i}
            />
          ))}
        </div>

        {/* Value-Banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 rounded-2xl border border-purple-500/15 bg-gradient-to-r from-purple-500/[0.06] via-navy-900/80 to-purple-500/[0.06] px-8 py-5 text-center"
        >
          <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
            <span className="font-semibold text-white">Growth</span> ersetzt
            1&ndash;2 Vertriebsmitarbeiter
            <span className="text-slate-500"> (Kosten: 4.000&ndash;8.000€/Monat)</span>
            {" "}&ndash; bei{" "}
            <span className="font-bold text-purple-300">1.497€/Monat</span>
            {" "}und{" "}
            <span className="font-semibold text-emerald-400">24/7 Verfuegbarkeit</span>.
          </p>
        </motion.div>

        {/* Meta-Kosten Hinweis */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 text-center text-xs text-slate-600"
        >
          Zusaetzlich fallen WhatsApp-Nachrichtenkosten an (ca. 0,11€ pro
          Marketing-Nachricht, direkt ueber Meta). Service-Antworten innerhalb
          24h sind kostenlos.
        </motion.p>
      </section>

      {/* ROI-Highlight Sektion */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
          {[
            { value: "24/7", label: "Immer verfuegbar", icon: <Clock className="h-6 w-6" /> },
            { value: "80", label: "Leads automatisch qualifiziert", suffix: "%", icon: <Target className="h-6 w-6" /> },
            { value: "48", label: "Bis zum ersten Termin", suffix: "h", icon: <Calendar className="h-6 w-6" /> },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="text-center"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
                {item.icon}
              </div>
              <p className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {item.value === "24/7" ? (
                  "24/7"
                ) : (
                  <AnimatedCounter target={item.value} suffix={item.suffix} />
                )}
              </p>
              <p className="mt-1 text-sm text-slate-500">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Enterprise Banner – eigene Full-Width Section */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.08] via-navy-900 to-purple-500/[0.04]"
        >
          {/* Dekorativer Glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-purple-500/[0.08] blur-[80px]" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-purple-500/[0.06] blur-[80px]" />

          <div className="relative flex flex-col gap-8 p-10 sm:p-14 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/25 to-purple-600/10 border border-purple-500/20 shadow-lg shadow-purple-500/10">
                  <Building2 className="h-7 w-7 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white sm:text-3xl">Enterprise</h3>
                  <p className="text-sm text-purple-300/60">
                    {enterprise.monthlyPrice}€/Monat &bull; individuell angepasst
                  </p>
                </div>
              </div>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400">
                Massgeschneiderte Loesung fuer Unternehmen mit hohem Volumen.
                White-Label, eigene Infrastruktur und dedizierter Support.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {enterprise.features.slice(0, -1).map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 text-sm text-slate-300"
                  >
                    <Check className="h-4 w-4 shrink-0 text-purple-400" />
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 lg:items-end">
              <a
                href="https://wa.me/4917647666407?text=Hi%2C%20ich%20interessiere%20mich%20f%C3%BCr%20die%20Enterprise-Loesung!"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full bg-purple-500 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-400 hover:scale-[1.02]"
              >
                <MessageCircle className="h-4 w-4" />
                Demo buchen
                <ArrowRight className="h-4 w-4" />
              </a>
              <span className="text-xs text-slate-600">
                Antwort innerhalb 24 Stunden
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Visuelle Trennung: Enterprise → Add-Ons */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
          <Sparkles className="h-4 w-4 text-purple-500/30" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
        </div>
      </div>

      {/* Add-Ons */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-purple-400/70">
            Erweiterungen
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Optionale Add-ons
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Fuer alle Pakete buchbar. Jederzeit hinzufueg- und kuendbar.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {addons.map((addon, i) => (
            <motion.div
              key={addon.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-6 transition-all duration-300 hover:border-purple-500/15 hover:bg-white/[0.025]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 transition group-hover:bg-purple-500/15">
                  {addon.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {addon.name}
                  </h3>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                {addon.description}
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-xl font-bold text-white">
                  +{addon.price}€
                </span>
                <span className="text-xs text-slate-600">/Monat</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Vergleichstabelle */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div className="divider-purple mb-16" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-purple-400/70">
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
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-10 overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.01]"
        >
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="sticky left-0 z-10 bg-navy-950 px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Feature
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                  Starter
                </th>
                <th className="px-4 py-4 text-center">
                  <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-400">
                    Growth
                  </span>
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                  Professional
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => {
                if (row.category) {
                  return (
                    <tr
                      key={i}
                      className="border-t border-white/[0.04] bg-white/[0.02]"
                    >
                      <td
                        colSpan={5}
                        className="sticky left-0 z-10 bg-[rgba(255,255,255,0.02)] px-6 py-3 text-xs font-bold uppercase tracking-wider text-purple-300/70"
                      >
                        {row.feature}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr
                    key={i}
                    className="border-t border-white/[0.03] transition hover:bg-white/[0.015]"
                  >
                    <td className="sticky left-0 z-10 bg-navy-950 px-6 py-3.5 text-sm text-slate-400">
                      {row.feature}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <ComparisonCell value={row.starter} />
                    </td>
                    <td className="px-4 py-3.5 text-center bg-purple-500/[0.02]">
                      <ComparisonCell value={row.growth} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <ComparisonCell value={row.professional} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <ComparisonCell value={row.enterprise} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-purple-500/15 bg-purple-500/[0.03] p-10 text-center sm:p-14 glow-purple"
        >
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Bereit, Ihren Vertrieb zu automatisieren?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-slate-500">
            Starten Sie in unter 48 Stunden. Monatlich kuendbar.
            30-Tage-Geld-zurueck-Garantie.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="https://wa.me/4917647666407?text=Hi%2C%20ich%20moechte%20mit%20AI%20Conversion%20starten!"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow-green flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-400 hover:scale-[1.02]"
            >
              <MessageCircle className="h-4 w-4" />
              Jetzt per WhatsApp starten
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/faq"
              className="text-sm text-slate-500 transition hover:text-purple-300"
            >
              Haeufige Fragen &rarr;
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer Badges */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 px-6">
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <Shield className="h-3.5 w-3.5 text-purple-400/50" />
            DSGVO-konform
          </span>
          <span className="h-3 w-px bg-white/[0.06]" />
          <span className="text-xs text-slate-600">
            Hosting Frankfurt, Deutschland
          </span>
          <span className="h-3 w-px bg-white/[0.06]" />
          <span className="text-xs text-slate-600">Made in Germany</span>
          <span className="h-3 w-px bg-white/[0.06]" />
          <span className="text-xs text-slate-600">
            AES-256-GCM Verschluesselung
          </span>
          <span className="h-3 w-px bg-white/[0.06]" />
          <Link
            href="/datenschutz"
            className="text-xs text-slate-600 transition hover:text-purple-300"
          >
            Datenschutz
          </Link>
          <span className="h-3 w-px bg-white/[0.06]" />
          <Link
            href="/impressum"
            className="text-xs text-slate-600 transition hover:text-purple-300"
          >
            Impressum
          </Link>
        </div>
      </footer>
    </div>
  );
}
