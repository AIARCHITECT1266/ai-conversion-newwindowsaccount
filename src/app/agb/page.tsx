import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "AGB | AI Conversion",
  description:
    "Allgemeine Geschaeftsbedingungen von AI Conversion – SaaS-Plattform fuer WhatsApp-Vertriebsautomatisierung.",
  robots: "noindex, follow",
};

export default function AGB() {
  return (
    <main className="relative min-h-screen">
      {/* Hintergrund-Glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[5%] h-[700px] w-[700px] rounded-full bg-purple-600/[0.12] blur-[180px]" />
        <div className="absolute right-[5%] top-[40%] h-[500px] w-[500px] rounded-full bg-emerald-500/[0.06] blur-[160px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-20 lg:py-32">
        {/* Zurueck-Link */}
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-purple-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurueck zur Startseite
        </Link>

        {/* Header */}
        <h1 className="text-gradient-purple mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Allgemeine Geschaeftsbedingungen
        </h1>
        <p className="mb-16 text-sm text-slate-600">
          Stand: April 2026
        </p>

        {/* Inhalt */}
        <div className="prose prose-invert prose-slate max-w-none space-y-12 text-[15px] leading-relaxed text-slate-400">
          {/* 1. Vertragsgegenstand */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              1. Vertragsgegenstand
            </h2>
            <p>
              Diese Allgemeinen Geschaeftsbedingungen (AGB) regeln die Nutzung
              der SaaS-Plattform &quot;AI Conversion&quot; (nachfolgend
              &quot;Plattform&quot;), die unter der Domain ai-conversion.ai
              betrieben wird.
            </p>
            <p className="mt-3">
              Die Plattform bietet KI-gestuetzte Vertriebsautomatisierung ueber
              die WhatsApp Business API. Sie ermoeglicht es Unternehmen
              (nachfolgend &quot;Nutzer&quot; oder &quot;Mandant&quot;),
              automatisierte Verkaufsgespraeche zu fuehren, Leads zu
              qualifizieren und Termine zu vereinbaren.
            </p>
            <p className="mt-3">
              Anbieter der Plattform ist:
            </p>
            <p className="mt-2">
              Philipp Motzer<br />
              Individual Entrepreneur, Georgien (ID: 331187816)<br />
              Deutsche Geschaeftsadresse: Erfweiler Strasse 12, 66994 Dahn<br />
              E-Mail: hello@ai-conversion.ai
            </p>
          </section>

          {/* 2. Leistungsumfang */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              2. Leistungsumfang
            </h2>
            <p>
              Der konkrete Leistungsumfang richtet sich nach dem vom Nutzer
              gewaehlten Paket (Starter, Growth, Professional oder Enterprise).
              Die Plattform umfasst insbesondere:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li>
                Bereitstellung von KI-Vertriebsbots fuer die WhatsApp Business
                API (Claude Sonnet, GPT-4o)
              </li>
              <li>
                Automatische Lead-Qualifizierung und Lead-Scoring (0–100)
              </li>
              <li>
                Verschluesselte Speicherung aller Nachrichteninhalte
                (AES-256-GCM)
              </li>
              <li>
                Multi-Tenant-Dashboard zur Verwaltung und Auswertung
              </li>
              <li>
                Lead-Pipeline-Visualisierung (MQL → SQL → Opportunity →
                Customer)
              </li>
              <li>
                DSGVO-konforme Datenverarbeitung und -speicherung in Frankfurt
                (EU)
              </li>
            </ul>
            <p className="mt-3">
              Der Anbieter bemueh sich um eine Verfuegbarkeit von 99,9% im
              Jahresmittel. Geplante Wartungsarbeiten werden mindestens 24
              Stunden im Voraus angekuendigt. Eine Garantie fuer
              ununterbrochene Verfuegbarkeit wird nicht uebernommen.
            </p>
          </section>

          {/* 3. Preise & Zahlung */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              3. Preise und Zahlung
            </h2>
            <p>
              Die aktuell gueltigen Preise sind auf der Preisseite unter{" "}
              <Link
                href="/pricing"
                className="text-purple-400 underline decoration-purple-400/30 transition-colors hover:text-purple-300"
              >
                ai-conversion.ai/pricing
              </Link>{" "}
              einsehbar. Die monatlichen Gebuehren bewegen sich je nach Paket
              zwischen 497€ und 5.000€ zzgl. einer einmaligen Setup-Gebuehr.
            </p>
            <p className="mt-3">
              Alle Preise verstehen sich als Nettopreise. Fuer Kunden mit Sitz
              in der EU kann Umsatzsteuer anfallen, sofern gesetzlich
              vorgeschrieben. Die Abrechnung erfolgt ueber unseren
              Zahlungsdienstleister Paddle (Paddle.com Market Ltd), der als
              Merchant of Record fungiert. Paddle stellt die Rechnung und ist
              fuer die korrekte Erhebung der Umsatzsteuer verantwortlich.
            </p>
            <p className="mt-3">
              Die Zahlung erfolgt im Voraus – monatlich oder jaehrlich, je nach
              gewaehltem Abrechnungszeitraum. Bei jaehrlicher Zahlung gewaehren
              wir einen Rabatt von zwei Monatsgebuehren.
            </p>
            <p className="mt-3">
              Zusaetzlich zu den Plattformgebuehren fallen WhatsApp-Nachrichtenkosten
              direkt bei Meta an (ca. 0,11€ pro Marketing-Nachricht).
              Service-Antworten innerhalb von 24 Stunden sind kostenlos. Diese
              Kosten werden nicht ueber AI Conversion abgerechnet.
            </p>
          </section>

          {/* 4. Laufzeit & Kuendigung */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              4. Laufzeit und Kuendigung
            </h2>
            <p>
              Der Vertrag beginnt mit der erfolgreichen Registrierung und
              Zahlung der ersten Gebuehr. Bei monatlicher Abrechnung ist der
              Vertrag jederzeit zum Ende des laufenden Abrechnungszeitraums
              kuendbar. Eine Mindestlaufzeit besteht nicht.
            </p>
            <p className="mt-3">
              Bei jaehrlicher Abrechnung verlaengert sich der Vertrag
              automatisch um ein weiteres Jahr, sofern er nicht mit einer Frist
              von 30 Tagen zum Ende der Laufzeit gekuendigt wird.
            </p>
            <p className="mt-3">
              Die Kuendigung kann per E-Mail an hello@ai-conversion.ai oder
              ueber das Kundenportal bei Paddle erfolgen. Nach Kuendigung
              werden alle gespeicherten Daten gemaess der vereinbarten
              Aufbewahrungsfrist (Standard: 90 Tage) geloescht.
            </p>
            <p className="mt-3">
              Das Recht zur ausserordentlichen Kuendigung aus wichtigem Grund
              bleibt beiden Parteien vorbehalten.
            </p>
          </section>

          {/* 5. Pflichten des Nutzers */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              5. Pflichten des Nutzers
            </h2>
            <p>Der Nutzer verpflichtet sich:</p>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li>
                Die Plattform ausschliesslich im Rahmen der geltenden Gesetze
                zu nutzen, insbesondere der DSGVO und des UWG
              </li>
              <li>
                Nur WhatsApp-Nachrichten an Personen zu senden, die ihre
                Einwilligung erteilt haben (Opt-in)
              </li>
              <li>
                Zugangsdaten vertraulich zu behandeln und nicht an Dritte
                weiterzugeben
              </li>
              <li>
                Keine rechtswidrigen, belaestigenden oder irrefuehrenden
                Inhalte ueber die Plattform zu verbreiten
              </li>
              <li>
                Die WhatsApp Business API Nutzungsrichtlinien von Meta
                einzuhalten
              </li>
              <li>
                Den Anbieter unverzueglich ueber Sicherheitsvorfaelle oder
                Missbrauch zu informieren
              </li>
            </ul>
            <p className="mt-3">
              Bei Verstoss gegen diese Pflichten ist der Anbieter berechtigt,
              den Zugang zur Plattform voruebergehend oder dauerhaft zu
              sperren.
            </p>
          </section>

          {/* 6. Haftungsbeschraenkung */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              6. Haftungsbeschraenkung
            </h2>
            <p>
              Der Anbieter haftet unbeschraenkt fuer Vorsatz und grobe
              Fahrlaessigkeit. Fuer leichte Fahrlaessigkeit haftet der Anbieter
              nur bei Verletzung wesentlicher Vertragspflichten
              (Kardinalpflichten), und zwar beschraenkt auf den
              vorhersehbaren, vertragstypischen Schaden.
            </p>
            <p className="mt-3">
              Die Haftung fuer mittelbare Schaeden, entgangenen Gewinn,
              Datenverlust oder Ausfallzeiten ist – soweit gesetzlich zulaessig
              – ausgeschlossen. Die Haftung ist der Hoehe nach auf die vom
              Nutzer in den letzten 12 Monaten gezahlten Gebuehren beschraenkt.
            </p>
            <p className="mt-3">
              Der Anbieter haftet nicht fuer Stoerungen oder Ausfaelle, die
              durch Drittanbieter verursacht werden (z.B. WhatsApp/Meta,
              Hosting-Provider, KI-Modell-Anbieter).
            </p>
            <p className="mt-3">
              Die Haftung fuer Verletzung von Leben, Koerper und Gesundheit
              sowie die Haftung nach dem Produkthaftungsgesetz bleiben von den
              vorstehenden Beschraenkungen unberuehrt.
            </p>
          </section>

          {/* 7. Datenschutz */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              7. Datenschutz
            </h2>
            <p>
              Der Schutz personenbezogener Daten ist uns ein zentrales
              Anliegen. Alle Details zur Datenverarbeitung finden Sie in
              unserer{" "}
              <Link
                href="/datenschutz"
                className="text-purple-400 underline decoration-purple-400/30 transition-colors hover:text-purple-300"
              >
                Datenschutzerklaerung
              </Link>
              .
            </p>
            <p className="mt-3">
              Wesentliche Punkte:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li>
                Alle Nachrichteninhalte werden mit AES-256-GCM verschluesselt
                gespeichert
              </li>
              <li>
                Datenverarbeitung und -speicherung erfolgt ausschliesslich auf
                Servern in Frankfurt (EU), DSGVO-konform
              </li>
              <li>
                Jeder Mandant erhaelt einen isolierten Datenbereich
                (Multi-Tenant-Isolation)
              </li>
              <li>
                Automatische Datenloeschung nach Ablauf der konfigurierbaren
                Aufbewahrungsfrist (Standard: 90 Tage)
              </li>
              <li>
                Auf Wunsch wird ein Auftragsverarbeitungsvertrag (AVV)
                abgeschlossen
              </li>
            </ul>
          </section>

          {/* 8. Anwendbares Recht */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              8. Anwendbares Recht und Gerichtsstand
            </h2>
            <p>
              Es gilt das Recht der Bundesrepublik Deutschland unter
              Ausschluss des UN-Kaufrechts (CISG). Fuer Verbraucher gelten
              zusaetzlich die zwingenden Verbraucherschutzvorschriften des
              Staates, in dem sie ihren gewoehnlichen Aufenthalt haben.
            </p>
            <p className="mt-3">
              Fuer Streitigkeiten mit Unternehmern ist der Gerichtsstand
              Landau in der Pfalz. Fuer Verbraucher gilt der gesetzliche
              Gerichtsstand.
            </p>
            <p className="mt-3">
              Die Europaeische Kommission stellt eine Plattform zur
              Online-Streitbeilegung (OS) bereit:{" "}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 underline decoration-purple-400/30 transition-colors hover:text-purple-300"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
          </section>

          {/* 9. Kontakt */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              9. Kontakt
            </h2>
            <p>
              Bei Fragen zu diesen AGB oder zur Plattform erreichen Sie uns
              unter:
            </p>
            <p className="mt-3">
              Philipp Motzer<br />
              Individual Entrepreneur (Georgien, ID: 331187816)<br />
              Erfweiler Strasse 12, 66994 Dahn<br />
              E-Mail: hello@ai-conversion.ai
            </p>
          </section>

          {/* Schlussbestimmungen */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              10. Schlussbestimmungen
            </h2>
            <p>
              Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder
              werden, bleibt die Wirksamkeit der uebrigen Bestimmungen
              unberuehrt. An die Stelle der unwirksamen Bestimmung tritt eine
              wirksame Regelung, die dem wirtschaftlichen Zweck der
              unwirksamen Bestimmung am naechsten kommt.
            </p>
            <p className="mt-3">
              Der Anbieter behaelt sich das Recht vor, diese AGB mit
              angemessener Ankuendigungsfrist (mindestens 30 Tage) zu aendern.
              Die Aenderungen werden per E-Mail mitgeteilt. Widerspricht der
              Nutzer nicht innerhalb von 30 Tagen nach Zugang der Mitteilung,
              gelten die geaenderten AGB als angenommen.
            </p>
          </section>
        </div>

        {/* Footer-Trennlinie */}
        <div className="mt-20 border-t border-white/[0.04] pt-8">
          <p className="text-xs text-slate-700">Stand: April 2026</p>
        </div>
      </div>
    </main>
  );
}
