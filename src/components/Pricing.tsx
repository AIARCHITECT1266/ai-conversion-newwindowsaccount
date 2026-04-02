"use client";

import { motion } from "framer-motion";
import { Check, MessageCircle, ArrowRight, Crown } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "997",
    description: "Perfekt für den Einstieg",
    features: [
      "1 WhatsApp Business Nummer",
      "KI-Bot mit 5 Gesprächsflüssen",
      "Automatisches Lead-Scoring",
      "Basis-CRM-Integration",
      "E-Mail-Support",
      "Monatliches Reporting",
    ],
    cta: "Jetzt starten",
    popular: false,
  },
  {
    name: "Professional",
    price: "1.997",
    description: "Für maximale Ergebnisse",
    features: [
      "Bis zu 3 WhatsApp Nummern",
      "Unbegrenzte Gesprächsflüsse",
      "Memory-System & Lead-Scoring",
      "Kalender-Integration",
      "Volle CRM-Integration",
      "Prioritäts-Support",
      "Wöchentliche Optimierung",
      "A/B-Testing der Dialoge",
    ],
    cta: "Beliebteste Wahl",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Individuell",
    description: "Für große Organisationen",
    features: [
      "Unbegrenzte WhatsApp Nummern",
      "Custom KI-Modell-Training",
      "Multi-Language Support",
      "Dedizierter Account Manager",
      "API-Zugang",
      "Custom Integrationen",
      "SLA-Garantie",
      "Onsite-Onboarding",
    ],
    cta: "Kontakt aufnehmen",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-40 lg:py-56">
      <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-purple-400/70">
            Investition
          </p>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Wählen Sie Ihren{" "}
            <span className="text-gradient-purple">Wachstumsplan</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base text-slate-500">
            Transparent. Keine versteckten Kosten. Monatlich kündbar.
          </p>
        </motion.div>

        {/* 30-Day Challenge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="mx-auto mt-16 max-w-2xl rounded-3xl border border-purple-500/15 bg-purple-500/[0.03] p-10 text-center glow-purple"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-500/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-purple-300/80">
            <Crown className="h-3.5 w-3.5" />
            Flaggschiff
          </div>
          <h3 className="text-2xl font-bold text-white sm:text-3xl">
            30-Tage-100-Leads-Challenge
          </h3>
          <p className="mt-3 text-base text-slate-400">
            <strong className="text-white">100 qualifizierte Leads in 30 Tagen</strong> —
            oder Sie zahlen nichts. Null Risiko.
          </p>
          <a
            href="https://wa.me/4917647666407?text=Hi%2C%20ich%20interessiere%20mich%20für%20die%2030-Tage-Challenge!"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow-green mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/15 hover:bg-emerald-400 hover:scale-[1.02]"
          >
            <MessageCircle className="h-4 w-4" />
            Challenge annehmen
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>

        {/* Plans */}
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
              className={`relative rounded-2xl border p-8 transition-all duration-500 ${
                plan.popular
                  ? "border-purple-500/20 bg-purple-500/[0.04] glow-purple"
                  : "glass-card bg-white/[0.015] hover:border-white/[0.08]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-500 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Empfohlen
                </div>
              )}

              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{plan.description}</p>

              <div className="my-7 flex items-baseline gap-1">
                {plan.price !== "Individuell" ? (
                  <>
                    <span className="text-4xl font-bold text-white">{plan.price}€</span>
                    <span className="text-sm text-slate-600">/Monat</span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-gradient-purple">{plan.price}</span>
                )}
              </div>

              <ul className="mb-8 space-y-3">
                {plan.features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-purple-400/60" />
                    <span className="text-slate-400">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="https://wa.me/4917647666407?text=Hi%2C%20ich%20interessiere%20mich%20für%20den%20Plan%20"
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full rounded-full py-3.5 text-center text-sm font-semibold transition-all duration-300 ${
                  plan.popular
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/15 hover:bg-purple-400"
                    : "border border-white/[0.06] text-slate-300 hover:border-purple-500/20 hover:text-white"
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
