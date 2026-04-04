"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";

/* ═══════════════════════════════════════════════════════
   DATEN
   ═══════════════════════════════════════════════════════ */

interface Plan {
  name: string;
  monthly: number;
  yearly: number;
  setup: string;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
}

interface Addon {
  name: string;
  price: string;
  description: string;
}

interface TargetGroup {
  title: string;
  problem: string;
  solution: string;
}

interface TrustPoint {
  name: string;
  description: string;
}

const plans: Plan[] = [
  {
    name: "Starter",
    monthly: 497,
    yearly: 422,
    setup: "497",
    description: "Perfekt für den Einstieg",
    features: [
      "1 WhatsApp Bot",
      "1 Mandant",
      "Bis 500 Konversationen / Monat",
      "KI-Verkaufsgespräche DACH-optimiert",
      "Lead-Scoring 0–100",
      "E-Mail-Benachrichtigung bei heißen Leads",
      "Basis-Dashboard",
      "E-Mail Support",
    ],
    highlighted: false,
    cta: "Jetzt starten",
  },
  {
    name: "Growth",
    monthly: 1497,
    yearly: 1272,
    setup: "997",
    description: "Für wachsende Unternehmen",
    features: [
      "Bis 3 WhatsApp Bots",
      "3 Mandanten",
      "Bis 2.000 Konversationen / Monat",
      "Alles aus Starter",
      "Admin Dashboard",
      "Nachrichtenvorlagen",
      "Reporting & Analytics",
      "Priority Support",
      "Onboarding Call",
    ],
    highlighted: true,
    cta: "Beliebteste Wahl",
  },
  {
    name: "Professional",
    monthly: 2997,
    yearly: 2547,
    setup: "1.997",
    description: "Für maximale Skalierung",
    features: [
      "Bis 10 WhatsApp Bots",
      "10 Mandanten",
      "Unbegrenzte Konversationen",
      "Alles aus Growth",
      "Custom KI-Training",
      "Multi-Language Support",
      "Dedizierter Account Manager",
      "API-Zugang",
      "SLA-Garantie",
    ],
    highlighted: false,
    cta: "Kontakt aufnehmen",
  },
];

const addons: Addon[] = [
  { name: "Voice Agent", price: "+500€", description: "KI-Telefonate für Inbound & Outbound" },
  { name: "E-Mail KI", price: "+300€", description: "Automatische Follow-up E-Mails" },
  { name: "Multi-AI Dashboard", price: "+200€", description: "Alle KI-Kanäle in einer Oberfläche" },
];

const targetGroups: TargetGroup[] = [
  {
    title: "Immobilienmakler",
    problem: "Exposé-Anfragen bleiben stundenlang unbeantwortet — Interessenten gehen zur Konkurrenz.",
    solution: "Sofortige Antwort auf jede Anfrage. Besichtigungstermine werden automatisch gebucht.",
  },
  {
    title: "Handwerksbetriebe",
    problem: "Aufträge gehen verloren, weil niemand ans Telefon geht wenn die Hände auf der Baustelle sind.",
    solution: "24/7 Anfragen entgegennehmen, Termine koordinieren, Angebote nachfassen — automatisch.",
  },
  {
    title: "Coaches & Berater",
    problem: "Qualifizierung frisst Zeit — 80% der Erstgespräche führen zu nichts.",
    solution: "Der Bot qualifiziert vor und bucht nur Gespräche mit echten Interessenten.",
  },
];

const trustPoints: TrustPoint[] = [
  { name: "Claude Sonnet + GPT-4o", description: "Modernste Sprachmodelle" },
  { name: "AES-256", description: "Verschlüsselung" },
  { name: "PostgreSQL Frankfurt", description: "DSGVO-konforme Datenhaltung" },
  { name: "99,9% Uptime", description: "Enterprise-Verfügbarkeit" },
  { name: "DSGVO", description: "Vollständig konform" },
  { name: "Multi-Tenant", description: "Isolierte Mandanten" },
];

/* ═══════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════ */

function useScrolled(threshold: number): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", handle, { passive: true });
    handle();
    return () => window.removeEventListener("scroll", handle);
  }, [threshold]);
  return scrolled;
}

