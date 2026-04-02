import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Impressum | KI Growth Agentur",
  description: "Impressum der KI Growth Agentur gemäß § 5 TMG.",
  robots: "noindex, follow",
};

export default function Impressum() {
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
          Impressum
        </h1>
        <p className="mb-16 text-sm text-slate-600">
          Angaben gemäß § 5 TMG
        </p>

        {/* Content */}
        <div className="prose prose-invert prose-slate max-w-none space-y-12 text-[15px] leading-relaxed text-slate-400">
          {/* Anbieter */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Diensteanbieter
            </h2>
            <p>
              AI Conversion<br />
              Philipp Motzer<br />
              Bezirk Telawi, 2212 Dorf Ruispiri<br />
              Georgien
            </p>
            <p className="mt-3">
              AI Conversion ist eine Marke von Philipp Motzer, eingetragenem
              Individual Entrepreneur in Georgien.
            </p>
          </section>

          {/* Kontakt */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Kontakt
            </h2>
            <p>
              Telefon: wird nachgereicht<br />
              E-Mail: hello@ai-conversion.ai
            </p>
          </section>

          {/* Umsatzsteuer */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Identifikationsnummer
            </h2>
            <p>
              Georgische Identifikationsnummer:<br />
              331187816
            </p>
          </section>

          {/* Verantwortlich */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Redaktionell verantwortlich
            </h2>
            <p>
              Philipp Motzer<br />
              Bezirk Telawi, 2212 Dorf Ruispiri<br />
              Georgien
            </p>
          </section>

          {/* EU-Streitschlichtung */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              EU-Streitschlichtung
            </h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur
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
            <p className="mt-3">
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
          </section>

          {/* Verbraucherstreitbeilegung */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Verbraucherstreitbeilegung / Universalschlichtungsstelle
            </h2>
            <p>
              Wir sind nicht bereit oder verpflichtet, an
              Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          {/* Haftungsausschluss */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Haftung für Inhalte
            </h2>
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene
              Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
              verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
              Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
              gespeicherte fremde Informationen zu überwachen oder nach
              Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
              hinweisen.
            </p>
            <p className="mt-3">
              Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
              Informationen nach den allgemeinen Gesetzen bleiben hiervon
              unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem
              Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung
              möglich. Bei Bekanntwerden von entsprechenden
              Rechtsverletzungen werden wir diese Inhalte umgehend
              entfernen.
            </p>
          </section>

          {/* Haftung für Links */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Haftung für Links
            </h2>
            <p>
              Unser Angebot enthält Links zu externen Websites Dritter, auf
              deren Inhalte wir keinen Einfluss haben. Deshalb können wir
              für diese fremden Inhalte auch keine Gewähr übernehmen. Für
              die Inhalte der verlinkten Seiten ist stets der jeweilige
              Anbieter oder Betreiber der Seiten verantwortlich. Die
              verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf
              mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte
              waren zum Zeitpunkt der Verlinkung nicht erkennbar.
            </p>
          </section>

          {/* Urheberrecht */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Urheberrecht
            </h2>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke
              auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die
              Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
              Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen
              der schriftlichen Zustimmung des jeweiligen Autors bzw.
              Erstellers. Downloads und Kopien dieser Seite sind nur für
              den privaten, nicht kommerziellen Gebrauch gestattet.
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
