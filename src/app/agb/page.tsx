import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// SEO-Metadata fuer die AGB-Seite
export const metadata: Metadata = {
  title: "AGB | AI Conversion – Allgemeine Geschäftsbedingungen",
  description:
    "Allgemeine Geschäftsbedingungen von AI Conversion – SaaS-Plattform für KI-gestützten WhatsApp-Vertrieb. Leistungsumfang, Preise, Kündigung, Datenschutz und Haftung.",
  robots: "noindex, follow",
  alternates: {
    canonical: "https://ai-conversion.ai/agb",
  },
};

// Wiederverwendbare CSS-Klassen fuer Rechtstext-Absaetze
const sectionTitle =
  "mb-4 text-lg font-semibold text-white scroll-mt-24";
const paragraph = "mt-3 text-[15px] leading-relaxed text-slate-400";
const listItem = "text-[15px] leading-relaxed text-slate-400";
const linkStyle =
  "text-purple-400 underline decoration-purple-400/30 transition-colors hover:text-purple-300";

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
          Zurück zur Startseite
        </Link>

        {/* Header */}
        <h1 className="text-gradient-purple mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Allgemeine Geschäftsbedingungen
        </h1>
        <p className="mb-6 text-sm text-slate-600">
          Stand: April 2026
        </p>

        {/* Inhaltsverzeichnis */}
        <nav className="mb-16 rounded-xl border border-white/[0.04] bg-white/[0.015] p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#c9a84c]">
            Inhaltsverzeichnis
          </p>
          <ol className="columns-1 gap-x-8 space-y-1.5 text-sm text-slate-500 sm:columns-2">
            {[
              "Geltungsbereich & Vertragsparteien",
              "Leistungsbeschreibung",
              "Vertragsschluss & Onboarding",
              "Preise & Zahlungsbedingungen",
              "Laufzeit & Kündigung",
              "Pflichten des Kunden",
              "Verfügbarkeit & SLA",
              "Hinweis zu KI-generierten Inhalten",
              "Datenschutz & DSGVO",
              "Haftungsbeschränkung",
              "Geistiges Eigentum",
              "Änderungen der AGB",
              "Anwendbares Recht & Gerichtsstand",
              "Salvatorische Klausel",
            ].map((title, i) => (
              <li key={i}>
                <a
                  href={`#section-${i + 1}`}
                  className="transition-colors hover:text-purple-400"
                >
                  {i + 1}. {title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Inhalt */}
        <div className="space-y-14">
          {/* ══════════════════════════════════════════════════ */}
          {/* § 1 – Geltungsbereich & Vertragsparteien         */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-1">
            <h2 className={sectionTitle}>
              § 1 – Geltungsbereich und Vertragsparteien
            </h2>
            <p className={paragraph}>
              (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB") regeln
              das Vertragsverhältnis zwischen dem Anbieter und dem Kunden bei der
              Nutzung der SaaS-Plattform „AI Conversion" (nachfolgend „Plattform"),
              erreichbar unter der Domain ai-conversion.ai.
            </p>
            <p className={paragraph}>
              (2) Anbieter der Plattform ist:
            </p>
            <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-slate-400">
              <p className="font-medium text-white">Philipp Motzer</p>
              <p className="mt-1">Individual Entrepreneur, Georgien</p>
              <p>Registrierungs-ID: 331187816</p>
              <p className="mt-2">Deutsche Geschäftsadresse:</p>
              <p>Erfweiler Straße 12, 66994 Dahn, Deutschland</p>
              <p className="mt-2">
                E-Mail:{" "}
                <a href="mailto:hello@ai-conversion.ai" className={linkStyle}>
                  hello@ai-conversion.ai
                </a>
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Hinweis: Es wird keine deutsche Umsatzsteuer ausgewiesen
                (Kleinunternehmerregelung gemäß § 19 UStG). Die Rechnungsstellung
                und Umsatzsteuererhebung erfolgt über unseren Zahlungsdienstleister
                Paddle (siehe § 4).
              </p>
            </div>
            <p className={paragraph}>
              (3) Die Plattform richtet sich ausschließlich an Unternehmer im Sinne
              des § 14 BGB (B2B). Mit der Registrierung bestätigt der Kunde, dass
              er die Plattform im Rahmen seiner gewerblichen oder selbständigen
              beruflichen Tätigkeit nutzt.
            </p>
            <p className={paragraph}>
              (4) Abweichende oder ergänzende Geschäftsbedingungen des Kunden werden
              nicht Vertragsbestandteil, es sei denn, der Anbieter stimmt ihrer
              Geltung ausdrücklich schriftlich zu.
            </p>
          </section>

          {/* ══════════════════════════════════════════════════ */}
          {/* § 2 – Leistungsbeschreibung                      */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-2">
            <h2 className={sectionTitle}>
              § 2 – Leistungsbeschreibung
            </h2>
            <p className={paragraph}>
              (1) AI Conversion ist eine cloudbasierte SaaS-Plattform für
              KI-gestützten Vertrieb über die WhatsApp Business API. Der konkrete
              Leistungsumfang richtet sich nach dem vom Kunden gewählten Paket.
            </p>
            <p className={paragraph}>
              (2) Die Plattform umfasst insbesondere folgende Kernfunktionen:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li className={listItem}>
                <strong className="text-slate-300">KI-Vertriebsbot:</strong>{" "}
                Automatisierte, empathische Verkaufsgespräche über WhatsApp,
                betrieben durch die KI-Modelle Claude Sonnet (Anthropic) und
                GPT-4o (OpenAI)
              </li>
              <li className={listItem}>
                <strong className="text-slate-300">Lead-Qualifizierung:</strong>{" "}
                Automatisches Lead-Scoring (0–100) und Kategorisierung in
                Pipeline-Stufen (Unqualified → MQL → SQL → Opportunity → Customer)
              </li>
              <li className={listItem}>
                <strong className="text-slate-300">Verschlüsselung:</strong>{" "}
                Alle Nachrichteninhalte werden mit AES-256-GCM verschlüsselt
                gespeichert (DSGVO-konform)
              </li>
              <li className={listItem}>
                <strong className="text-slate-300">Multi-Tenant-Dashboard:</strong>{" "}
                Individuelle Verwaltungs- und Auswertungsoberfläche pro Mandant
              </li>
              <li className={listItem}>
                <strong className="text-slate-300">Lead-Pipeline:</strong>{" "}
                Echtzeit-Visualisierung des gesamten Vertriebstrichters
              </li>
              <li className={listItem}>
                <strong className="text-slate-300">DSGVO-Compliance:</strong>{" "}
                Consent-Tracking, automatische Datenbereinigung nach
                konfigurierbarer Aufbewahrungsfrist, Hosting in Frankfurt (EU)
              </li>
            </ul>
            <p className={paragraph}>
              (3) Optionale Add-On-Module (Voice Agent, Instagram DMs, E-Mail
              Agent, Multi-AI Dashboard) sind gesondert buchbar und werden in den
              jeweiligen Leistungsbeschreibungen spezifiziert.
            </p>
            <p className={paragraph}>
              (4) Der Anbieter ist berechtigt, die Plattform technisch
              weiterzuentwickeln, sofern der vereinbarte Leistungsumfang nicht
              wesentlich eingeschränkt wird.
            </p>
          </section>

          {/* ══════════════════════════════════════════════════ */}
          {/* § 3 – Vertragsschluss & Onboarding               */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-3">
            <h2 className={sectionTitle}>
              § 3 – Vertragsschluss und Onboarding
            </h2>
            <p className={paragraph}>
              (1) Die Darstellung der Leistungen auf der Website stellt kein
              verbindliches Angebot dar, sondern eine Aufforderung zur Abgabe
              eines Angebots (invitatio ad offerendum).
            </p>
            <p className={paragraph}>
              (2) Der Vertrag kommt durch die Registrierung des Kunden über den
              Onboarding-Prozess und die anschließende Annahme durch den Anbieter
              (Freischaltung des Accounts) zustande.
            </p>
            <p className={paragraph}>
              (3) Das Onboarding umfasst folgende Schritte:
            </p>
            <ol className="mt-3 list-inside list-decimal space-y-2">
              <li className={listItem}>
                Erfassung der Unternehmensdaten und WhatsApp Business Phone ID
              </li>
              <li className={listItem}>
                Konfiguration des KI-System-Prompts (Bot-Persönlichkeit und
                Gesprächslogik)
              </li>
              <li className={listItem}>
                Zahlung der ersten Monatsgebühr per SEPA-Überweisung
              </li>
              <li className={listItem}>
                Freischaltung des WhatsApp-Bots und Zugang zum Dashboard
              </li>
            </ol>
            <p className={paragraph}>
              (4) Der Kunde ist für die Richtigkeit seiner bei der Registrierung
              gemachten Angaben verantwortlich und verpflichtet sich, Änderungen
              unverzüglich mitzuteilen.
            </p>
          </section>

          {/* ══════════════════════════════════════════════════ */}
          {/* § 4 – Preise & Zahlungsbedingungen               */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-4">
            <h2 className={sectionTitle}>
              § 4 – Preise und Zahlungsbedingungen
            </h2>
            <p className={paragraph}>
              (1) Die aktuell gültigen Preise sind auf der Preisseite unter{" "}
              <Link href="/pricing" className={linkStyle}>
                ai-conversion.ai/pricing
              </Link>{" "}
              einsehbar. Es gelten folgende Paketpreise:
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-white/[0.06]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#c9a84c]">
                      Paket
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#c9a84c]">
                      Monatlich
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#c9a84c]">
                      Setup (einmalig)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-slate-400">
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-300">Starter</td>
                    <td className="px-4 py-2.5 text-right">349 €</td>
                    <td className="px-4 py-2.5 text-right">349 €</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-300">Growth</td>
                    <td className="px-4 py-2.5 text-right">699 €</td>
                    <td className="px-4 py-2.5 text-right">699 €</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-300">Professional</td>
                    <td className="px-4 py-2.5 text-right">1.299 €</td>
                    <td className="px-4 py-2.5 text-right">1.299 €</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-300">Enterprise</td>
                    <td className="px-4 py-2.5 text-right">auf Anfrage</td>
                    <td className="px-4 py-2.5 text-right">individuell</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className={paragraph}>
              (2) Optionale Add-Ons: Voice Agent (+500 €/Mo.), Instagram DMs
              (+400 €/Mo.), E-Mail Agent (+300 €/Mo.), Multi-AI Dashboard
              (+200 €/Mo.).
            </p>
            <p className={paragraph}>
              (3) Alle genannten Preise verstehen sich als Nettopreise. Der
              Anbieter ist als Individual Entrepreneur in Georgien registriert.
              Für Leistungen an Kunden mit Sitz in Deutschland wird keine
              deutsche Umsatzsteuer ausgewiesen (Kleinunternehmerregelung gemäß
              § 19 UStG). Die umsatzsteuerliche Behandlung im jeweiligen Land
              des Kunden obliegt dem Kunden.
            </p>
            <p className={paragraph}>
              (4){" "}
              <strong className="text-slate-300">Zahlungsabwicklung:</strong>{" "}
              Die Zahlungsabwicklung erfolgt per SEPA-Überweisung auf
              Rechnungsbasis. Der Anbieter stellt dem Kunden eine Rechnung,
              die innerhalb von 14 Tagen nach Rechnungsdatum zu begleichen ist.
              Der Servicevertrag über die Nutzung der Plattform besteht
              zwischen dem Anbieter und dem Kunden.
            </p>
            <p className={paragraph}>
              (5) Die Zahlung erfolgt monatlich im Voraus.
            </p>
            <p className={paragraph}>
              (6) Die einmalige Setup-Gebühr deckt die individuelle
              Konfiguration, das Onboarding und die Ersteinrichtung ab. Sie
              ist nicht erstattungsfähig, auch nicht bei vorzeitiger Kündigung.
            </p>
            <p className={paragraph}>
              (7){" "}
              <strong className="text-slate-300">Sonderkonditionen Pilotphase:</strong>{" "}
              Founding Partner, die in der aktuellen Pilotphase einen Vertrag
              abschließen, zahlen dauerhaft 33% weniger auf alle oben genannten
              Listenpreise, solange der Vertrag ungekündigt bleibt. Zusätzlich
              erhalten Founding Partner die ersten 30 Tage kostenlos und sind
              in der Pilotphase von der Setup-Gebühr befreit.
            </p>
            <p className={paragraph}>
              (8) Zusätzlich zu den Plattformgebühren fallen
              WhatsApp-Nachrichtenkosten direkt bei Meta an (derzeit ca. 0,11 €
              pro Marketing-Nachricht, kostenlose Service-Antworten innerhalb
              von 24 Stunden). Diese Kosten werden nicht über AI Conversion
              abgerechnet.
            </p>
            <p className={paragraph}>
              (9) Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang
              zur Plattform nach Mahnung und Setzung einer angemessenen
              Nachfrist vorübergehend zu sperren.
            </p>
          </section>

          {/* ══════════════════════════════════════════════════ */}
          {/* § 5 – Laufzeit & Kündigung                       */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-5">
            <h2 className={sectionTitle}>
              § 5 – Laufzeit und Kündigung
            </h2>
            <p className={paragraph}>
              (1) Der Vertrag beginnt mit der Freischaltung des Accounts durch
              den Anbieter und läuft auf unbestimmte Zeit.
            </p>
            <p className={paragraph}>
              (2){" "}
              <strong className="text-slate-300">Monatliche Abrechnung:</strong>{" "}
              Der Vertrag ist jederzeit zum Ende des laufenden
              Abrechnungsmonats kündbar. Eine Mindestlaufzeit besteht nicht.
            </p>
            <p className={paragraph}>
              (3){" "}
              <strong className="text-slate-300">Jährliche Abrechnung:</strong>{" "}
              Der Vertrag hat eine Mindestlaufzeit von 12 Monaten und verlängert
              sich automatisch um jeweils weitere 12 Monate, sofern er nicht
              mit einer Frist von 30 Tagen zum Ende der Laufzeit gekündigt wird.
            </p>
            <p className={paragraph}>
              (4) Die Kündigung kann per E-Mail an{" "}
              <a href="mailto:hello@ai-conversion.ai" className={linkStyle}>
                hello@ai-conversion.ai
              </a>{" "}
              oder über das Kundenportal bei Paddle erfolgen. Der Anbieter
              bestätigt den Eingang der Kündigung innerhalb von 3 Werktagen.
            </p>
            <p className={paragraph}>
              (5) Die einmalige Setup-Gebühr ist von der Kündigung nicht
              betroffen und wird nicht erstattet.
            </p>
            <p className={paragraph}>
              (6) Nach Wirksamwerden der Kündigung werden alle gespeicherten
              Daten gemäß der vereinbarten Aufbewahrungsfrist (Standard: 90
              Tage) automatisch und DSGVO-konform gelöscht. Der Kunde kann
              vor Ablauf der Frist einen Datenexport anfordern.
            </p>
            <p className={paragraph}>
              (7) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund
              bleibt beiden Parteien unberührt. Ein wichtiger Grund liegt
              insbesondere vor bei wiederholtem Verstoß gegen diese AGB, bei
              Zahlungsverzug von mehr als 30 Tagen oder bei Verletzung
              anwendbarer Gesetze.
            </p>
          </section>

          {/* ══════════════════════════════════════════════════ */}
          {/* § 6 – Pflichten des Kunden                       */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-6">
            <h2 className={sectionTitle}>
              § 6 – Pflichten des Kunden
            </h2>
            <p className={paragraph}>
              (1) Der Kunde verpflichtet sich:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li className={listItem}>
                Die Plattform ausschließlich im Rahmen der geltenden Gesetze zu
                nutzen, insbesondere der DSGVO, des UWG und des TMG/TTDSG
              </li>
              <li className={listItem}>
                Die{" "}
                <strong className="text-slate-300">
                  WhatsApp Business API Nutzungsrichtlinien
                </strong>{" "}
                und{" "}
                <strong className="text-slate-300">
                  Meta Commerce Policies
                </strong>{" "}
                in ihrer jeweils gültigen Fassung einzuhalten
              </li>
              <li className={listItem}>
                Nur WhatsApp-Nachrichten an Personen zu senden, die ihre
                ausdrückliche Einwilligung (Opt-in) erteilt haben
              </li>
              <li className={listItem}>
                Zugangsdaten (Magic-Link-Token, Dashboard-Zugang) vertraulich
                zu behandeln und nicht an unbefugte Dritte weiterzugeben
              </li>
              <li className={listItem}>
                Keine rechtswidrigen, belästigenden, diskriminierenden oder
                irreführenden Inhalte über die Plattform zu verbreiten
              </li>
              <li className={listItem}>
                Den System-Prompt so zu konfigurieren, dass der Bot sich nicht
                als natürliche Person ausgibt und bei direkter Nachfrage seine
                KI-Natur offenlegt
              </li>
              <li className={listItem}>
                Den Anbieter unverzüglich über Sicherheitsvorfälle, Missbrauch
                oder Verstöße gegen die WhatsApp-Richtlinien zu informieren
              </li>
            </ul>
            <p className={paragraph}>
              (2) Der Kunde ist selbst dafür verantwortlich, einen gültigen
              WhatsApp Business Account bei Meta zu unterhalten und die
              Voraussetzungen für die Nutzung der WhatsApp Business API zu
              erfüllen.
            </p>
            <p className={paragraph}>
              (3) Bei Verstoß gegen vorstehende Pflichten ist der Anbieter
              berechtigt, den Zugang zur Plattform vorübergehend oder dauerhaft
              zu sperren. Schadensersatzansprüche des Anbieters bleiben
              unberührt.
            </p>
          </section>

          {/* ══════════════════════════════════════════════════ */}
          {/* § 7 – Verfügbarkeit & SLA                        */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-7">
            <h2 className={sectionTitle}>
              § 7 – Verfügbarkeit und Service Level
            </h2>
            <p className={paragraph}>
              (1) Der Anbieter strebt eine Verfügbarkeit der Plattform von 99 %
              im Jahresmittel an (gemessen an der Erreichbarkeit der
              API-Endpunkte). Hierbei handelt es sich um ein Bemühensziel, nicht
              um eine zugesicherte Eigenschaft oder Garantie.
            </p>
            <p className={paragraph}>
              (2) Geplante Wartungsarbeiten werden mindestens 24 Stunden im
              Voraus per E-Mail oder Dashboard-Benachrichtigung angekündigt.
              Wartungsfenster werden nach Möglichkeit außerhalb der
              Geschäftszeiten (MESZ) gelegt.
            </p>
            <p className={paragraph}>
              (3) Der Anbieter haftet nicht für Ausfälle oder
              Leistungseinschränkungen, die verursacht werden durch:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li className={listItem}>
                Störungen bei WhatsApp/Meta (API-Ausfälle,
                Richtlinienänderungen, Account-Sperrungen)
              </li>
              <li className={listItem}>
                Ausfälle der KI-Modell-Anbieter (Anthropic, OpenAI)
              </li>
              <li className={listItem}>
                Störungen des Hosting-Providers (Vercel) oder der
                Datenbankinfrastruktur
              </li>
              <li className={listItem}>
                Höhere Gewalt, Cyberangriffe oder behördliche Anordnungen
              </li>
            </ul>
            <p className={paragraph}>
              (4) Für Enterprise-Kunden können individuelle SLA-Vereinbarungen
              mit definierten Reaktionszeiten und Verfügbarkeitsgarantien
              getroffen werden.
            </p>
          </section>

          {/* ══════════════════════════════════════════════════ */}
          {/* § 8 – KI-Hinweis                                 */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-8">
            <h2 className={sectionTitle}>
              § 8 – Hinweis zu KI-generierten Inhalten
            </h2>
            <p className={paragraph}>
              (1) Die über die Plattform generierten Antworten und
              Lead-Bewertungen werden durch Künstliche Intelligenz erzeugt
              (Claude Sonnet von Anthropic, GPT-4o von OpenAI). Diese Inhalte
              können fehlerhaft, unvollständig oder kontextbezogen unpassend
              sein.
            </p>
            <p className={paragraph}>
              (2) KI-generierte Inhalte stellen{" "}
              <strong className="text-slate-300">
                keine Rechtsberatung, Steuerberatung, medizinische Beratung
              </strong>{" "}
              oder sonstige Fachberatung dar. Der Kunde ist selbst dafür
              verantwortlich, KI-generierte Inhalte auf Richtigkeit und
              Angemessenheit zu prüfen, bevor er auf deren Grundlage
              Entscheidungen trifft.
            </p>
            <p className={paragraph}>
              (3){" "}
              <strong className="text-slate-300">
                Kennzeichnungspflicht (ab 2026 DACH):
              </strong>{" "}
              Der Kunde ist dafür verantwortlich, die in seinem Jurisdiktionsgebiet
              geltenden Kennzeichnungspflichten für KI-generierte Inhalte
              einzuhalten. Dies umfasst insbesondere die ab 2026 im DACH-Raum
              geltenden Transparenzpflichten gemäß der EU KI-Verordnung
              (AI Act, Verordnung (EU) 2024/1689). Der Anbieter stellt sicher,
              dass der Bot bei direkter Nachfrage offenlegt, ein KI-System zu sein.
            </p>
            <p className={paragraph}>
              (4) Der Anbieter übernimmt keine Gewähr für die Erreichung
              bestimmter Vertriebsergebnisse (Conversion-Raten, Lead-Qualität,
              Terminquoten). Die tatsächlichen Ergebnisse hängen von vielen
              Faktoren ab, die außerhalb des Einflussbereichs des Anbieters
              liegen.
            </p>
          </section>

          {/* ══════════════════════════════════════════════════ */}
          {/* § 9 – Datenschutz & DSGVO                        */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-9">
            <h2 className={sectionTitle}>
              § 9 – Datenschutz und DSGVO
            </h2>
            <p className={paragraph}>
              (1) Der Schutz personenbezogener Daten ist ein zentrales Anliegen
              des Anbieters. Alle Details zur Datenverarbeitung finden sich in
              der{" "}
              <Link href="/datenschutz" className={linkStyle}>
                Datenschutzerklärung
              </Link>
              .
            </p>
            <p className={paragraph}>
              (2) Wesentliche technische und organisatorische Maßnahmen:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li className={listItem}>
                <strong className="text-slate-300">Verschlüsselung:</strong>{" "}
                Alle Nachrichteninhalte werden mit AES-256-GCM verschlüsselt
                gespeichert. Der Verschlüsselungsschlüssel wird getrennt vom
                Datenbankserver verwaltet.
              </li>
              <li className={listItem}>
                <strong className="text-slate-300">Hosting:</strong>{" "}
                Datenverarbeitung und -speicherung erfolgen ausschließlich auf
                Servern in Frankfurt am Main (EU) über die Hosting-Plattform
                Vercel (Fluid Compute) und eine PostgreSQL-Datenbank mit
                Prisma ORM.
              </li>
              <li className={listItem}>
                <strong className="text-slate-300">Mandantentrennung:</strong>{" "}
                Jeder Kunde erhält einen technisch isolierten Datenbereich
                (Multi-Tenant-Isolation auf Datenbankebene).
              </li>
              <li className={listItem}>
                <strong className="text-slate-300">Datenbereinigung:</strong>{" "}
                Automatische, DSGVO-konforme Löschung aller Nachrichten und
                Konversationen nach Ablauf der konfigurierbaren
                Aufbewahrungsfrist (Standard: 90 Tage).
              </li>
              <li className={listItem}>
                <strong className="text-slate-300">Consent-Tracking:</strong>{" "}
                Jede Konversation beginnt mit einem DSGVO-Hinweis. Die
                Einwilligung wird protokolliert. Endnutzer können die
                Verarbeitung jederzeit durch Senden von „STOP" beenden.
              </li>
            </ul>
            <p className={paragraph}>
              (3){" "}
              <strong className="text-slate-300">
                Auftragsverarbeitung (AVV):
              </strong>{" "}
              Soweit der Anbieter personenbezogene Daten im Auftrag des Kunden
              verarbeitet, schließen die Parteien einen
              Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO ab. Der Kunde
              kann den AVV jederzeit per E-Mail anfordern.
            </p>
            <p className={paragraph}>
              (4) Die KI-Modelle (Claude, GPT-4o) verarbeiten
              Nachrichteninhalte zur Antwortgenerierung und zum Lead-Scoring.
              Es werden keine Trainingsdaten an die KI-Anbieter weitergegeben.
              Die Verarbeitung erfolgt auf Basis der jeweiligen API-Verträge
              mit Anthropic und OpenAI (jeweils DPA vorhanden).
            </p>
          </section>

          {/* ══════════════════════════════════════════════════ */}
          {/* § 10 – Haftungsbeschränkung                      */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-10">
            <h2 className={sectionTitle}>
              § 10 – Haftungsbeschränkung
            </h2>
            <p className={paragraph}>
              (1) Der Anbieter haftet unbeschränkt für Vorsatz und grobe
              Fahrlässigkeit sowie für Schäden aus der Verletzung von Leben,
              Körper und Gesundheit.
            </p>
            <p className={paragraph}>
              (2) Für leichte Fahrlässigkeit haftet der Anbieter nur bei
              Verletzung wesentlicher Vertragspflichten (Kardinalpflichten),
              und zwar beschränkt auf den vorhersehbaren, vertragstypischen
              Schaden. Wesentliche Vertragspflichten sind solche, deren
              Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt
              erst ermöglicht und auf deren Einhaltung der Kunde regelmäßig
              vertrauen darf.
            </p>
            <p className={paragraph}>
              (3) Die Haftung für mittelbare Schäden, entgangenen Gewinn,
              Datenverlust oder Folgeschäden ist – soweit gesetzlich zulässig –
              ausgeschlossen.
            </p>
            <p className={paragraph}>
              (4) Die Gesamthaftung des Anbieters ist der Höhe nach auf die vom
              Kunden in den letzten 12 Monaten vor dem Schadenseintritt
              tatsächlich gezahlten Nettogebühren beschränkt.
            </p>
            <p className={paragraph}>
              (5) Der Anbieter haftet insbesondere nicht für:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li className={listItem}>
                Fehlerhafte, unvollständige oder unangemessene KI-generierte
                Antworten und Lead-Bewertungen
              </li>
              <li className={listItem}>
                Störungen oder Ausfälle der WhatsApp Business API durch Meta
                sowie Änderungen der Meta-Richtlinien oder API-Spezifikationen
              </li>
              <li className={listItem}>
                Ausfälle der KI-Modell-Anbieter (Anthropic, OpenAI)
              </li>
              <li className={listItem}>
                Sperrung des WhatsApp-Business-Accounts des Kunden durch Meta
              </li>
              <li className={listItem}>
                Schäden, die durch Nutzung der Plattform entgegen dieser AGB
                oder geltender Gesetze entstehen
              </li>
            </ul>
            <p className={paragraph}>
              (6) Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.
            </p>
          </section>

          {/* ══════════════════════════════════════════════════ */}
          {/* § 11 – Geistiges Eigentum                        */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-11">
            <h2 className={sectionTitle}>
              § 11 – Geistiges Eigentum
            </h2>
            <p className={paragraph}>
              (1) Alle Rechte an der Plattform, einschließlich der Software,
              des Designs, der Marke „AI Conversion", der Dokumentation und
              der zugrunde liegenden Algorithmen, verbleiben beim Anbieter.
            </p>
            <p className={paragraph}>
              (2) Der Kunde erhält für die Dauer des Vertragsverhältnisses ein
              einfaches, nicht übertragbares, nicht unterlizenzierbares
              Nutzungsrecht an der Plattform im Rahmen des vereinbarten
              Leistungsumfangs.
            </p>
            <p className={paragraph}>
              (3) Die vom Kunden eingegebenen Inhalte (System-Prompts,
              Unternehmensdaten, Markendaten) verbleiben im Eigentum des
              Kunden. Der Anbieter erhält hieran ein zweckgebundenes
              Nutzungsrecht zur Erbringung der vertraglich geschuldeten
              Leistungen.
            </p>
            <p className={paragraph}>
              (4) Die über die Plattform generierten KI-Antworten unterliegen
              keinem Urheberrechtsschutz des Anbieters. Der Kunde darf die
              generierten Inhalte im Rahmen seiner geschäftlichen Tätigkeit
              frei verwenden.
            </p>
            <p className={paragraph}>
              (5) Der Kunde darf die Plattform nicht dekompilieren, reverse
              engineeren, kopieren oder in einer Weise nutzen, die über das
              vertraglich eingeräumte Nutzungsrecht hinausgeht.
            </p>
          </section>

          {/* ══════════════════════════════════════════════════ */}
          {/* § 12 – Änderungen der AGB                        */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-12">
            <h2 className={sectionTitle}>
              § 12 – Änderungen der AGB
            </h2>
            <p className={paragraph}>
              (1) Der Anbieter behält sich das Recht vor, diese AGB mit
              angemessener Vorankündigungsfrist zu ändern, sofern dies aufgrund
              geänderter Rechtslage, höchstrichterlicher Rechtsprechung,
              Marktgegebenheiten oder technischer Entwicklungen erforderlich
              oder sachlich gerechtfertigt ist.
            </p>
            <p className={paragraph}>
              (2) Änderungen werden dem Kunden mindestens{" "}
              <strong className="text-slate-300">4 Wochen</strong> vor
              Inkrafttreten per E-Mail an die hinterlegte Kontaktadresse
              mitgeteilt. Die E-Mail enthält eine Gegenüberstellung der alten
              und neuen Regelungen.
            </p>
            <p className={paragraph}>
              (3) Widerspricht der Kunde den Änderungen nicht innerhalb von
              4 Wochen nach Zugang der Mitteilung in Textform (E-Mail genügt),
              gelten die geänderten AGB als angenommen. Auf die Bedeutung des
              Schweigens wird in der Änderungsmitteilung gesondert hingewiesen.
            </p>
            <p className={paragraph}>
              (4) Widerspricht der Kunde fristgerecht, besteht der Vertrag zu
              den bisherigen Bedingungen fort. Der Anbieter hat in diesem Fall
              das Recht, den Vertrag mit einer Frist von 30 Tagen zum
              Monatsende ordentlich zu kündigen.
            </p>
          </section>

          {/* ══════════════════════════════════════════════════ */}
          {/* § 13 – Anwendbares Recht & Gerichtsstand         */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-13">
            <h2 className={sectionTitle}>
              § 13 – Anwendbares Recht und Gerichtsstand
            </h2>
            <p className={paragraph}>
              (1) Es gilt das Recht der Bundesrepublik Deutschland unter
              Ausschluss des UN-Kaufrechts (CISG).
            </p>
            <p className={paragraph}>
              (2) Gerichtsstand für alle Streitigkeiten aus oder im
              Zusammenhang mit diesem Vertrag ist Landau in der Pfalz,
              sofern der Kunde Kaufmann im Sinne des HGB, eine juristische
              Person des öffentlichen Rechts oder ein öffentlich-rechtliches
              Sondervermögen ist.
            </p>
            <p className={paragraph}>
              (3) Die Europäische Kommission stellt eine Plattform zur
              Online-Streitbeilegung (OS) bereit:{" "}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className={linkStyle}
              >
                https://ec.europa.eu/consumers/odr/
              </a>
              . Der Anbieter ist weder verpflichtet noch bereit, an einem
              Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
              teilzunehmen, da sich die Plattform ausschließlich an
              Unternehmer richtet (B2B).
            </p>
          </section>

          {/* ══════════════════════════════════════════════════ */}
          {/* § 14 – Salvatorische Klausel                     */}
          {/* ══════════════════════════════════════════════════ */}
          <section id="section-14">
            <h2 className={sectionTitle}>
              § 14 – Salvatorische Klausel
            </h2>
            <p className={paragraph}>
              (1) Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise
              unwirksam sein oder werden, so wird die Wirksamkeit der übrigen
              Bestimmungen hiervon nicht berührt.
            </p>
            <p className={paragraph}>
              (2) An die Stelle der unwirksamen Bestimmung tritt diejenige
              wirksame Regelung, die dem wirtschaftlichen Zweck der
              unwirksamen Bestimmung am nächsten kommt. Gleiches gilt für
              etwaige Vertragslücken.
            </p>
          </section>
        </div>

        {/* Kontakt-Box */}
        <div className="mt-16 rounded-xl border border-[rgba(201,168,76,0.15)] bg-[rgba(201,168,76,0.03)] p-6">
          <p className="text-sm font-semibold text-[#c9a84c]">
            Fragen zu diesen AGB?
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Kontaktieren Sie uns unter{" "}
            <a href="mailto:hello@ai-conversion.ai" className={linkStyle}>
              hello@ai-conversion.ai
            </a>
            . Wir antworten in der Regel innerhalb von 24 Stunden.
          </p>
        </div>

        {/* Footer-Trennlinie */}
        <div className="mt-12 border-t border-white/[0.04] pt-8">
          <p className="text-xs text-slate-700">
            Stand: April 2026 · AI Conversion · Philipp Motzer ·
            Erfweiler Straße 12, 66994 Dahn
          </p>
        </div>
      </div>
    </main>
  );
}