function useFadeIn(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function FadeSection({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, visible] = useFadeIn();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   GOLD SCROLL INDICATOR
   ═══════════════════════════════════════════════════════ */

function GoldScrollLine() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handle = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0);
    };
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "1px",
        width: `${progress * 100}%`,
        background: "linear-gradient(90deg, transparent, var(--gold), var(--gold), transparent)",
        zIndex: 200,
        transition: "width 0.1s linear",
        opacity: progress > 0.01 ? 1 : 0,
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════
   HAUPT-KOMPONENTE
   ═══════════════════════════════════════════════════════ */

export default function PageV2() {
  const scrolled = useScrolled(40);
  const [yearly, setYearly] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [hoveredAddon, setHoveredAddon] = useState<number | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<number | null>(null);

  const formatPrice = useCallback((n: number): string => {
    return n.toLocaleString("de-DE");
  }, []);

  return (
    <>
      {/* ── Fonts + Design Tokens + Keyframes ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700;900&family=Geist:wght@400;500;600&display=swap');
        :root {
          --bg: #07070d;
          --surface: #0e0e1a;
          --gold: #c9a84c;
          --gold-subtle: rgba(201,168,76,0.08);
          --gold-border: rgba(201,168,76,0.1);
          --gold-border-hover: rgba(201,168,76,0.35);
          --text: #ede8df;
          --text-muted: rgba(237,232,223,0.45);
          --red-subtle: rgba(239,68,68,0.6);
          --whatsapp: #25d366;
          --ease: cubic-bezier(0.16,1,0.3,1);
          --serif: 'Cormorant Garamond', Georgia, serif;
          --sans: 'Geist', system-ui, -apple-system, sans-serif;
        }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes goldPulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 1; }
        }

        .stagger-1 { animation: fadeSlideUp 0.9s var(--ease) 0.1s both; }
        .stagger-2 { animation: fadeSlideUp 0.9s var(--ease) 0.25s both; }
        .stagger-3 { animation: fadeSlideUp 0.9s var(--ease) 0.4s both; }
        .stagger-4 { animation: fadeSlideUp 0.9s var(--ease) 0.55s both; }
        .stagger-5 { animation: fadeSlideUp 0.9s var(--ease) 0.7s both; }
        .stagger-6 { animation: fadeSlideUp 0.9s var(--ease) 0.85s both; }
      `}</style>

      <div style={{ background: "var(--bg)", color: "var(--text)", fontFamily: "var(--sans)", minHeight: "100vh", position: "relative", overflowX: "hidden" }}>

        {/* Grain Overlay */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", opacity: 0.02,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <GoldScrollLine />

        {/* ═══════════════════════════════════════════
            1. NAV
            ═══════════════════════════════════════════ */}
        <nav
          className="stagger-1"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
            background: scrolled ? "rgba(7,7,13,0.85)" : "transparent",
            backdropFilter: scrolled ? "blur(20px)" : "none",
            WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
            borderBottom: scrolled ? "1px solid var(--gold-border)" : "1px solid transparent",
            transition: "all 0.5s var(--ease)",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
            {/* Logo */}
            <a href="#" style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 700, textDecoration: "none", color: "var(--text)", letterSpacing: "-0.02em" }}>
              ai-conversion<span style={{ color: "var(--gold)" }}>.ai</span>
            </a>

            {/* Rechts */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <a
                href="#pricing-section"
                style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500, color: "var(--text-muted)", textDecoration: "none", padding: "8px 16px", transition: "color 0.3s var(--ease)" }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--text)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--text-muted)"; }}
              >
                Preise
              </a>
              <a
                href="https://wa.me/4917647666407?text=Hi%2C%20ich%20möchte%20eine%20Demo%20sehen!"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "var(--bg)",
                  background: "var(--gold)", padding: "10px 24px", borderRadius: 6,
                  textDecoration: "none", transition: "all 0.3s var(--ease)",
                  letterSpacing: "0.02em",
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.opacity = "0.88"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.opacity = "1"; }}
              >
                Demo starten
              </a>
            </div>
          </div>
        </nav>

        {/* ═══════════════════════════════════════════
            2. HERO
            ═══════════════════════════════════════════ */}
        <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "10rem 2rem 6rem" }}>
          {/* Radialer Gold-Glow hinter Chat-Card */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-40%)",
              width: 800, height: 800, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 2, maxWidth: 1200, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            {/* Badge */}
            <div
              className="stagger-2"
              style={{
                display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 48,
                border: "1px solid var(--gold-border)", borderRadius: 100,
                padding: "8px 20px", background: "var(--gold-subtle)",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                DSGVO · Frankfurt · DACH
              </span>
            </div>

            {/* H1 */}
            <h1
              className="stagger-3"
              style={{
                fontFamily: "var(--serif)", fontWeight: 900,
                fontSize: "clamp(3rem, 7vw, 6rem)", lineHeight: 1.05, letterSpacing: "-0.03em",
                margin: 0, maxWidth: 900,
              }}
            >
              Ihr Vertrieb arbeitet.
              <br />
              <span style={{ background: "linear-gradient(135deg, #c9a84c 0%, #e8d5a0 50%, #c9a84c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Auch ohne Sie.
              </span>
            </h1>

            {/* Subline */}
            <p
              className="stagger-4"
              style={{ fontFamily: "var(--sans)", fontSize: 18, fontWeight: 400, color: "var(--text-muted)", maxWidth: 560, margin: "32px auto 0", lineHeight: 1.7 }}
            >
              KI-gestützter WhatsApp-Vertrieb für den DACH-Markt.
              Leads qualifizieren, Termine buchen, Umsatz steigern — vollautomatisch, rund um die Uhr.
            </p>

            {/* Buttons */}
            <div className="stagger-5" style={{ display: "flex", gap: 16, marginTop: 48, flexWrap: "wrap", justifyContent: "center" }}>
              <a
                href="https://wa.me/4917647666407?text=Hi%2C%20ich%20möchte%20eine%20Demo%20sehen!"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, color: "var(--bg)",
                  background: "var(--gold)", padding: "14px 36px", borderRadius: 8,
                  textDecoration: "none", transition: "all 0.3s var(--ease)", letterSpacing: "0.01em",
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.transform = "translateY(-2px)"; (e.target as HTMLElement).style.boxShadow = "0 8px 32px rgba(201,168,76,0.2)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.transform = "translateY(0)"; (e.target as HTMLElement).style.boxShadow = "none"; }}
              >
                Kostenlose Demo starten
              </a>
              <a
                href="#pricing-section"
                style={{
                  fontFamily: "var(--sans)", fontSize: 15, fontWeight: 500, color: "var(--text-muted)",
                  border: "1px solid var(--gold-border)", padding: "14px 36px", borderRadius: 8,
                  textDecoration: "none", transition: "all 0.3s var(--ease)", background: "transparent",
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = "var(--gold-border-hover)"; (e.target as HTMLElement).style.color = "var(--text)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = "var(--gold-border)"; (e.target as HTMLElement).style.color = "var(--text-muted)"; }}
              >
                Preise ansehen
              </a>
            </div>

            {/* WhatsApp Chat Card */}
            <div
              className="stagger-6"
              style={{
                marginTop: 80, width: "100%", maxWidth: 480,
                background: "var(--surface)", border: "1px solid var(--gold-border)",
                borderRadius: 16, overflow: "hidden", position: "relative",
                boxShadow: "0 24px 80px rgba(0,0,0,0.4), 0 0 120px rgba(201,168,76,0.03)",
              }}
            >
              {/* Chat Header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--gold-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", animation: "goldPulse 2.5s ease-in-out infinite" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>KI-Vertriebs-Bot</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>aktiv</span>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>09:43</span>
              </div>

              {/* Chat Messages */}
              <div style={{ padding: "20px 20px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Lead */}
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: "rgba(237,232,223,0.04)", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", maxWidth: "80%", fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>
                    Hallo, ich habe ein Malergeschäft mit 12 Mitarbeitern. Können Sie uns bei der Akquise helfen?
                  </div>
                </div>
                {/* Bot */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ background: "var(--gold-subtle)", border: "1px solid var(--gold-border)", borderRadius: "12px 12px 4px 12px", padding: "10px 14px", maxWidth: "80%", fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>
                    Guten Morgen! Handwerk ist unsere Spezialität. Suchen Sie regionale oder überregionale Aufträge?
                  </div>
                </div>
                {/* Lead */}
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: "rgba(237,232,223,0.04)", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", maxWidth: "80%", fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>
                    Nur München und Umgebung, 30 km Radius.
                  </div>
                </div>
              </div>

              {/* Lead Score Badge */}
              <div style={{ padding: "0 20px 20px", display: "flex", justifyContent: "flex-end" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  border: "1px solid var(--gold-border)", borderRadius: 8, padding: "6px 12px",
                  background: "var(--gold-subtle)",
                }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Lead Score</span>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>92</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>/ 100</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            3. STATS
            ═══════════════════════════════════════════ */}
        <FadeSection>
          <section style={{ padding: "10rem 2rem", borderTop: "1px solid var(--gold-border)", borderBottom: "1px solid var(--gold-border)" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
              {[
                { value: "< 3 Sek.", label: "Antwortzeit" },
                { value: "3,4×", label: "mehr Conversions" },
                { value: "24 / 7", label: "Verfügbarkeit" },
                { value: "DSGVO", label: "Vollständig konform" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  style={{
                    textAlign: "center", padding: "0 2rem",
                    borderRight: i < 3 ? "1px solid rgba(201,168,76,0.15)" : "none",
                  }}
                >
                  <p style={{ fontFamily: "var(--serif)", fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
                    {stat.value}
                  </p>
                  <p style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginTop: 8 }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </FadeSection>

        {/* ═══════════════════════════════════════════
            4. ZIELGRUPPEN
            ═══════════════════════════════════════════ */}
        <FadeSection>
          <section style={{ padding: "10rem 2rem" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <div style={{ maxWidth: 600, marginBottom: 64 }}>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 16 }}>Zielgruppen</p>
                <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", margin: 0 }}>
                  Gebaut für Macher.
                </h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
                {targetGroups.map((group, i) => (
                  <div
                    key={group.title}
                    onMouseEnter={() => setHoveredTarget(i)}
                    onMouseLeave={() => setHoveredTarget(null)}
                    style={{
                      background: "var(--surface)", borderRadius: 12, padding: 32,
                      border: `1px solid ${hoveredTarget === i ? "var(--gold-border-hover)" : "var(--gold-border)"}`,
                      transform: hoveredTarget === i ? "translateY(-4px)" : "translateY(0)",
                      transition: "all 0.3s var(--ease)",
                      cursor: "default",
                    }}
                  >
                    <h3 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 700, margin: "0 0 24px", letterSpacing: "-0.01em" }}>{group.title}</h3>
                    <div style={{ marginBottom: 20 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--red-subtle)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Problem</p>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-muted)", margin: 0 }}>{group.problem}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Lösung</p>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)", margin: 0, opacity: 0.8 }}>{group.solution}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeSection>

        {/* ═══════════════════════════════════════════
            5. PRICING
            ═══════════════════════════════════════════ */}
        <FadeSection>
          <section id="pricing-section" style={{ padding: "10rem 2rem" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: 64 }}>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 16 }}>Investition</p>
                <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", margin: 0 }}>
                  Investition, die sich rechnet.
                </h2>

                {/* Toggle Monatlich / Jährlich */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 40 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: !yearly ? "var(--text)" : "var(--text-muted)", transition: "color 0.3s var(--ease)" }}>
                    Monatlich
                  </span>
                  <button
                    onClick={() => setYearly(!yearly)}
                    aria-label={yearly ? "Zu monatlicher Abrechnung wechseln" : "Zu jährlicher Abrechnung wechseln"}
                    style={{
                      width: 52, height: 28, borderRadius: 14, border: "1px solid var(--gold-border)",
                      background: yearly ? "var(--gold)" : "var(--surface)", cursor: "pointer",
                      position: "relative", transition: "all 0.3s var(--ease)", padding: 0,
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: yearly ? "var(--bg)" : "var(--gold)",
                      position: "absolute", top: 3,
                      left: yearly ? 28 : 3,
                      transition: "left 0.3s var(--ease)",
                    }} />
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 500, color: yearly ? "var(--text)" : "var(--text-muted)", transition: "color 0.3s var(--ease)" }}>
                    Jährlich
                  </span>
                  {yearly && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--gold)", background: "var(--gold-subtle)", borderRadius: 6, padding: "4px 10px", letterSpacing: "0.04em" }}>
                      −15% sparen
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.08fr 1fr", gap: 20, alignItems: "start" }}>
                {plans.map((plan, i) => {
                  const price = yearly ? plan.yearly : plan.monthly;
                  const isHovered = hoveredCard === i;
                  const isHighlighted = plan.highlighted;

                  return (
                    <div
                      key={plan.name}
                      onMouseEnter={() => setHoveredCard(i)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background: "var(--surface)", borderRadius: 16, padding: isHighlighted ? "40px 32px" : "32px",
                        border: `1px solid ${isHighlighted || isHovered ? "var(--gold-border-hover)" : "var(--gold-border)"}`,
                        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                        transition: "all 0.3s var(--ease)",
                        position: "relative",
                        cursor: "default",
                      }}
                    >
                      {isHighlighted && (
                        <div style={{
                          position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
                          background: "var(--gold)", color: "var(--bg)",
                          fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em",
                          padding: "5px 16px", borderRadius: 6,
                        }}>
                          Empfohlen
                        </div>
                      )}

                      <h3 style={{ fontFamily: "var(--sans)", fontSize: 16, fontWeight: 600, margin: "0 0 4px", color: "var(--text)" }}>{plan.name}</h3>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 24px" }}>{plan.description}</p>

                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.03em", transition: "all 0.4s var(--ease)" }}>
                          {formatPrice(price)}€
                        </span>
                        <span style={{ fontSize: 14, color: "var(--text-muted)", marginLeft: 4 }}>/Monat</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 28px" }}>
                        + {plan.setup}€ einmaliges Setup
                      </p>

                      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 12 }}>
                        {plan.features.map((f) => (
                          <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                              <path d="M3.5 8.5L6.5 11.5L12.5 5" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span style={{ color: "rgba(237,232,223,0.7)" }}>{f}</span>
                          </li>
                        ))}
                      </ul>

                      <a
                        href="https://wa.me/4917647666407?text=Hi%2C%20ich%20interessiere%20mich%20für%20den%20Plan%20"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block", textAlign: "center", padding: "14px 0", borderRadius: 8,
                          fontSize: 14, fontWeight: 600, textDecoration: "none",
                          transition: "all 0.3s var(--ease)", letterSpacing: "0.01em",
                          ...(isHighlighted
                            ? { background: "var(--gold)", color: "var(--bg)" }
                            : { border: "1px solid var(--gold-border)", color: "var(--text-muted)", background: "transparent" }
                          ),
                        }}
                        onMouseEnter={e => {
                          if (!isHighlighted) {
                            (e.target as HTMLElement).style.borderColor = "var(--gold-border-hover)";
                            (e.target as HTMLElement).style.color = "var(--text)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isHighlighted) {
                            (e.target as HTMLElement).style.borderColor = "var(--gold-border)";
                            (e.target as HTMLElement).style.color = "var(--text-muted)";
                          }
                        }}
                      >
                        {plan.cta}
                      </a>
                    </div>
                  );
                })}
              </div>

              {/* Enterprise */}
              <FadeSection delay={0.1}>
                <div style={{
                  marginTop: 24, padding: "24px 32px", borderRadius: 12,
                  border: "1px solid var(--gold-border)", background: "var(--surface)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
                }}>
                  <div>
                    <h3 style={{ fontFamily: "var(--sans)", fontSize: 16, fontWeight: 600, margin: 0, color: "var(--text)" }}>Enterprise</h3>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
                      Ab 5.000€ / Monat · Setup nach Aufwand · Unbegrenzte Bots & Mandanten · White-Label · SLA · Onsite-Onboarding
                    </p>
                  </div>
                  <a
                    href="https://wa.me/4917647666407?text=Hi%2C%20ich%20interessiere%20mich%20für%20Enterprise!"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 13, fontWeight: 600, color: "var(--gold)", textDecoration: "none",
                      border: "1px solid var(--gold-border)", padding: "10px 24px", borderRadius: 8,
                      transition: "all 0.3s var(--ease)", whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = "var(--gold-border-hover)"; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = "var(--gold-border)"; }}
                  >
                    Kontakt aufnehmen
                  </a>
                </div>
              </FadeSection>
            </div>
          </section>
        </FadeSection>

        {/* ═══════════════════════════════════════════
            6. ADD-ONS
            ═══════════════════════════════════════════ */}
        <FadeSection>
          <section style={{ padding: "10rem 2rem" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 32, textAlign: "center" }}>
                Optionale Add-ons
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                {addons.map((addon, i) => (
                  <div
                    key={addon.name}
                    onMouseEnter={() => setHoveredAddon(i)}
                    onMouseLeave={() => setHoveredAddon(null)}
                    style={{
                      background: "var(--surface)", borderRadius: 12, padding: 24,
                      border: `1px solid ${hoveredAddon === i ? "var(--gold-border-hover)" : "var(--gold-border)"}`,
                      transform: hoveredAddon === i ? "translateY(-4px)" : "translateY(0)",
                      transition: "all 0.3s var(--ease)", cursor: "default",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <h4 style={{ fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, margin: 0, color: "var(--text)" }}>{addon.name}</h4>
                      <span style={{ fontFamily: "var(--sans)", fontSize: 16, fontWeight: 600, color: "var(--gold)" }}>{addon.price}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>{addon.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeSection>

        {/* ═══════════════════════════════════════════
            7. TECH & TRUST
            ═══════════════════════════════════════════ */}
        <FadeSection>
          <section style={{ padding: "10rem 2rem", borderTop: "1px solid var(--gold-border)", borderBottom: "1px solid var(--gold-border)" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 40, textAlign: "center" }}>
                Technologie & Vertrauen
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 32 }}>
                {trustPoints.map((point) => (
                  <div key={point.name} style={{ textAlign: "center" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", margin: "0 auto 12px", opacity: 0.6 }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "0 0 4px" }}>{point.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{point.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeSection>

        {/* ═══════════════════════════════════════════
            8. FINALER CTA
            ═══════════════════════════════════════════ */}
        <FadeSection>
          <section style={{ padding: "10rem 2rem" }}>
            <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
              {/* Radialer Gold-Glow */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                  width: 600, height: 400, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)",
                  pointerEvents: "none",
                }}
              />

              <div style={{
                position: "relative", zIndex: 2,
                background: "var(--surface)", border: "1px solid var(--gold-border)",
                borderRadius: 20, padding: "64px 48px", textAlign: "center",
              }}>
                <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", margin: 0 }}>
                  Bereit, Ihren Vertrieb
                  <br />
                  <span style={{ background: "linear-gradient(135deg, #c9a84c 0%, #e8d5a0 50%, #c9a84c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    zu automatisieren?
                  </span>
                </h2>

                <p style={{ fontSize: 15, color: "var(--text-muted)", maxWidth: 460, margin: "24px auto 0", lineHeight: 1.7 }}>
                  Starten Sie jetzt — unser KI-Bot übernimmt den kompletten WhatsApp-Vertrieb.
                </p>

                <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 40, flexWrap: "wrap" }}>
                  <a
                    href="https://wa.me/4917647666407?text=Hi%2C%20ich%20möchte%20eine%20Demo%20sehen!"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, color: "var(--bg)",
                      background: "var(--gold)", padding: "14px 36px", borderRadius: 8,
                      textDecoration: "none", transition: "all 0.3s var(--ease)",
                    }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.transform = "translateY(-2px)"; (e.target as HTMLElement).style.boxShadow = "0 8px 32px rgba(201,168,76,0.2)"; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.transform = "translateY(0)"; (e.target as HTMLElement).style.boxShadow = "none"; }}
                  >
                    Kostenlose Demo starten
                  </a>
                  <a
                    href="https://wa.me/4917647666407?text=Hi!"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, color: "#fff",
                      background: "var(--whatsapp)", padding: "14px 36px", borderRadius: 8,
                      textDecoration: "none", transition: "all 0.3s var(--ease)",
                    }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.opacity = "0.88"; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.opacity = "1"; }}
                  >
                    WhatsApp öffnen
                  </a>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 32, flexWrap: "wrap" }}>
                  {["48h Setup", "Monatlich kündbar", "DSGVO-konform"].map((item) => (
                    <span key={item} style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--gold)", opacity: 0.5 }} />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </FadeSection>

        {/* ═══════════════════════════════════════════
            9. FOOTER
            ═══════════════════════════════════════════ */}
        <footer style={{ borderTop: "1px solid var(--gold-border)", padding: "3rem 2rem" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <span style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 700, color: "var(--text-muted)" }}>
              ai-conversion<span style={{ color: "var(--gold)" }}>.ai</span>
            </span>
            <div style={{ display: "flex", gap: 24 }}>
              {[
                { label: "Impressum", href: "/impressum" },
                { label: "Datenschutz", href: "/datenschutz" },
              ].map((link) => (
                <a key={link.label} href={link.href} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", transition: "color 0.3s var(--ease)" }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--text)"; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--text-muted)"; }}
                >
                  {link.label}
                </a>
              ))}
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              © {new Date().getFullYear()} AI Conversion
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
