"use client";

import { motion } from "framer-motion";
import { Hexagon, Triangle, Diamond, Pentagon, Octagon } from "lucide-react";

const logos = [
  { icon: Hexagon, name: "SolarTech Pro" },
  { icon: Triangle, name: "Weber Group" },
  { icon: Diamond, name: "DigiHealth AG" },
  { icon: Pentagon, name: "FinanzPlus" },
  { icon: Octagon, name: "AutoHaus König" },
];

export default function LogoCloud() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative z-10 py-20"
    >
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <p className="mb-10 text-center text-[12px] font-medium uppercase tracking-[0.15em] text-slate-600">
          Vertrauen von innovativen Vertriebsteams im DACH-Raum
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-6">
          {logos.map(({ icon: Icon, name }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
              className="flex items-center gap-2.5 opacity-40 grayscale transition-all duration-300 hover:opacity-60 hover:grayscale-0"
            >
              <Icon className="h-5 w-5 text-slate-500" strokeWidth={1.5} />
              <span className="text-[15px] font-semibold tracking-tight text-slate-500">
                {name}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
