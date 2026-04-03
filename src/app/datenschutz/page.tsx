import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | AI Conversion",
  description:
    "Datenschutzerklärung von AI Conversion (ai-conversion.ai) – Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.",
  robots: "noindex, follow",
};

export default function Datenschutz() {
  return (
    <main className="relative min-h-screen">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[5%] h-[700px] w-[700px] rounded-full bg-purple-600/[0.12] blur-[180px]" />
        <div className="absolute right-[5%] top-[40%] h-[500px] w-[500px] rounded-full bg-emerald-500/[0.06] blur-[160px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-20 lg:py-32">
        {/* Back link */}
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-purple-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Startseite
        </Link>

        {/* Header */}
        <h1 className="text-gradient-purple mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Datenschutzerklärung
        </h1>
        <p className="mb-16 text-sm text-slate-600">
          Stand: April 2026 · Gültig ab Nutzung unserer Website und Dienste
        </p>

        {/* Content */}
        <div className="prose prose-invert prose-slate max-w-none space-y-14 text-[15px] leading-relaxed text-slate-400">
          {/* 1 – Verantwortlicher */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              1. Verantwortlicher
            </h2>
            <p>
              Verantwortlich für die Datenverarbeitung auf dieser Website ist:
            </p>
            <p className="mt-3">
              AI Conversion<br />
              Philipp Motzer<br />
              Bezirk Telawi, 2212 Dorf Ruispiri<br />
              Georgien
            </p>
            <p className="mt-3">
              AI Conversion ist eine Marke von Philipp Motzer, eingetragenem
              Individual Entrepreneur in Georgien.
            </p>
            <p className="mt-3">
              E-Mail: hello@ai-conversion.ai<br />
              Telefon: wird nachgereicht
            </p>
          </section>

          {/* 2 – Übersicht */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              2. Übersicht der Verarbeitungen
            </h2>
            <p>
              Wir verarbeiten personenbezogene Daten nur, soweit dies zur
              Bereitstellung unserer Website, unserer KI-gestützten
              WhatsApp-Services und zur Erfüllung vertraglicher oder
              gesetzlicher Pflichten erforderlich ist.
            </p>
          </section>

          {/* 3 – Erhobene Daten */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              3. Welche Daten wir erheben
            </h2>

            <h3 className="mb-2 mt-6 text-[15px] font-medium text-slate-300">
              3.1 Automatisch bei Website-Besuch
            </h3>
            <ul className="list-inside list-disc space-y-1 text-slate-400">
              <li>IP-Adresse (anonymisiert)</li>
              <li>Datum und Uhrzeit des Zugriffs</li>
              <li>Browsertyp und -version, Betriebssystem</li>
              <li>Referrer-URL</li>
              <li>Aufgerufene Seiten und Verweildauer</li>
            </ul>

            <h3 className="mb-2 mt-6 text-[15px] font-medium text-slate-300">
              3.2 Bei Nutzung unseres WhatsApp-Services
            </h3>
            <ul className="list-inside list-disc space-y-1 text-slate-400">
              <li>WhatsApp-Telefonnummer und Profilname</li>
              <li>Nachrichteninhalte und Zeitstempel</li>
              <li>Vom Chatbot erfasste Angaben (z.&nbsp;B. Name, Unternehmen, Anliegen)</li>
            </ul>

            <h3 className="mb-2 mt-6 text-[15px] font-medium text-slate-300">
              3.3 Bei Terminbuchung oder Kontaktaufnahme
            </h3>
            <ul className="list-inside list-disc space-y-1 text-slate-400">
              <li>Name, E-Mail-Adresse, Telefonnummer</li>
              <li>Unternehmen und Nachrichteninhalt</li>
              <li>Gewählter Terminslot</li>
            </ul>
          </section>

          {/* 4 – Zweck */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              4. Zweck der Datenverarbeitung
            </h2>
            <ul className="list-inside list-disc space-y-1 text-slate-400">
              <li>Bereitstellung und Optimierung unserer Website</li>
              <li>Durchführung unseres KI-gestützten WhatsApp-Chatbot-Services</li>
              <li>Lead-Qualifizierung und Vertriebsunterstützung</li>
              <li>Beantwortung von Anfragen und Terminvereinbarungen</li>
              <li>Analyse und Verbesserung unserer Dienste</li>
              <li>Erfüllung gesetzlicher Aufbewahrungspflichten</li>
            </ul>
          </section>

          {/* 5 – Rechtsgrundlage */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              5. Rechtsgrundlage
            </h2>
            <p>Die Verarbeitung erfolgt auf Basis folgender Rechtsgrundlagen:</p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-slate-400">
              <li>
                <strong className="text-slate-300">Art. 6 Abs. 1 lit. a DSGVO</strong> – Einwilligung
                (z.&nbsp;B. bei erstmaliger Kontaktaufnahme via WhatsApp)
              </li>
              <li>
                <strong className="text-slate-300">Art. 6 Abs. 1 lit. b DSGVO</strong> – Vertragserfüllung
                bzw. vorvertragliche Maßnahmen
              </li>
              <li>
                <strong className="text-slate-300">Art. 6 Abs. 1 lit. f DSGVO</strong> – Berechtigtes
                Interesse (Website-Analyse, IT-Sicherheit)
              </li>
            </ul>
          </section>

          {/* 6 – Weitergabe / Drittanbieter */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              6. Weitergabe an Dritte und Drittanbieter
            </h2>
            <p>
              Zur Erbringung unserer Dienste setzen wir folgende
              Auftragsverarbeiter und Drittanbieter ein:
            </p>

            <h3 className="mb-2 mt-6 text-[15px] font-medium text-slate-300">
              6.1 Hosting – Vercel Inc.
            </h3>
            <p>
              Unsere Website wird auf Servern von Vercel Inc. (San Francisco,
              USA) gehostet. Vercel verarbeitet Server-Logdaten (IP-Adresse,
              Zeitstempel) zur Bereitstellung der Website. Es besteht ein
              Data Processing Agreement (DPA) mit Vercel. Die Übermittlung
              in die USA erfolgt auf Grundlage von EU-Standardvertragsklauseln
              (SCCs) gemäß Art. 46 Abs. 2 lit. c DSGVO.
            </p>

            <h3 className="mb-2 mt-6 text-[15px] font-medium text-slate-300">
              6.2 WhatsApp Business API – Meta Platforms
            </h3>
            <p>
              Für unseren Chatbot-Service nutzen wir die WhatsApp Business
              API von Meta Platforms Ireland Ltd. Nachrichten werden
              Ende-zu-Ende-verschlüsselt übertragen. Meta verarbeitet
              Metadaten (Telefonnummer, Zeitstempel) gemäß den eigenen
              Datenschutzbestimmungen. Rechtsgrundlage ist Art. 6 Abs. 1
              lit. b DSGVO (Vertragserfüllung) bzw. Art. 6 Abs. 1 lit. a
              DSGVO (Einwilligung).
            </p>

            <h3 className="mb-2 mt-6 text-[15px] font-medium text-slate-300">
              6.3 KI-Modelle – Anthropic, OpenAI, xAI
            </h3>
            <p>
              Zur intelligenten Verarbeitung von Nutzeranfragen setzen wir
              KI-Sprachmodelle ein, darunter Claude (Anthropic, USA),
              GPT-Modelle (OpenAI, USA) und Grok (xAI, USA). Nachrichten
              werden zur Generierung von Antworten an diese Dienste
              übermittelt. Es gelten jeweils die DPAs der Anbieter. Die
              Übermittlung in die USA erfolgt auf Grundlage von
              EU-Standardvertragsklauseln. Wir nutzen ausschließlich
              API-Zugänge, bei denen Nutzerdaten nicht zum Training der
              Modelle verwendet werden.
            </p>

            <p className="mt-6">
              Darüber hinaus geben wir personenbezogene Daten nur weiter,
              wenn wir gesetzlich dazu verpflichtet sind oder Sie
              ausdrücklich eingewilligt haben.
            </p>
          </section>

          {/* 7 – Cookies */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              7. Cookies und Tracking
            </h2>
            <p>
              Unsere Website verwendet ausschließlich technisch notwendige
              Cookies, die für den Betrieb der Seite erforderlich sind. Ein
              gesondertes Cookie-Banner ist daher nicht erforderlich. Wir
              setzen derzeit keine Tracking- oder Analyse-Cookies ein.
            </p>
          </section>

          {/* 8 – Speicherdauer */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              8. Speicherdauer
            </h2>
            <p>
              Personenbezogene Daten werden gelöscht, sobald der Zweck der
              Verarbeitung entfällt und keine gesetzlichen
              Aufbewahrungsfristen entgegenstehen. Server-Logdaten werden
              nach spätestens 30 Tagen gelöscht. Chat-Verläufe werden nach
              Abschluss der Kommunikation bzw. des Vertragsverhältnisses
              gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten
              bestehen.
            </p>
          </section>

          {/* 9 – Deine Rechte */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              9. Deine Rechte
            </h2>
            <p>
              Dir stehen gemäß DSGVO folgende Rechte zu:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-slate-400">
              <li>
                <strong className="text-slate-300">Auskunft</strong> (Art. 15 DSGVO) – Du kannst
                Auskunft über deine gespeicherten Daten verlangen.
              </li>
              <li>
                <strong className="text-slate-300">Berichtigung</strong> (Art. 16 DSGVO) – Du kannst die
                Korrektur unrichtiger Daten verlangen.
              </li>
              <li>
                <strong className="text-slate-300">Löschung</strong> (Art. 17 DSGVO) – Du kannst die
                Löschung deiner Daten verlangen, sofern keine gesetzliche
                Aufbewahrungspflicht besteht.
              </li>
              <li>
                <strong className="text-slate-300">Einschränkung</strong> (Art. 18 DSGVO) – Du kannst die
                Einschränkung der Verarbeitung verlangen.
              </li>
              <li>
                <strong className="text-slate-300">Datenübertragbarkeit</strong> (Art. 20 DSGVO) – Du
                kannst deine Daten in einem maschinenlesbaren Format erhalten.
              </li>
              <li>
                <strong className="text-slate-300">Widerspruch</strong> (Art. 21 DSGVO) – Du kannst der
                Verarbeitung auf Basis berechtigter Interessen widersprechen.
              </li>
              <li>
                <strong className="text-slate-300">Widerruf der Einwilligung</strong> (Art. 7 Abs. 3
                DSGVO) – Eine erteilte Einwilligung kannst du jederzeit mit
                Wirkung für die Zukunft widerrufen.
              </li>
            </ul>
            <p className="mt-4">
              Zur Ausübung deiner Rechte genügt eine formlose Nachricht an
              die oben genannte E-Mail-Adresse.
            </p>
          </section>

          {/* 10 – Beschwerderecht */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              10. Beschwerderecht bei der Aufsichtsbehörde
            </h2>
            <p>
              Wenn du der Ansicht bist, dass die Verarbeitung deiner
              personenbezogenen Daten gegen die DSGVO verstößt, hast du das
              Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu
              beschweren (Art. 77 DSGVO). Zuständig ist in der Regel die
              Aufsichtsbehörde deines Bundeslandes oder die Behörde am Sitz
              unseres Unternehmens.
            </p>
          </section>

          {/* 11 – Änderungen */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              11. Änderungen dieser Datenschutzerklärung
            </h2>
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen,
              um sie an geänderte Rechtslagen oder Änderungen unserer
              Dienste anzupassen. Es gilt die jeweils aktuelle Fassung auf
              dieser Seite.
            </p>
          </section>
        </div>

        {/* Footer divider */}
        <div className="mt-20 border-t border-white/[0.04] pt-8">
          <p className="text-xs text-slate-700">
            Stand: April 2026
          </p>
        </div>
      </div>
    </main>
  );
}
