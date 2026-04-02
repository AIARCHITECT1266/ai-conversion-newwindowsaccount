"use client";

import { motion } from "framer-motion";
import { Star, Building2, User } from "lucide-react";

const testimonials = [
  {
    name: "Thomas Krüger",
    role: "Geschäftsführer",
    company: "TK Immobilien GmbH",
    gradient: "from-blue-500 to-indigo-600",
    text: "In den ersten 30 Tagen haben wir 127 qualifizierte Leads generiert — mehr als unser gesamtes Team vorher in einem Quartal. Der ROI ist unfassbar.",
    metric: "+127 Leads / 30 Tage",
  },
  {
    name: "Dr. Sarah Hoffmann",
    role: "Vertriebsleiterin",
    company: "DigiHealth Solutions AG",
    gradient: "from-purple-500 to-fuchsia-600",
    text: "Der Bot hat unsere Antwortzeit von 4 Stunden auf 3 Sekunden reduziert. Die Conversion-Rate ist um 340% gestiegen. Ein absoluter Game-Changer für unser Team.",
    metric: "340% mehr Conversions",
  },
  {
    name: "Markus Weber",
    role: "CEO & Inhaber",
    company: "AutoHaus Weber e.K.",
    gradient: "from-emerald-500 to-teal-600",
    text: "Wir haben den Bot skeptisch getestet und waren überwältigt. Er vereinbart eigenständig Probefahrten und qualifiziert Interessenten besser als mancher Verkäufer.",
    metric: "89 Probefahrten / Monat",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.15, ease: "easeOut" as const },
  }),
};

export default function Testimonials() {
  return (
    <section id="testimonials" className="relative py-40 lg:py-56">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-purple-600/[0.025] blur-[160px]" />
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
            Ergebnisse
          </p>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Was unsere <span className="text-gradient-purple">Kunden sagen</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base text-slate-500">
            Echte Ergebnisse von Geschäftsführern und Vertriebsleitern im DACH-Raum.
          </p>
        </motion.div>

        <div className="mt-20 grid gap-6 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className="group relative flex flex-col overflow-hidden rounded-2xl glass-card bg-neutral-900/50 p-10 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.12] hover:shadow-[0_8px_40px_rgba(139,92,246,0.06)]"
            >
              {/* Top accent line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Stars */}
              <div className="mb-5 flex gap-1">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star
                    key={si}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="flex-1 text-[15px] leading-[1.75] text-slate-300">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Metric */}
              <div className="mt-6 inline-flex self-start rounded-full border border-emerald-500/10 bg-emerald-500/[0.05] px-4 py-2 text-[13px] font-semibold text-emerald-400/90">
                {t.metric}
              </div>

              {/* Divider */}
              <div className="my-6 h-px bg-white/[0.04]" />

              {/* Profile */}
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.gradient} shadow-lg`}
                >
                  <User className="h-5 w-5 text-white/90" />
                </div>
                {/* Info */}
                <div>
                  <p className="text-[15px] font-semibold text-white">
                    {t.name}
                  </p>
                  <p className="text-[13px] text-neutral-400">
                    {t.role}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-neutral-500">
                    <Building2 className="h-3 w-3" />
                    {t.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
