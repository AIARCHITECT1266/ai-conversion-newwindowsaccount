"use client";

import { motion } from "framer-motion";
import { MessageCircle, ArrowRight, Tag, Headphones, Lightbulb } from "lucide-react";

const benefits = [
  {
    icon: Tag,
    title: "Vorzugspreis",
    description: "Erster Monat kostenlos bei 3-Monats-Commitment",
    color: "emerald",
  },
  {
    icon: Headphones,
    title: "Direkter Draht",
    description: "Persönlicher Ansprechpartner, keine Tickets",
    color: "purple",
  },
  {
    icon: Lightbulb,
    title: "Mitgestalten",
    description: "Dein Feedback formt das Produkt",
    color: "emerald",
  },
];

export default function PilotSection() {
  return (
    <section className="relative py-32 lg:py-44">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/[0.04] blur-[180px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/15 bg-purple-500/[0.04] px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[12px] font-semibold tracking-wide text-purple-200/80">
              Nur 5 Plätze verfügbar
            </span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Werde einer unserer ersten 5{" "}
            <span className="text-gradient-purple">Pilotpartner</span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-slate-400">
            Wir suchen Unternehmen, die gemeinsam mit uns wachsen wollen —
            zu Vorzugskonditionen, mit direktem Draht zu unserem Team und
            garantierter persönlicher Betreuung.
          </p>
        </motion.div>

        {/* Benefit Cards */}
        <div className="mt-16 grid gap-5 sm:grid-cols-3">
          {benefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
              className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-8 text-center transition-all duration-500 hover:border-white/[0.08]"
            >
              <div
                className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                  benefit.color === "emerald"
                    ? "bg-emerald-500/[0.08]"
                    : "bg-purple-500/[0.08]"
                }`}
              >
                <benefit.icon
                  className={`h-6 w-6 ${
                    benefit.color === "emerald"
                      ? "text-emerald-400"
                      : "text-purple-400"
                  }`}
                />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-white">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="mt-14 text-center"
        >
          <a
            href="mailto:hello@ai-conversion.ai?subject=Pilotpartner%20Anfrage"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow-green group inline-flex items-center gap-3 rounded-full bg-emerald-500 px-9 py-4.5 text-[15px] font-bold text-white shadow-[0_0_40px_rgba(37,211,102,0.2)] hover:bg-emerald-400 hover:scale-[1.02]"
          >
            <MessageCircle className="h-5 w-5" />
            Als Pilotpartner bewerben
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <p className="mt-4 text-[13px] text-slate-600">
            Kostenlos & unverbindlich — Antwort innerhalb von 24h
          </p>
        </motion.div>
      </div>
    </section>
  );
}
