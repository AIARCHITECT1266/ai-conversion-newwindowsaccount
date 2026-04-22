"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import Navigation from "@/components/Navigation";

// FAQ-Update 22.04.2026: WhatsApp-spezifische Fragen ersetzt durch
// Web-Widget-Perspektive. WhatsApp-Integration ist fuer Q3 2026
// geplant (Meta-Business-Verifizierung laeuft). Siehe TD-Marketing-03.
const faqs = [
  {
    q: "Wie wird der Bot in meine Website eingebunden?",
    a: "Sie erhalten einen kurzen JavaScript-Snippet, den Sie in Ihrer Website einbetten — analog zu einem Analytics-Tag. Das Widget läuft in einer eigenen iframe-Sandbox (CSP-konform), ist mobil-optimiert und passt sich an Ihre Brand-Farben an. Setup in unter 10 Minuten.",
  },
  {
    q: "Wie lange dauert die Einrichtung?",
    a: "Ihr Widget ist in der Regel innerhalb von 48 Stunden live. Wir übernehmen das komplette Setup inklusive Prompt-Feinschliff auf Ihre Anfragen-Szenarien — Sie brauchen nur 30 Minuten für das Onboarding-Gespräch.",
  },
  {
    q: "Ist das DSGVO-konform?",
    a: "Ja. Verarbeitung ausschließlich in Frankfurt, Auftragsverarbeitungsvertrag (AVV) inklusive, Nachrichten AES-256-verschlüsselt, EU-Vertreter gemäß Art. 27 DSGVO benannt. Consent-Dialog vor dem ersten Chat-Turn, Löschfunktion pro Konversation.",
  },
  {
    q: "Kann ich monatlich kündigen?",
    a: "Ja, alle Pakete sind monatlich kündbar. Keine Mindestlaufzeit — wir sind überzeugt genug, darauf zu verzichten.",
  },
  {
    q: "Was passiert wenn der Bot eine Frage nicht beantworten kann?",
    a: "Der Bot übergibt nahtlos an einen menschlichen Mitarbeiter — mit vollständigem Gesprächsverlauf. Kein Interessent muss sein Anliegen wiederholen.",
  },
  {
    q: "Welche CRM-Systeme werden unterstützt?",
    a: "Starter: HubSpot (kostenlos), Google Sheets. Professional: HubSpot, Pipedrive, Salesforce, Brevo und weitere per Zapier/Make. Enterprise: jede API-fähige Software.",
  },
  {
    q: "Funktioniert das auch für B2B-Vertrieb?",
    a: "Ja, besonders gut. Der Bot qualifiziert nach Budget, Zeitrahmen und Entscheidungskompetenz und bucht nur dann Termine, wenn die Kriterien erfüllt sind.",
  },
  {
    q: "Wird WhatsApp als Kanal unterstützt?",
    a: "WhatsApp ist für Q3 2026 eingeplant — derzeit läuft die Meta-Business-Verifizierung. Der Pilot fokussiert auf das Web-Widget, weil es ohne Verifizierungs-Wartezeit einsatzfähig ist und sich direkt in die bestehende Website Ihrer Weiterbildung oder Ihres Inbound-Teams einbetten lässt.",
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/[0.04]">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-6 text-left transition-colors hover:text-white"
      >
        <span className="text-[15px] font-medium text-slate-300">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-600 transition-transform duration-300 ${
            open ? "rotate-180 text-purple-400" : ""
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] pb-6" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-[15px] leading-relaxed text-slate-500">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  return (
    <main className="relative min-h-screen">
      <Navigation />

      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[5%] h-[700px] w-[700px] rounded-full bg-purple-600/[0.12] blur-[180px]" />
        <div className="absolute right-[5%] top-[40%] h-[500px] w-[500px] rounded-full bg-emerald-500/[0.06] blur-[160px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 pt-32 pb-20 lg:pt-40 lg:pb-32">
        {/* Header */}
        <h1 className="text-gradient-purple mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Häufige Fragen
        </h1>
        <p className="mb-16 text-[15px] text-slate-500">
          Alles, was Sie über unsere KI-Lead-Qualifizierung wissen müssen.
        </p>

        {/* Accordion */}
        <div className="divide-y-0">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-white/[0.04] bg-white/[0.015] p-8 text-center">
          <p className="text-lg font-semibold text-white">
            Noch Fragen?
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Schreiben Sie uns direkt — wir antworten innerhalb von 24 Stunden.
          </p>
          <a
            href="mailto:hello@ai-conversion.ai?subject=Anfrage"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/15 transition-all hover:bg-emerald-400"
          >
            Jetzt Kontakt aufnehmen
          </a>
        </div>

        {/* Footer divider */}
        <div className="mt-20 border-t border-white/[0.04] pt-8">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-700">
              &copy; {new Date().getFullYear()} AI Conversion · Philipp Motzer
            </p>
            <div className="flex gap-4 text-xs text-slate-700">
              <Link href="/impressum" className="transition-colors hover:text-white">Impressum</Link>
              <Link href="/datenschutz" className="transition-colors hover:text-white">Datenschutz</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
