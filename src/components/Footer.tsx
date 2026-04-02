"use client";

import { MessageCircle, MapPin, Mail, Phone } from "lucide-react";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.03]">
      <div className="mx-auto max-w-6xl px-6 py-32 lg:px-8">
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
              href="https://wa.me/4917647666407?text=Hi!"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/10 bg-emerald-500/[0.04] px-6 py-3 text-sm font-medium text-emerald-400/80 transition-all hover:bg-emerald-500/[0.08]"
            >
              <MessageCircle className="h-4 w-4" />
              +49 176 47666407
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
                { label: "AGB", href: "#" },
              ].map((link) => (
                <a key={link.label} href={link.href} className="block text-[14px] text-slate-600 transition-colors hover:text-white">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* WhatsApp CTA */}
        <div className="mt-20 flex justify-center">
          <a
            href="https://wa.me/4917647666407?text=Hi%2C%20ich%20interessiere%20mich%20f%C3%BCr%20euren%20KI-WhatsApp-Bot!"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-full bg-emerald-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/30"
          >
            <MessageCircle className="h-5 w-5" />
            Jetzt per WhatsApp starten
          </a>
        </div>

        <div className="mt-16 border-t border-white/[0.03] pt-10">
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
