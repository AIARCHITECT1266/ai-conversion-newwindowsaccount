"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
}

const smartResponses: Record<string, string> = {
  hallo:
    "Hallo! 👋 Willkommen bei AI Conversion. Ich bin Ihr KI-Assistent. Wie kann ich Ihnen helfen? Möchten Sie erfahren, wie unser WhatsApp Bot Ihren Vertrieb automatisiert?",
  hi: "Hi! 👋 Schön, dass Sie hier sind. Ich zeige Ihnen gerne, wie unser KI-Bot in 30 Tagen 100+ qualifizierte Leads für Sie generiert. Was interessiert Sie besonders?",
  lead: "Unser Bot qualifiziert Leads automatisch mit intelligentem Lead-Scoring. Er erkennt Kaufsignale, bewertet Budget und Zeitrahmen — und übergibt nur die heißesten Leads an Ihr Team. Im Schnitt steigern wir die Lead-Qualität um 340%. 🚀",
  preis:
    "Unsere Pakete starten ab 997€/Monat. Dafür bekommen Sie einen vollständig konfigurierten KI-Bot, der 24/7 für Sie arbeitet. Der ROI? Die meisten Kunden haben ihre Investition nach 2 Wochen wieder raus. Soll ich einen Beratungstermin für Sie buchen?",
  kosten:
    "Die Investition startet bei 997€/Monat — inklusive Setup, Training und laufender Optimierung. Bei einer durchschnittlichen Conversion-Steigerung von 340% ist der ROI garantiert. Wollen wir in einem kurzen Call Ihre individuelle Situation besprechen?",
  termin:
    "Perfekt! 📅 Ich empfehle Ihnen unsere kostenlose Strategieberatung. Dort analysieren wir Ihr aktuelles Setup und zeigen Ihnen den konkreten Mehrwert. Scrollen Sie nach unten zum Kalender oder schreiben Sie uns direkt auf WhatsApp!",
  demo: "Natürlich! Sie können den Bot gerade live testen — genau das tun Sie ja! 😄 Für eine vollständige Demo mit Ihrem eigenen Use-Case buchen Sie am besten einen kurzen Call mit unserem Team. Soll ich einen Termin vorschlagen?",
  wie: "Unser KI-Bot wird in 48 Stunden auf Ihre Marke trainiert und in Ihr WhatsApp Business integriert. Er lernt Ihre Produkte, Preise und FAQs. Danach chattet er eigenständig mit Ihren Leads — menschlich, empathisch und verkaufsstark. 🎯",
  whatsapp:
    "WhatsApp hat eine Öffnungsrate von 98% — im Vergleich zu 20% bei E-Mail. Unser Bot nutzt diese Reichweite und verwandelt passive Kontakte in aktive Kunden. 24/7, ohne Wartezeiten. Möchten Sie mehr über die Integration erfahren?",
  challenge:
    "Die 30-Tage-100-Leads-Challenge ist unser Flaggschiff-Programm! 🏆 In 30 Tagen generiert unser Bot mindestens 100 qualifizierte Leads für Ihr Business. Keine Leads? Kein Risiko — wir garantieren das Ergebnis. Interesse?",
  dsgvo: "Selbstverständlich ist unser Bot 100% DSGVO-konform. 🔒 Alle Daten werden auf deutschen Servern verarbeitet, mit Opt-in-Management und automatischer Datenlöschung.",
  danke:
    "Gerne! 😊 Wenn Sie bereit sind, den nächsten Schritt zu gehen, buchen Sie einfach einen kostenlosen Beratungstermin. Wir freuen uns darauf, Ihren Vertrieb auf das nächste Level zu bringen!",
  default:
    "Interessante Frage! 🤔 Unser KI-Bot kann Leads qualifizieren, Termine buchen, FAQs beantworten und vieles mehr — alles automatisch über WhatsApp. Möchten Sie einen konkreten Aspekt vertiefen, oder soll ich einen Beratungstermin arrangieren?",
};

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const [key, response] of Object.entries(smartResponses)) {
    if (key !== "default" && lower.includes(key)) return response;
  }
  return smartResponses.default;
}

function getTime(): string {
  return new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hallo! 👋 Ich bin der AI Conversion Bot. Testen Sie mich — fragen Sie mich etwas über automatisierte Lead-Generierung via WhatsApp!",
      sender: "bot",
      timestamp: getTime(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now(), text: input.trim(), sender: "user", timestamp: getTime() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: getResponse(userMsg.text), sender: "bot", timestamp: getTime() }]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  };

  return (
    <>
      {/* Floating button — immer sichtbar, groß */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_40px_rgba(37,211,102,0.3)] animate-pulse-green"
            aria-label="Chat öffnen"
          >
            <MessageCircle className="h-8 w-8" />
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-[11px] font-bold text-white shadow-lg">
              1
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 flex h-[540px] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-purple-500/[0.08] bg-navy-900 shadow-[0_0_80px_rgba(0,0,0,0.5)]"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/[0.04] bg-navy-800/80 px-6 py-4">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                  <Bot className="h-5 w-5 text-emerald-400" />
                </div>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-navy-800 bg-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">AI Conversion Bot</h3>
                <p className="text-xs text-emerald-400/80">Online — antwortet sofort</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Chat schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="flex flex-col gap-3">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex max-w-[85%] items-end gap-2 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${msg.sender === "user" ? "bg-purple-500/15" : "bg-emerald-500/15"}`}>
                        {msg.sender === "user" ? <User className="h-3 w-3 text-purple-400" /> : <Bot className="h-3 w-3 text-emerald-400" />}
                      </div>
                      <div>
                        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.sender === "user" ? "rounded-br-md bg-purple-500 text-white" : "rounded-bl-md bg-white/[0.04] text-slate-300"}`}>
                          {msg.text}
                        </div>
                        <span className="mt-1 block text-[10px] text-slate-700">{msg.timestamp}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15">
                      <Bot className="h-3 w-3 text-emerald-400" />
                    </div>
                    <div className="rounded-2xl rounded-bl-md bg-white/[0.04] px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-600" style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-white/[0.04] bg-navy-800/80 p-4">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nachricht eingeben..."
                  className="flex-1 rounded-xl border border-white/[0.04] bg-navy-950/80 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-colors focus:border-purple-500/20"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500 text-white transition-all hover:bg-purple-400 disabled:opacity-20"
                  aria-label="Senden"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <p className="mt-2.5 text-center text-[10px] text-slate-700">
                Powered by AI Conversion · Live-Demo
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
