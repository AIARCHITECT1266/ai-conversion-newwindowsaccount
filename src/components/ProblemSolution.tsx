"use client";

import { motion } from "framer-motion";
import {
  X,
  CheckCircle,
  Clock,
  Users,
  TrendingDown,
  DollarSign,
  Zap,
  Brain,
  BarChart3,
  RefreshCcw,
} from "lucide-react";

const problems = [
  { icon: Clock, text: "Leads warten stundenlang auf Antwort — und gehen zur Konkurrenz" },
  { icon: Users, text: "Vertriebsteam verschwendet Zeit mit unqualifizierten Anfragen" },
  { icon: TrendingDown, text: "80% der Leads versanden nach dem Erstkontakt ohne Follow-up" },
  { icon: DollarSign, text: "Teure Werbeanzeigen ohne messbare Conversion-Ergebnisse" },
];

const solutions = [
  { icon: Zap, text: "Sofortige Antwort in unter 3 Sekunden — 24/7, 365 Tage im Jahr" },
  { icon: Brain, text: "KI qualifiziert vor und übergibt nur kaufbereite Kontakte" },
  { icon: RefreshCcw, text: "Automatische Follow-ups mit persönlichem Touch und Memory-System" },
  { icon: BarChart3, text: "Jeder Lead wird getrackt, gewertet und konvertiert — vollständig messbar" },
];

export default function ProblemSolution() {
  return (
    <section className="relative py-40 lg:py-56">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center"
        >
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-purple-400/70">
            Vorher vs. Nachher
          </p>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Ihr Vertrieb verliert täglich{" "}
            <span className="text-gradient-purple">bares Geld</span>
          </h2>
        </motion.div>

        <div className="mt-20 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* ── Ohne KI ── */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl glass-card bg-neutral-900/50 p-10"
            style={{
              boxShadow: "inset 0 0 30px rgba(239,68,68,0.06), inset 0 1px 0 rgba(239,68,68,0.15)",
            }}
          >
            {/* Red top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
                <X className="h-4 w-4 text-red-400" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-red-400/90">
                Ohne KI WhatsApp Bot
              </h3>
            </div>

            <div className="space-y-5">
              {problems.map((p, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/[0.06] ring-1 ring-red-500/[0.08]">
                    <p.icon className="h-4 w-4 text-red-400/40" />
                  </div>
                  <div className="flex flex-1 items-start gap-3">
                    <X className="mt-1 h-4 w-4 shrink-0 text-red-400/50" />
                    <span className="text-[15px] leading-relaxed text-slate-400">
                      {p.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Mit KI ── */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl glass-card bg-neutral-900/50 p-10"
            style={{
              boxShadow: "inset 0 0 30px rgba(34,197,94,0.06), inset 0 1px 0 rgba(34,197,94,0.15)",
            }}
          >
            {/* Green top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400/90">
                Mit AI Conversion Bot
              </h3>
            </div>

            <div className="space-y-5">
              {solutions.map((s, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/[0.06] ring-1 ring-emerald-500/[0.08]">
                    <s.icon className="h-4 w-4 text-emerald-400/50" />
                  </div>
                  <div className="flex flex-1 items-start gap-3">
                    <CheckCircle className="mt-1 h-4 w-4 shrink-0 text-emerald-400/70" />
                    <span className="text-[15px] leading-relaxed text-slate-300">
                      {s.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
