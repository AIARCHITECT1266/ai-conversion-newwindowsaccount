"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { Building2, Wrench, Users, Shield, Database, Clock, Brain, Lock, Server, Globe } from "lucide-react";

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

interface TargetGroup {
  title: string;
  problem: string;
  solution: string;
  icon: ReactNode;
}

interface TrustPoint {
  name: string;
  description: string;
  icon: ReactNode;
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

const targetGroups: TargetGroup[] = [
  {
    title: "Immobilienmakler",
    problem: "Exposé-Anfragen bleiben stundenlang unbeantwortet — Interessenten gehen zur Konkurrenz.",
    solution: "Sofortige Antwort auf jede Anfrage. Besichtigungstermine werden automatisch gebucht.",
    icon: <Building2 size={28} strokeWidth={1.5} />,
  },
  {
    title: "Handwerksbetriebe",
    problem: "Aufträge gehen verloren, weil niemand ans Telefon geht wenn die Hände auf der Baustelle sind.",
    solution: "24/7 Anfragen entgegennehmen, Termine koordinieren, Angebote nachfassen — automatisch.",
    icon: <Wrench size={28} strokeWidth={1.5} />,
  },
  {
    title: "Coaches & Berater",
    problem: "Qualifizierung frisst Zeit — 80% der Erstgespräche führen zu nichts.",
    solution: "Der Bot qualifiziert vor und bucht nur Gespräche mit echten Interessenten.",
    icon: <Users size={28} strokeWidth={1.5} />,
  },
];

const trustPoints: TrustPoint[] = [
  { name: "Claude Sonnet + GPT-4o", description: "Modernste Sprachmodelle", icon: <Brain size={20} strokeWidth={1.5} /> },
  { name: "AES-256", description: "Verschlüsselung", icon: <Lock size={20} strokeWidth={1.5} /> },
  { name: "PostgreSQL Frankfurt", description: "DSGVO-konforme Datenhaltung", icon: <Database size={20} strokeWidth={1.5} /> },
  { name: "99,9% Uptime", description: "Enterprise-Verfügbarkeit", icon: <Clock size={20} strokeWidth={1.5} /> },
  { name: "DSGVO", description: "Vollständig konform", icon: <Shield size={20} strokeWidth={1.5} /> },
  { name: "Multi-Tenant", description: "Isolierte Mandanten", icon: <Server size={20} strokeWidth={1.5} /> },
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

/* ── Animierter Counter ── */
function AnimatedCounter({ value, suffix = "", prefix = "" }: { value: string; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [displayed, setDisplayed] = useState(value);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          /* Prüfe ob numerisch */
          const numericMatch = value.replace(/[.,]/g, "").match(/^(\d+)/);
          if (numericMatch) {
            const target = parseInt(numericMatch[1], 10);
            const formatted = value;
            const duration = 1200;
            const start = performance.now();
            const animate = (now: number) => {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              const current = Math.round(target * eased);
              /* Format wie Original */
              const currentStr = value.includes(",")
                ? current.toLocaleString("de-DE").replace(/\./g, ",")
                : value.includes(".")
                  ? current.toLocaleString("de-DE")
                  : String(current);
              setDisplayed(progress >= 1 ? formatted : currentStr);
              if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
          }
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return <span ref={ref}>{prefix}{displayed}{suffix}</span>;
}

/* ── Animierte Chat-Nachricht ── */
function ChatMessage({ children, align, delay, style }: { children: ReactNode; align: "left" | "right"; delay: number; style: React.CSSProperties }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          const timer = setTimeout(() => setVisible(true), delay);
          obs.disconnect();
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div ref={ref} style={{ display: "flex", justifyContent: align === "left" ? "flex-start" : "flex-end" }}>
      <div
        className="chat-msg-animate"
        style={{
          ...style,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.95)",
          transition: "opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {children}
      </div>
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
        height: "2px",
        width: `${progress * 100}%`,
        background: "linear-gradient(90deg, transparent, var(--purple), var(--gold), transparent)",
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
  const [hoveredTarget, setHoveredTarget] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const formatPrice = useCallback((n: number): string => {
    return n.toLocaleString("de-DE");
  }, []);

  return (
    <>
      {/* ── Design Tokens + Keyframes ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700;900&family=Geist:wght@400;500;600&display=swap');
        :root {
          --bg: #07070d;
          --surface: #0e0e1a;
          --gold: #c9a84c;
          --gold-subtle: rgba(201,168,76,0.08);
          --gold-border: rgba(201,168,76,0.1);
          --gold-border-hover: rgba(201,168,76,0.35);
          --purple: #8b5cf6;
          --purple-hover: #7c3aed;
          --purple-subtle: rgba(139,92,246,0.08);
          --purple-border: rgba(139,92,246,0.25);
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

        @media (prefers-reduced-motion: reduce) {
          .stagger-1, .stagger-2, .stagger-3,
          .stagger-4, .stagger-5, .stagger-6 {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .chat-msg-animate {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }

        /* Mobile Nav Overlay */
        .mobile-menu-overlay {
          position: fixed; inset: 0; z-index: 99;
          background: rgba(7,7,13,0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 32px;
          opacity: 0; pointer-events: none;
          transition: opacity 0.3s var(--ease);
        }
        .mobile-menu-overlay.open {
          opacity: 1; pointer-events: auto;
        }

        /* Responsive Stats */
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 32px !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .target-grid { grid-template-columns: 1fr !important; }
          .trust-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .nav-links { display: none !important; }
          .hamburger { display: flex !important; }
          .footer-inner { flex-direction: column; text-align: center; gap: 24px !important; }
          .hero-section { padding: 8rem 1.5rem 4rem !important; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .trust-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .hamburger { display: none !important; }
        }
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
            1. NAV – Sticky, Blur, Mobile Hamburger
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
            <a href="/" style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 700, textDecoration: "none", color: "var(--text)", letterSpacing: "-0.02em" }}>
              AI Conversion<span style={{ color: "var(--gold)" }}>.</span>
            </a>

            {/* Mitte-Links */}
            <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <a
                href="#features-section"
                style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500, color: "var(--text-muted)", textDecoration: "none", transition: "color 0.3s var(--ease)" }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--text)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--text-muted)"; }}
              >
                Features
              </a>
              <a
                href="/pricing"
                style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500, color: "var(--text-muted)", textDecoration: "none", transition: "color 0.3s var(--ease)" }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--text)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--text-muted)"; }}
              >
                Preise
              </a>
            </div>

