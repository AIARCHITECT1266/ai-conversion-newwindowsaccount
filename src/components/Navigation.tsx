"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, MessageCircle, LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Links fuer die oeffentliche Navigation
const publicLinks = [
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Preise" },
  { href: "/faq", label: "FAQ" },
];

// Auf der Landing Page (#-Anker statt /page#anker)
const homeLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "So funktioniert's" },
  { href: "/pricing", label: "Preise" },
  { href: "/faq", label: "FAQ" },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "/v2";
  const links = isHome ? homeLinks : publicLinks;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile-Menue schliessen bei Navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        scrolled ? "glass shadow-2xl shadow-black/40" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8 lg:py-5">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo1.png"
            alt="AI Conversion"
            width={1024}
            height={1024}
            className="h-20 w-auto sm:h-24 lg:h-28"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 lg:flex">
          {links.map((link) => {
            const isActive =
              !link.href.startsWith("#") && pathname === link.href;
            const isAnchor = link.href.startsWith("#");

            return isAnchor ? (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] font-medium uppercase tracking-[0.08em] text-slate-500 transition-colors duration-300 hover:text-white"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[13px] font-medium uppercase tracking-[0.08em] transition-colors duration-300 hover:text-white ${
                  isActive ? "text-purple-400" : "text-slate-500"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Anmelden */}
          <Link
            href="/dashboard/login"
            className="flex items-center gap-1.5 text-[13px] font-medium uppercase tracking-[0.08em] text-slate-500 transition-colors duration-300 hover:text-white"
          >
            <LogIn className="h-3.5 w-3.5" />
            Anmelden
          </Link>

          {/* CTA — Calendly statt mailto seit 16.04.2026 (Paddle-Deaktivierung, Founding-Phase) */}
          <a
            href="https://calendly.com/philipp-ai-conversion/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-500 hover:scale-[1.02]"
          >
            <MessageCircle className="h-4 w-4" />
            Demo-Call buchen
          </a>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white lg:hidden"
          aria-label="Menu"
        >
          {mobileOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {/* Mobile Menue */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="glass border-t border-white/5 lg:hidden"
          >
            <div className="flex flex-col gap-5 px-6 py-8">
              {links.map((link) => {
                const isAnchor = link.href.startsWith("#");
                return isAnchor ? (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-base font-medium text-slate-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`text-base font-medium transition-colors hover:text-white ${
                      pathname === link.href
                        ? "text-purple-400"
                        : "text-slate-300"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {/* Anmelden (Mobile) */}
              <Link
                href="/dashboard/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-base font-medium text-slate-300 transition-colors hover:text-white"
              >
                <LogIn className="h-4 w-4" />
                Anmelden
              </Link>

              {/* CTA (Mobile) — Calendly statt mailto seit 16.04.2026 */}
              <a
                href="https://calendly.com/philipp-ai-conversion/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-500"
              >
                <MessageCircle className="h-4 w-4" />
                Demo-Call buchen
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
