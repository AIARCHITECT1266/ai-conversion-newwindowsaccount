"use client";

import { MessageCircle, MapPin, Mail, ArrowRight, Shield, Zap, Trophy } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.03]">
      {/* ── Full-width WhatsApp CTA Band ── */}
      <div className="relative overflow-hidden border-b border-white/[0.03] bg-gradient-to-b from-navy-950 to-navy-900">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.06] blur-[160px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-6 py-24 text-center lg:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.05] px-4 py-1.5">
            <Trophy className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[12px] font-semibold tracking-wide text-emerald-400">
              30-Tage-100-Leads-Challenge
            </span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Bereit für 100+ qualifizierte Leads
            <br className="hidden sm:block" />
            <span className="text-gradient-purple"> in nur 30 Tagen?</span>
          </h2>

          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-slate-400">
            Starten Sie jetzt Ihre Challenge — unser KI-Bot übernimmt den
            kompletten Vertrieb über WhatsApp. Kein Risiko, garantierte Ergebnisse.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="mailto:hello@ai-conversion.ai?subject=Anfrage"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-full bg-emerald-500 px-9 py-4.5 text-[15px] font-bold text-white shadow-[0_0_50px_rgba(37,211,102,0.25)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_60px_rgba(37,211,102,0.35)] hover:scale-[1.02]"
            >
              <MessageCircle className="h-5 w-5" />
              Jetzt starten
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[12px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500/40" />
              100% DSGVO-konform
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-emerald-500/40" />
              Live in 48 Stunden
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-emerald-500/40" />
              100-Leads-Garantie
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Content ── */}
      <div className="mx-auto max-w-6xl px-6 py-24 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="#" className="inline-block">
              <Image
                src="/logo1.png"
                alt="AI Conversion"
                width={1024}
                height={1024}
                className="h-24 w-auto sm:h-28"
              />
            </a>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed text-slate-600">
              Premium KI-Technologie für Unternehmen, die ihren
              WhatsApp-Kanal in eine automatisierte Vertriebs-Maschine
              verwandeln wollen.
            </p>
            <a
              href="mailto:hello@ai-conversion.ai?subject=Anfrage"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/10 bg-emerald-500/[0.04] px-6 py-3 text-sm font-medium text-emerald-400/80 transition-all hover:bg-emerald-500/[0.08]"
            >
              <MessageCircle className="h-4 w-4" />
              hello@ai-conversion.ai
            </a>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-6 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              Produkt
            </h4>
            <ul className="space-y-4">
              {[
                { label: "Features", href: "#features" },
                { label: "Pricing", href: "#pricing" },
                { label: "Ergebnisse", href: "#testimonials" },
                { label: "So funktioniert's", href: "#how-it-works" },
                { label: "FAQ", href: "/faq" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-[15px] text-slate-600 transition-colors hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-6 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              Kontakt & Rechtliches
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-2 text-[14px] text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" />
                <span>
                  AI Conversion<br />
                  Philipp Motzer<br />
                  Bezirk Telawi, 2212 Dorf Ruispiri<br />
                  Georgien
                </span>
              </li>
              <li className="flex items-center gap-2 text-[14px] text-slate-600">
                <Mail className="h-4 w-4 shrink-0 text-slate-700" />
                hello@ai-conversion.ai
              </li>
            </ul>
            <div className="mt-6 space-y-2">
              {[
                { label: "Impressum", href: "/impressum" },
                { label: "Datenschutz", href: "/datenschutz" },
              ].map((link) => (
                <a key={link.label} href={link.href} className="block text-[14px] text-slate-600 transition-colors hover:text-white">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-20 border-t border-white/[0.03] pt-10">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <p className="text-xs tracking-wide text-slate-700">
              &copy; {new Date().getFullYear()} AI Conversion · Philipp Motzer. Alle Rechte vorbehalten.
            </p>
            <p className="text-xs tracking-wide text-slate-700">
              Individual Entrepreneur · Georgien · ID 331187816
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
