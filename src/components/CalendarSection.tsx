"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  Clock,
  Video,
  ArrowRight,
  MessageCircle,
  X,
  Sparkles,
} from "lucide-react";

const benefits = [
  {
    icon: Video,
    title: "Persönliches 1:1 Gespräch",
    desc: "Individuelle Analyse Ihrer Situation — keine Gruppenpräsentation",
  },
  {
    icon: Clock,
    title: "Nur 30 Minuten",
    desc: "Kompakt und werthaltig — Ihre Zeit ist kostbar",
  },
  {
    icon: CalendarCheck,
    title: "Konkreter Aktionsplan",
    desc: "Klarer Fahrplan für Ihren WhatsApp-Vertrieb — direkt umsetzbar",
  },
];

export default function CalendarSection() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section id="contact" className="relative py-40 lg:py-56">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-purple-600/[0.025] blur-[160px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center"
          >
            <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-purple-400/70">
              Nächster Schritt
            </p>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Bereit für den{" "}
              <span className="text-gradient-purple">nächsten Schritt?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-slate-500">
              Buchen Sie jetzt Ihre kostenlose Potenzialanalyse.
              In 30 Minuten zeigen wir Ihnen, wie der KI WhatsApp Bot
              konkret in Ihrem Business funktioniert.
            </p>
          </motion.div>

          <div className="mt-20 grid items-center gap-12 lg:grid-cols-2">
            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div className="space-y-4">
                {benefits.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-5 rounded-2xl glass-card bg-neutral-900/50 p-6"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/[0.08]">
                      <item.icon className="h-5 w-5 text-purple-400/80" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{item.title}</h4>
                      <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="mailto:hello@ai-conversion.ai?subject=Beratungstermin"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glow-green mt-8 inline-flex items-center gap-3 rounded-full bg-emerald-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/15 hover:bg-emerald-400 hover:scale-[1.02]"
              >
                <MessageCircle className="h-5 w-5" />
                Beratungstermin anfragen
                <ArrowRight className="h-5 w-5" />
              </a>
            </motion.div>

            {/* CTA Card with Calendly Modal trigger */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="relative overflow-hidden rounded-2xl glass-card bg-neutral-900/50"
            >
              {/* Top accent */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

              <div className="flex min-h-[440px] flex-col items-center justify-center p-12 text-center">
                {/* Icon */}
                <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-purple-500/10 bg-purple-500/[0.06]">
                  <CalendarCheck className="h-9 w-9 text-purple-400/70" />
                </div>

                <h3 className="text-2xl font-bold text-white">
                  Kostenlose Potenzialanalyse
                </h3>
                <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-slate-400">
                  Wählen Sie Ihren Wunschtermin für eine persönliche
                  Strategieberatung mit unserem Experten-Team.
                </p>

                {/* Primary CTA — opens modal */}
                <button
                  onClick={() => setModalOpen(true)}
                  className="mt-8 flex items-center gap-2.5 rounded-full bg-purple-500 px-8 py-4 text-sm font-bold text-white shadow-[0_0_30px_rgba(139,92,246,0.2)] transition-all duration-300 hover:bg-purple-400 hover:shadow-[0_0_50px_rgba(139,92,246,0.3)] hover:scale-[1.02]"
                >
                  <Sparkles className="h-4 w-4" />
                  Termin im Kalender wählen
                </button>

                <p className="mt-4 text-[13px] text-slate-600">
                  Kostenlos · Unverbindlich · 30 Minuten
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Calendly Modal ─── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative z-10 h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/[0.06] bg-navy-900 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
            >
              {/* Close button */}
              <button
                onClick={() => setModalOpen(false)}
                className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-slate-400 transition-colors hover:bg-white/[0.1] hover:text-white"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Calendly iframe – URL wird aus NEXT_PUBLIC_CALENDLY_URL geladen */}
              {process.env.NEXT_PUBLIC_CALENDLY_URL ? (
                <iframe
                  src={`${process.env.NEXT_PUBLIC_CALENDLY_URL}?hide_gdpr_banner=1&background_color=08081a&text_color=e2e8f0&primary_color=8b5cf6`}
                  className="h-full w-full border-0"
                  title="Termin buchen"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <p className="text-center text-sm">
                    Terminbuchung wird in Kürze verfügbar sein.<br />
                    Kontaktieren Sie uns unter{" "}
                    <a href="mailto:hello@ai-conversion.ai" className="text-purple-400 underline">
                      hello@ai-conversion.ai
                    </a>
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
