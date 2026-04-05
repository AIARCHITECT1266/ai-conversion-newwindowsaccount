"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import {
  BRANCHEN_TEMPLATES,
  getTemplateById,
  fillPromptTemplate,
} from "@/lib/bot/system-prompts";

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
  { number: 2, title: "Branche", description: "Bot-Vorlage wählen" },
  { number: 3, title: "KI-Prompt", description: "Bot-Verhalten definieren" },
  { number: 4, title: "Live schalten", description: "Bot aktivieren" },
];

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

  // Schritt 1: Firmendaten
  const [companyName, setCompanyName] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [botName, setBotName] = useState("");
  const [region, setRegion] = useState("");

  // Schritt 2: Branchenauswahl
  const [selectedBranche, setSelectedBranche] = useState<string | null>(null);

  // Schritt 3: System-Prompt (wird aus Template vorausgefuellt)
  const [systemPrompt, setSystemPrompt] = useState("");

  // ---------- Schritt 1: Tenant erstellen ----------

  async function handleStep1() {
    if (!companyName.trim() || !whatsappPhoneId.trim()) {
      setError("Bitte Firmenname und WhatsApp Phone ID ausfüllen.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const slug = generateSlug(companyName);
      const res = await fetch("/api/onboarding", {
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

  // ---------- Schritt 2: Branche wählen → Prompt generieren ----------

  function handleStep2() {
    if (!selectedBranche) {
      setError("Bitte wählen Sie eine Branche aus.");
      return;
    }

    setError(null);

    // Template mit Firmendaten vorausfuellen
    const template = getTemplateById(selectedBranche);
    const filledPrompt = fillPromptTemplate(template.template, {
      botName: botName.trim() || "Max",
      firmenname: companyName.trim(),
      branche: template.label,
      region: region.trim() || "DACH-Raum",
    });

    setSystemPrompt(filledPrompt);
    setStep(3);
  }

  // ---------- Schritt 3: System-Prompt speichern ----------

  async function handleStep3() {
    if (!tenant) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id, systemPrompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Speichern des Prompts.");
        return;
      }

      setTenant(data.tenant);
      setStep(4);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Schritt 4: Bot aktivieren ----------

  async function handleGoLive() {
    if (!tenant) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id, isActive: true }),
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
            In 4 Schritten zum eigenen WhatsApp-Bot
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
                  className={`w-8 sm:w-14 h-px mx-1.5 transition-colors duration-300 ${
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
                      Firmenname <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="z.B. Mustermann Immobilien GmbH"
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
                      WhatsApp Phone ID <span className="text-red-400">*</span>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Bot-Name
                      </label>
                      <input
                        type="text"
                        value={botName}
                        onChange={(e) => setBotName(e.target.value)}
                        placeholder="z.B. Max, Lisa"
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Optional – Standard: Max
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Region
                      </label>
                      <input
                        type="text"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        placeholder="z.B. München, Rhein-Main"
                        className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Optional – Standard: DACH-Raum
                      </p>
                    </div>
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

            {/* ========== Schritt 2: Branchenauswahl ========== */}
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
                  Branche wählen
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  Wählen Sie eine Vorlage – der System-Prompt wird automatisch angepasst
                </p>

                <div className="space-y-3">
                  {BRANCHEN_TEMPLATES.map((branche) => (
                    <button
                      key={branche.id}
                      onClick={() => setSelectedBranche(branche.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        selectedBranche === branche.id
                          ? "border-purple-500/50 bg-purple-500/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">{branche.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-semibold ${
                              selectedBranche === branche.id ? "text-purple-300" : "text-white"
                            }`}>
                              {branche.label}
                            </p>
                            {selectedBranche === branche.id && (
                              <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {branche.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
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
                    disabled={!selectedBranche}
                    className="flex-1 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Weiter
                  </button>
                </div>
              </motion.div>
            )}

            {/* ========== Schritt 3: System-Prompt ========== */}
            {step === 3 && (
              <motion.div
                key="step3"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl font-semibold text-white mb-1">
                  KI-Verhalten anpassen
                </h2>
                <p className="text-gray-400 text-sm mb-2">
                  Der Prompt wurde automatisch für{" "}
                  <span className="text-purple-400 font-medium">
                    {selectedBranche ? getTemplateById(selectedBranche).label : "Ihre Branche"}
                  </span>{" "}
                  generiert. Passen Sie ihn bei Bedarf an.
                </p>
                <p className="text-gray-600 text-xs mb-6">
                  {systemPrompt.length.toLocaleString("de-DE")} / 10.000 Zeichen
                </p>

                <div>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={18}
                    maxLength={10000}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors resize-none text-sm leading-relaxed font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tipp: Definieren Sie Ton, Gesprächsablauf, Einwände und Terminbuchung. Kann jederzeit im Admin-Dashboard angepasst werden.
                  </p>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => { setStep(2); setError(null); }}
                    className="px-6 py-3 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 font-medium transition-colors"
                  >
                    Zurück
                  </button>
                  <button
                    onClick={handleStep3}
                    disabled={loading}
                    className="flex-1 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Wird gespeichert..." : "Weiter"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ========== Schritt 4: Live schalten ========== */}
            {step === 4 && tenant && (
              <motion.div
                key="step4"
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
                        <span className="text-gray-400 text-sm">Branche</span>
                        <span className="text-purple-400 text-sm font-medium">
                          {selectedBranche ? getTemplateById(selectedBranche).icon + " " + getTemplateById(selectedBranche).label : "–"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-gray-400 text-sm">Bot-Name</span>
                        <span className="text-gray-300 text-sm">{botName || "Max"}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-gray-400 text-sm">Region</span>
                        <span className="text-gray-300 text-sm">{region || "DACH-Raum"}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-gray-400 text-sm">WhatsApp Phone ID</span>
                        <span className="text-gray-300 text-sm font-mono">{tenant.whatsappPhoneId}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-gray-400 text-sm block mb-2">
                          System-Prompt ({(tenant.systemPrompt || systemPrompt).length.toLocaleString("de-DE")} Zeichen)
                        </span>
                        <p className="text-gray-300 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                          {(tenant.systemPrompt || systemPrompt).slice(0, 500)}
                          {(tenant.systemPrompt || systemPrompt).length > 500 && "..."}
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
          Nur für interne Nutzung. Rate-Limiting aktiv.
        </p>
      </div>
    </div>
  );
}
