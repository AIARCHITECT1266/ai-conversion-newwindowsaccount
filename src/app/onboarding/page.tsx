"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";

// ---------- Typen ----------

interface TenantData {
  id: string;
  name: string;
  slug: string;
  whatsappPhoneId: string;
  brandName: string;
  systemPrompt: string;
  isActive: boolean;
}

// ---------- Konstanten ----------

const STEPS = [
  { number: 1, title: "Unternehmen", description: "Firmendaten erfassen" },
  { number: 2, title: "KI-Prompt", description: "Bot-Verhalten definieren" },
  { number: 3, title: "Live schalten", description: "Bot aktivieren" },
];

const DEFAULT_SYSTEM_PROMPT = `Du bist ein freundlicher und professioneller Vertriebsassistent. Deine Aufgabe ist es, Interessenten zu begrüßen, ihre Bedürfnisse zu verstehen und sie zu qualifizieren.

Regeln:
- Stelle dich kurz vor und frage nach dem Anliegen
- Stelle maximal 2-3 gezielte Fragen zur Bedarfsermittlung
- Sei höflich, aber zielorientiert
- Biete bei Interesse einen Beratungstermin an
- Antworte immer auf Deutsch`;

// ---------- Hilfsfunktionen ----------

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------- Hauptkomponente ----------

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Schritt 1: Formulardaten
  const [companyName, setCompanyName] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");

  // Schritt 2: System-Prompt
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);

  // ---------- Schritt 1: Tenant erstellen ----------

  async function handleStep1() {
    if (!companyName.trim() || !whatsappPhoneId.trim()) {
      setError("Bitte alle Felder ausfüllen.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const slug = generateSlug(companyName);
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName.trim(),
          slug,
          whatsappPhoneId: whatsappPhoneId.trim(),
          brandName: companyName.trim(),
          systemPrompt: "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Erstellen des Tenants.");
        return;
      }

      setTenant(data.tenant);
      setStep(2);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Schritt 2: System-Prompt speichern ----------

  async function handleStep2() {
    if (!tenant) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Speichern des Prompts.");
        return;
      }

      setTenant(data.tenant);
      setStep(3);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Schritt 3: Bot aktivieren ----------

  async function handleGoLive() {
    if (!tenant) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Aktivieren.");
        return;
      }

      setTenant(data.tenant);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Animations-Varianten ----------

  const slideVariants = {
    enter: { x: 60, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -60, opacity: 0 },
  };

  // ---------- Render ----------

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-4 pt-32 sm:p-8 sm:pt-36">
      <Navigation />
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Bot-<span className="text-gradient-purple">Onboarding</span>
          </h1>
          <p className="text-gray-400 mt-2">
            In 3 Schritten zum eigenen WhatsApp-Bot
          </p>
        </div>

        {/* Fortschrittsanzeige */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    step > s.number
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : step === s.number
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_16px_rgba(139,92,246,0.3)]"
                        : "bg-white/5 text-gray-500 border border-white/10"
                  }`}
                >
                  {step > s.number ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.number
                  )}
                </div>
                <span className={`text-xs mt-1.5 hidden sm:block ${
                  step >= s.number ? "text-gray-300" : "text-gray-600"
                }`}>
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-12 sm:w-20 h-px mx-2 transition-colors duration-300 ${
                    step > s.number ? "bg-emerald-500/40" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Inhalt */}
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          {/* Fehlermeldung */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* ========== Schritt 1: Firmendaten ========== */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl font-semibold text-white mb-1">
                  Unternehmen einrichten
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  Grunddaten für Ihren WhatsApp-Bot
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Firmenname
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="z.B. Mustermann GmbH"
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
                    />
                    {companyName && (
                      <p className="text-xs text-gray-500 mt-1">
                        Slug: {generateSlug(companyName)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      WhatsApp Phone ID
                    </label>
                    <input
                      type="text"
                      value={whatsappPhoneId}
                      onChange={(e) => setWhatsappPhoneId(e.target.value)}
                      placeholder="z.B. 123456789012345"
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Aus dem WhatsApp Business Manager (Meta Developer Portal)
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleStep1}
                  disabled={loading}
                  className="mt-8 w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Wird erstellt..." : "Weiter"}
                </button>
              </motion.div>
            )}

            {/* ========== Schritt 2: System-Prompt ========== */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl font-semibold text-white mb-1">
                  KI-Verhalten definieren
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  Geben Sie Ihrem Bot Persönlichkeit und Anweisungen
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    System-Prompt
                  </label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors resize-none text-sm leading-relaxed font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tipp: Definieren Sie Ton, Sprache und Gesprächsablauf. Kann jederzeit im Admin-Dashboard angepasst werden.
                  </p>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => { setStep(1); setError(null); }}
                    className="px-6 py-3 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 font-medium transition-colors"
                  >
                    Zurück
                  </button>
                  <button
                    onClick={handleStep2}
                    disabled={loading}
                    className="flex-1 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Wird gespeichert..." : "Weiter"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ========== Schritt 3: Live schalten ========== */}
            {step === 3 && tenant && (
              <motion.div
                key="step3"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                {!tenant.isActive ? (
                  <>
                    <h2 className="text-xl font-semibold text-white mb-1">
                      Bereit zum Start
                    </h2>
                    <p className="text-gray-400 text-sm mb-6">
                      Prüfen Sie die Konfiguration und schalten Sie den Bot live
                    </p>

                    {/* Zusammenfassung */}
                    <div className="space-y-3 mb-8">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-gray-400 text-sm">Firma</span>
                        <span className="text-white text-sm font-medium">{tenant.name}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-gray-400 text-sm">Slug</span>
                        <span className="text-gray-300 text-sm font-mono">{tenant.slug}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-gray-400 text-sm">WhatsApp Phone ID</span>
                        <span className="text-gray-300 text-sm font-mono">{tenant.whatsappPhoneId}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-gray-400 text-sm block mb-2">System-Prompt</span>
                        <p className="text-gray-300 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                          {tenant.systemPrompt || systemPrompt}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleGoLive}
                      disabled={loading}
                      className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(16,185,129,0.2)]"
                    >
                      {loading ? "Wird aktiviert..." : "Bot live schalten"}
                    </button>
                  </>
                ) : (
                  /* Erfolgsmeldung */
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-center py-6"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-5">
                      <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Bot ist live!
                    </h2>
                    <p className="text-gray-400 mb-8">
                      <span className="text-emerald-400 font-medium">{tenant.name}</span> empfängt jetzt Nachrichten über WhatsApp.
                    </p>

                    <div className="flex gap-3 justify-center">
                      <a
                        href="/admin"
                        className="px-6 py-2.5 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-white/20 font-medium transition-colors text-sm"
                      >
                        Zum Admin-Dashboard
                      </a>
                      <a
                        href={`/dashboard?tenantId=${tenant.id}`}
                        className="px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors text-sm"
                      >
                        Zum Tenant-Dashboard
                      </a>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer-Hinweis */}
        <p className="text-center text-gray-600 text-xs mt-6">
          Nur für interne Nutzung. Kein Authentifizierungsschutz aktiv.
        </p>
      </div>
    </div>
  );
}