            {/* Rechts: CTA + Hamburger */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <a
                href="https://wa.me/4917647666407?text=Hi%2C%20ich%20möchte%20eine%20Demo%20sehen!"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-links"
                style={{
                  fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, color: "#fff",
                  background: "var(--purple)", padding: "10px 24px", borderRadius: 6,
                  textDecoration: "none", transition: "all 0.3s var(--ease)",
                  letterSpacing: "0.02em",
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = "var(--purple-hover)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = "var(--purple)"; }}
              >
                Demo starten
              </a>

              {/* Hamburger Button */}
              <button
                className="hamburger"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Menü öffnen"
                style={{
                  display: "none", flexDirection: "column", gap: 5, background: "none",
                  border: "none", cursor: "pointer", padding: 8, zIndex: 101,
                }}
              >
                <span style={{ width: 24, height: 2, background: "var(--text)", borderRadius: 2, transition: "all 0.3s var(--ease)", transform: mobileMenuOpen ? "rotate(45deg) translateY(7px)" : "none" }} />
                <span style={{ width: 24, height: 2, background: "var(--text)", borderRadius: 2, transition: "all 0.3s var(--ease)", opacity: mobileMenuOpen ? 0 : 1 }} />
                <span style={{ width: 24, height: 2, background: "var(--text)", borderRadius: 2, transition: "all 0.3s var(--ease)", transform: mobileMenuOpen ? "rotate(-45deg) translateY(-7px)" : "none" }} />
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        <div className={`mobile-menu-overlay ${mobileMenuOpen ? "open" : ""}`}>
          <a href="#features-section" onClick={() => setMobileMenuOpen(false)} style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, color: "var(--text)", textDecoration: "none" }}>Features</a>
          <a href="/pricing" onClick={() => setMobileMenuOpen(false)} style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, color: "var(--text)", textDecoration: "none" }}>Preise</a>
          <a href="#pricing-section" onClick={() => setMobileMenuOpen(false)} style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 700, color: "var(--gold)", textDecoration: "none" }}>Pakete</a>
          <a
            href="https://wa.me/4917647666407?text=Hi%2C%20ich%20möchte%20eine%20Demo%20sehen!"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              fontFamily: "var(--sans)", fontSize: 16, fontWeight: 600, color: "#fff",
              background: "var(--purple)", padding: "14px 40px", borderRadius: 8,
              textDecoration: "none", marginTop: 16,
            }}
          >
            Demo starten
          </a>
        </div>

        {/* ═══════════════════════════════════════════
            2. HERO
            ═══════════════════════════════════════════ */}
        <section className="hero-section" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "10rem 2rem 6rem" }}>
          {/* Radialer Gold-Glow */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-40%)",
              width: 800, height: 800, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(139,92,246,0.04) 0%, rgba(201,168,76,0.03) 40%, transparent 70%)",
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
              style={{ fontFamily: "var(--sans)", fontSize: 18, fontWeight: 400, color: "var(--text-muted)", maxWidth: 600, margin: "32px auto 0", lineHeight: 1.7 }}
            >
              KI-gestützter WhatsApp-Vertrieb für den DACH-Markt.
              Leads qualifizieren, Termine buchen, Umsatz steigern –
              vollautomatisch, rund um die Uhr.
            </p>

            {/* Garantie-Claim */}
            <p
              className="stagger-4"
              style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500, color: "var(--gold)", marginTop: 20, opacity: 0.85 }}
            >
              Bis zu 100 qualifizierte Leads in 30 Tagen – oder Geld zurück
            </p>

            {/* Buttons */}
            <div className="stagger-5" style={{ display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap", justifyContent: "center" }}>
              <a
                href="https://wa.me/4917647666407?text=Hi%2C%20ich%20möchte%20eine%20Demo%20sehen!"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, color: "#fff",
                  background: "var(--purple)", padding: "14px 36px", borderRadius: 8,
                  textDecoration: "none", transition: "all 0.3s var(--ease)", letterSpacing: "0.01em",
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = "var(--purple-hover)"; (e.target as HTMLElement).style.transform = "translateY(-2px)"; (e.target as HTMLElement).style.boxShadow = "0 8px 32px rgba(139,92,246,0.25)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = "var(--purple)"; (e.target as HTMLElement).style.transform = "translateY(0)"; (e.target as HTMLElement).style.boxShadow = "none"; }}
              >
                Kostenlose Demo starten
              </a>
              <a
                href="/pricing"
                style={{
                  fontFamily: "var(--sans)", fontSize: 15, fontWeight: 500, color: "var(--gold)",
                  border: "1px solid var(--gold-border-hover)", padding: "14px 36px", borderRadius: 8,
                  textDecoration: "none", transition: "all 0.3s var(--ease)", background: "transparent",
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = "var(--gold)"; (e.target as HTMLElement).style.background = "var(--gold-subtle)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = "var(--gold-border-hover)"; (e.target as HTMLElement).style.background = "transparent"; }}
              >
                Preise ansehen
              </a>
            </div>

            {/* WhatsApp Chat Card – Animierte Nachrichten */}
            <div
              className="stagger-6"
              style={{
                marginTop: 80, width: "100%", maxWidth: 480,
                background: "var(--surface)", border: "1px solid var(--gold-border)",
                borderRadius: 16, overflow: "hidden", position: "relative",
                boxShadow: "0 24px 80px rgba(0,0,0,0.4), 0 0 120px rgba(139,92,246,0.03)",
              }}
            >
              {/* Chat Header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--gold-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--whatsapp)", animation: "goldPulse 2.5s ease-in-out infinite" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>KI-Vertriebs-Bot</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>aktiv</span>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>09:43</span>
              </div>

              {/* Chat Messages – animiert */}
              <div style={{ padding: "20px 20px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
                <ChatMessage align="left" delay={300} style={{ background: "rgba(237,232,223,0.04)", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", maxWidth: "80%", fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>
                  Hallo, ich habe ein Malergeschäft mit 12 Mitarbeitern. Können Sie uns bei der Akquise helfen?
                </ChatMessage>
                <ChatMessage align="right" delay={1200} style={{ background: "var(--gold-subtle)", border: "1px solid var(--gold-border)", borderRadius: "12px 12px 4px 12px", padding: "10px 14px", maxWidth: "80%", fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>
                  Guten Morgen! Handwerk ist unsere Spezialität. Suchen Sie regionale oder überregionale Aufträge?
                </ChatMessage>
                <ChatMessage align="left" delay={2200} style={{ background: "rgba(237,232,223,0.04)", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", maxWidth: "80%", fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>
                  Nur München und Umgebung, 30 km Radius.
                </ChatMessage>
              </div>

              {/* Lead Score Badge */}
              <div style={{ padding: "0 20px 20px", display: "flex", justifyContent: "flex-end" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  border: "1px solid var(--purple-border)", borderRadius: 8, padding: "6px 12px",
                  background: "var(--purple-subtle)",
                }}>
                  <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Lead Score</span>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 700, color: "var(--purple)" }}>92</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>/ 100</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            3. STATS – 5 Werte mit Counter-Animation
            ═══════════════════════════════════════════ */}
        <FadeSection>
          <section style={{ padding: "6rem 2rem", borderTop: "1px solid var(--gold-border)", borderBottom: "1px solid var(--gold-border)" }}>
            <div className="stats-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
              {[
                { value: "3", prefix: "< ", suffix: " Sek.", label: "Antwortzeit" },
                { value: "3,4", suffix: "×", label: "mehr Conversions" },
                { value: "24", suffix: " / 7", label: "Verfügbarkeit" },
                { value: "DSGVO", suffix: "", label: "Vollständig konform" },
                { value: "497", prefix: "Ab ", suffix: "€/Monat", label: "Einstiegspreis" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  style={{
                    textAlign: "center", padding: "0 1.5rem",
                    borderRight: i < 4 ? "1px solid rgba(201,168,76,0.15)" : "none",
                  }}
                >
                  <p style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
                    {stat.value === "DSGVO" ? stat.value : (
                      <AnimatedCounter value={stat.value} prefix={stat.prefix || ""} suffix={stat.suffix} />
                    )}
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
            4. ZIELGRUPPEN – mit Lucide Icons
            ═══════════════════════════════════════════ */}
        <FadeSection>
          <section id="features-section" style={{ padding: "8rem 2rem" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <div style={{ maxWidth: 600, marginBottom: 64 }}>
                <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 16 }}>Zielgruppen</p>
                <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", margin: 0 }}>
                  Gebaut für Macher.
                </h2>
              </div>

              <div className="target-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
                {targetGroups.map((group, i) => (
                  <div
                    key={group.title}
                    onMouseEnter={() => setHoveredTarget(i)}
                    onMouseLeave={() => setHoveredTarget(null)}
                    style={{
                      background: "var(--surface)", borderRadius: 16, padding: "40px 36px",
                      border: `1px solid ${hoveredTarget === i ? "var(--gold-border-hover)" : "var(--gold-border)"}`,
                      transform: hoveredTarget === i ? "translateY(-4px)" : "translateY(0)",
                      transition: "all 0.3s var(--ease)",
                      cursor: "default",
                    }}
                  >
                    <div style={{ color: "var(--gold)", marginBottom: 20 }}>
                      {group.icon}
                    </div>
                    <h3 style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 700, margin: "0 0 24px", letterSpacing: "-0.01em" }}>{group.title}</h3>
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
            5. PRICING – 3 Pakete, kein Add-On
            ═══════════════════════════════════════════ */}
        <FadeSection>
          <section id="pricing-section" style={{ padding: "8rem 2rem" }}>
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
                      width: 52, height: 28, borderRadius: 14, border: "1px solid var(--purple-border)",
                      background: yearly ? "var(--purple)" : "var(--surface)", cursor: "pointer",
                      position: "relative", transition: "all 0.3s var(--ease)", padding: 0,
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: yearly ? "#fff" : "var(--purple)",
                      position: "absolute", top: 3,
                      left: yearly ? 28 : 3,
                      transition: "left 0.3s var(--ease)",
                    }} />
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 500, color: yearly ? "var(--text)" : "var(--text-muted)", transition: "color 0.3s var(--ease)" }}>
                    Jährlich
                  </span>
                  {yearly && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--purple)", background: "var(--purple-subtle)", borderRadius: 6, padding: "4px 10px", letterSpacing: "0.04em", border: "1px solid var(--purple-border)" }}>
                      −15% sparen
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing Cards */}
              <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.08fr 1fr", gap: 20, alignItems: "start" }}>
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
                        border: `1px solid ${isHighlighted ? "var(--purple-border)" : isHovered ? "var(--gold-border-hover)" : "var(--gold-border)"}`,
                        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                        transition: "all 0.3s var(--ease)",
                        position: "relative",
                        cursor: "default",
                      }}
                    >
                      {isHighlighted && (
                        <div style={{
                          position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
                          background: "var(--purple)", color: "#fff",
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
                              <path d="M3.5 8.5L6.5 11.5L12.5 5" stroke={isHighlighted ? "var(--purple)" : "var(--gold)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                            ? { background: "var(--purple)", color: "#fff" }
                            : { border: "1px solid var(--gold-border)", color: "var(--text-muted)", background: "transparent" }
                          ),
                        }}
                        onMouseEnter={e => {
                          if (isHighlighted) {
                            (e.target as HTMLElement).style.background = "var(--purple-hover)";
                          } else {
                            (e.target as HTMLElement).style.borderColor = "var(--gold-border-hover)";
                            (e.target as HTMLElement).style.color = "var(--text)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (isHighlighted) {
                            (e.target as HTMLElement).style.background = "var(--purple)";
                          } else {
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

              {/* Alle Details Link */}
              <div style={{ textAlign: "center", marginTop: 40 }}>
                <a
                  href="/pricing"
                  style={{
                    fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500, color: "var(--gold)",
                    textDecoration: "none", borderBottom: "1px solid var(--gold-border)",
                    paddingBottom: 2, transition: "all 0.3s var(--ease)",
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = "var(--gold)"; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = "var(--gold-border)"; }}
                >
                  Alle Details & Add-Ons ansehen →
                </a>
              </div>
            </div>
          </section>
        </FadeSection>

        {/* ═══════════════════════════════════════════
            6. TECH & TRUST BAR – mit Icons
            ═══════════════════════════════════════════ */}
        <FadeSection>
          <section style={{ padding: "5rem 2rem", borderTop: "1px solid var(--gold-border)", borderBottom: "1px solid var(--gold-border)" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 40, textAlign: "center" }}>
                Technologie & Vertrauen
              </p>
              <div className="trust-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 32 }}>
                {trustPoints.map((point) => (
                  <div key={point.name} style={{ textAlign: "center" }}>
                    <div style={{ color: "var(--gold)", margin: "0 auto 12px", opacity: 0.7, display: "flex", justifyContent: "center" }}>
                      {point.icon}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "0 0 4px" }}>{point.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{point.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeSection>

        {/* ═══════════════════════════════════════════
            7. FINALER CTA
            ═══════════════════════════════════════════ */}
        <FadeSection>
          <section style={{ padding: "8rem 2rem" }}>
            <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
              <div
                aria-hidden="true"
                style={{
                  position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                  width: 600, height: 400, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)",
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
                  <span style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #c9a84c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
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
                      fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, color: "#fff",
                      background: "var(--purple)", padding: "14px 36px", borderRadius: 8,
                      textDecoration: "none", transition: "all 0.3s var(--ease)",
                    }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = "var(--purple-hover)"; (e.target as HTMLElement).style.transform = "translateY(-2px)"; (e.target as HTMLElement).style.boxShadow = "0 8px 32px rgba(139,92,246,0.25)"; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = "var(--purple)"; (e.target as HTMLElement).style.transform = "translateY(0)"; (e.target as HTMLElement).style.boxShadow = "none"; }}
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
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--purple)", opacity: 0.6 }} />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </FadeSection>

        {/* ═══════════════════════════════════════════
            8. FOOTER
            ═══════════════════════════════════════════ */}
        <footer style={{ borderTop: "1px solid var(--gold-border)", padding: "3rem 2rem" }}>
          <div className="footer-inner" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              {[
                { label: "Impressum", href: "/impressum" },
                { label: "Datenschutz", href: "/datenschutz" },
                { label: "Preise", href: "/pricing" },
              ].map((link) => (
                <a key={link.label} href={link.href} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", transition: "color 0.3s var(--ease)" }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--text)"; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--text-muted)"; }}
                >
                  {link.label}
                </a>
              ))}
            </div>
            <a href="mailto:hello@ai-conversion.ai" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", transition: "color 0.3s var(--ease)" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--text)"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--text-muted)"; }}
            >
              hello@ai-conversion.ai
            </a>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              © 2026 AI Conversion
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
