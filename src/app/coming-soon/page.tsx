"use client";

import { motion } from "framer-motion";

export default function ComingSoonPage() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden text-white"
      style={{ background: "#07070d", fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      {/* CSS-Variablen */}
      <style>{`
        :root {
          --bg: #07070d;
          --gold: #c9a84c;
          --purple: #8b5cf6;
          --text: #ede8df;
          --text-muted: rgba(237,232,223,0.45);
          --serif: Georgia, serif;
        }
      `}</style>

      {/* Hintergrund-Glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[15%] -top-[10%] h-[700px] w-[700px] rounded-full bg-[rgba(201,168,76,0.06)] blur-[180px]" />
        <div className="absolute -right-[10%] bottom-[10%] h-[500px] w-[500px] rounded-full bg-[rgba(139,92,246,0.05)] blur-[160px]" />
        <div className="absolute left-[40%] top-[60%] h-[300px] w-[300px] rounded-full bg-[rgba(201,168,76,0.03)] blur-[120px]" />
      </div>

      {/* Inhalt */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1
            className="text-4xl font-bold tracking-tight sm:text-5xl"
            style={{ fontFamily: "var(--serif)", color: "#c9a84c" }}
          >
            AI Conversion.
          </h1>
        </motion.div>

        {/* Trennlinie */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-6 h-px w-24"
          style={{ background: "linear-gradient(90deg, transparent, #c9a84c, transparent)" }}
        />

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "#ede8df" }}
        >
          Coming Soon
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-4 max-w-md text-lg"
          style={{ color: "rgba(237,232,223,0.55)" }}
        >
          Wir arbeiten an etwas Großem – bald verfügbar.
        </motion.p>

        {/* Animierter Akzent-Punkt */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-10 flex items-center gap-3"
        >
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#8b5cf6]" />
          <span className="text-sm text-[#8b5cf6]">In Entwicklung</span>
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#8b5cf6]" />
        </motion.div>

        {/* Kontakt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="mt-12 rounded-xl border border-white/[0.06] bg-white/[0.02] px-8 py-5"
        >
          <p className="text-xs" style={{ color: "rgba(237,232,223,0.4)" }}>
            Fragen? Kontaktieren Sie uns
          </p>
          <a
            href="mailto:hello@ai-conversion.ai"
            className="mt-1.5 inline-block text-sm font-medium transition-colors hover:text-[#d4b85c]"
            style={{ color: "#c9a84c" }}
          >
            hello@ai-conversion.ai
          </a>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mt-16 text-xs"
          style={{ color: "rgba(237,232,223,0.25)" }}
        >
          © {new Date().getFullYear()} AI Conversion. Alle Rechte vorbehalten.
        </motion.p>
      </div>
    </div>
  );
}
