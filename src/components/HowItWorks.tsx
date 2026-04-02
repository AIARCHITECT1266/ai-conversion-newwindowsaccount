"use client";

import { motion } from "framer-motion";
import { Phone, Settings, Rocket, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Phone,
    step: "01",
    title: "Strategieberatung",
    description: "In 30 Minuten analysieren wir Ihren Vertriebsprozess und identifizieren die größten Wachstumshebel.",
  },
  {
    icon: Settings,
    step: "02",
    title: "Bot-Setup",
    description: "Wir konfigurieren Ihren KI-Bot exakt auf Ihre Marke, Produkte und Zielgruppe — in unter 48 Stunden.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Launch",
    description: "Ihr Bot geht live und qualifiziert sofort Leads. Wir optimieren kontinuierlich basierend auf echten Daten.",
  },
  {
    icon: TrendingUp,
    step: "04",
    title: "Skalierung",
    description: "Bewährte Ergebnisse skalieren auf weitere Kanäle. Mehr Leads, mehr Umsatz, weniger Aufwand.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32 lg:py-44">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-purple-400/70">
            4 Schritte
          </p>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Vom Erstkontakt zum{" "}
            <span className="text-gradient-purple">automatisierten Vertrieb</span>
          </h2>
        </motion.div>

        {/* Roadmap with connecting line */}
        <div className="relative mt-24">
          {/* Horizontal connecting line (desktop) */}
          <div className="absolute left-0 right-0 top-[3.25rem] hidden h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent lg:block" />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: "easeOut" }}
                className="relative"
              >
                {/* Step circle on the line */}
                <div className="relative z-10 mb-8 flex items-center justify-center">
                  <div className="flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-full border border-purple-500/15 bg-navy-900">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-purple-500/10 bg-purple-500/[0.06]">
                      <step.icon className="h-7 w-7 text-purple-400/80" />
                    </div>
                  </div>
                  {/* Dot on line */}
                  <div className="absolute -bottom-2 left-1/2 hidden h-3 w-3 -translate-x-1/2 rounded-full border-2 border-navy-900 bg-purple-500/60 lg:block" />
                </div>

                {/* Content */}
                <div className="text-center">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-purple-500/40">
                    Schritt {step.step}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{step.description}</p>
                </div>

                {/* Arrow between steps (desktop) */}
                {i < 3 && (
                  <div className="absolute -right-4 top-[3.25rem] hidden text-purple-500/20 lg:block">
                    <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                      <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
