"use client";

import { motion } from "framer-motion";
import {
  Brain,
  BarChart3,
  CalendarCheck,
  MessageSquare,
  Zap,
  Globe,
  Lock,
  RefreshCcw,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Memory-System",
    description: "Erinnert sich an jeden Kontakt, vergangene Gespräche und Präferenzen. Jede Interaktion wird persönlicher.",
  },
  {
    icon: BarChart3,
    title: "Lead-Scoring",
    description: "Bewertet Leads in Echtzeit nach Kaufbereitschaft, Budget und Dringlichkeit. Ihr Team fokussiert sich auf die Besten.",
  },
  {
    icon: CalendarCheck,
    title: "Kalender-Integration",
    description: "Direkte Terminbuchung im Chat. Synchronisiert sich mit Ihrem Kalender und bucht qualifizierte Leads automatisch ein.",
  },
  {
    icon: MessageSquare,
    title: "Natürliche Dialoge",
    description: "Empathische, verkaufsstarke Konversationen, die sich wie echte Gespräche anfühlen — kein stumpfer Chatbot.",
  },
  {
    icon: Zap,
    title: "Instant Follow-ups",
    description: "Automatische Nachfass-Sequenzen per WhatsApp. Kein Lead geht verloren — systematisch zum Abschluss.",
  },
  {
    icon: Globe,
    title: "50+ Sprachen",
    description: "Kommuniziert nahtlos in Deutsch, Englisch und über 50 weiteren Sprachen — perfekt für internationale Märkte.",
  },
  {
    icon: Lock,
    title: "Enterprise-Security",
    description: "End-to-End verschlüsselt, DSGVO-konform, deutsche Server. Ihre Daten sind jederzeit geschützt.",
  },
  {
    icon: RefreshCcw,
    title: "CRM-Integration",
    description: "Nahtlose Anbindung an HubSpot, Salesforce, Pipedrive & Co. Alle Daten fließen automatisch in Ihr CRM.",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-40 lg:py-56">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-purple-600/[0.025] blur-[180px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-purple-400/70">
            Premium Features
          </p>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Ein Bot.{" "}
            <span className="text-gradient-purple">Unendliche Möglichkeiten.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-500">
            Modernste KI-Technologie trifft verkaufspsychologische Intelligenz.
          </p>
        </motion.div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
              className="group rounded-2xl glass-card bg-white/[0.015] p-7 transition-all duration-500 hover:border-purple-500/15 hover:bg-purple-500/[0.03]"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/[0.08] text-purple-400/80 transition-colors duration-500 group-hover:bg-purple-500/15 group-hover:text-purple-300">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-[15px] font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-slate-500">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
