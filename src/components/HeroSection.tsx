"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  ArrowRight,
  Shield,
  TrendingUp,
  Zap,
  Calendar,
  BarChart3,
  RefreshCcw,
  Users,
  Activity,
  CheckCircle,
} from "lucide-react";

/* ─── Chat script ─── */
interface ChatMsg {
  id: number;
  sender: "lead" | "bot";
  text: string;
  delayMs: number;
}

const script: ChatMsg[] = [
  { id: 1, sender: "lead", text: "Hallo, ich habe eine Baufirma mit 15 Mitarbeitern und wir suchen händeringend Elektriker. Können Sie helfen?", delayMs: 600 },
  { id: 2, sender: "bot", text: "Hallo! Ja, Handwerk & Recruiting ist unsere Spezialität. Suchen Sie regional oder bundesweit?", delayMs: 3200 },
  { id: 3, sender: "lead", text: "Nur im Umkreis von 50 km um München.", delayMs: 5800 },
  { id: 4, sender: "bot", text: "Perfekt. Daten qualifiziert. Passt morgen um 10:00 Uhr für einen kurzen Call?", delayMs: 8000 },
];

/* ─── Dashboard pipeline rows ─── */
const pipelineLeads = [
  { name: "M. Schneider", company: "Schneider Bau", score: 94, status: "qualified" },
  { name: "A. Fischer", company: "Fischer Elektro", score: 87, status: "nurturing" },
  { name: "T. Krüger", company: "TK Immobilien", score: 92, status: "booked" },
  { name: "S. Hoffmann", company: "DigiHealth AG", score: 78, status: "new" },
];

interface Badge {
  id: string;
  icon: React.ElementType;
  label: string;
  value: string;
  color: "green" | "purple";
  triggerMs: number;
  pos: string;
}

const badges: Badge[] = [
  { id: "score", icon: BarChart3, label: "Lead Scoring", value: "High Intent", color: "green", triggerMs: 3800, pos: "-left-4 top-[30%] lg:-left-20" },
  { id: "hubspot", icon: RefreshCcw, label: "HubSpot Sync", value: "Success", color: "purple", triggerMs: 8600, pos: "-right-4 top-[55%] lg:-right-20" },
];

const spring = { type: "spring" as const, stiffness: 80, damping: 20 };

export default function HeroSection() {
  const [visible, setVisible] = useState<number[]>([]);
  const [typing, setTyping] = useState(false);
  const [shownBadges, setShownBadges] = useState<string[]>([]);
  const [dashStatus, setDashStatus] = useState<"idle" | "analyzing" | "replying" | "qualified" | "booked">("idle");

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];

    // Chat + dashboard status sync
    t.push(setTimeout(() => setDashStatus("analyzing"), 400));
    t.push(setTimeout(() => { setVisible((p) => [...p, 1]); setDashStatus("replying"); }, 600));
    t.push(setTimeout(() => setTyping(true), 2300));
    t.push(setTimeout(() => { setTyping(false); setVisible((p) => [...p, 2]); setDashStatus("analyzing"); }, 3200));
    t.push(setTimeout(() => { setVisible((p) => [...p, 3]); setDashStatus("replying"); }, 5800));
    t.push(setTimeout(() => setTyping(true), 7100));
    t.push(setTimeout(() => { setTyping(false); setVisible((p) => [...p, 4]); setDashStatus("qualified"); }, 8000));
    t.push(setTimeout(() => setDashStatus("booked"), 9200));

    badges.forEach((b) =>
      t.push(setTimeout(() => setShownBadges((p) => [...p, b.id]), b.triggerMs))
    );
    return () => t.forEach(clearTimeout);
  }, []);

  const statusConfig = {
    idle: { text: "Bereit", color: "text-slate-500", dot: "bg-slate-500" },
    analyzing: { text: "Analysiert Lead...", color: "text-yellow-400", dot: "bg-yellow-400" },
    replying: { text: "Antwortet...", color: "text-emerald-400", dot: "bg-emerald-400 animate-pulse" },
    qualified: { text: "Lead qualifiziert", color: "text-emerald-400", dot: "bg-emerald-400" },
    booked: { text: "Termin gebucht ✓", color: "text-purple-300", dot: "bg-purple-400" },
  };

  const sc = statusConfig[dashStatus];

  return (
    <section className="relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[20%] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-purple-600/[0.05] blur-[200px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 pb-0 pt-44 lg:px-8 lg:pt-52">
        {/* ═══ Centered Copy ═══ */}
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-purple-500/15 bg-purple-500/[0.04] px-5 py-2"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[13px] font-medium tracking-wide text-purple-200/80">
              KI WhatsApp Growth Bot für den DACH-Raum
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.06] tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-[4rem]"
          >
            Ihr KI-Bot qualifiziert Leads
            <br className="hidden sm:block" />
            &amp; bucht Termine —{" "}
            <span className="text-gradient-purple">rund um die Uhr</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
            className="mx-auto mt-8 max-w-xl text-[1.1rem] leading-[1.8] text-slate-400"
          >
            Verwandeln Sie WhatsApp in Ihren stärksten Vertriebskanal.
            Unser Premium KI-Bot führt Verkaufsgespräche, qualifiziert
            Leads und bucht Termine — vollautomatisch.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <a
              href="https://wa.me/4917647666407?text=Hi%2C%20ich%20möchte%20den%20KI-Bot%20testen!"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow-green group flex items-center gap-3 rounded-full bg-emerald-500 px-9 py-4.5 text-[15px] font-bold text-white shadow-[0_0_40px_rgba(37,211,102,0.2)] hover:bg-emerald-400 hover:scale-[1.02] animate-pulse-green"
            >
              <MessageCircle className="h-5 w-5" />
              Jetzt Demo-Chat starten
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            <a
              href="#contact"
              className="flex items-center gap-2 rounded-full border border-white/[0.06] px-8 py-4.5 text-[15px] font-medium text-slate-500 transition-all duration-300 hover:border-purple-500/20 hover:text-white"
            >
              <Calendar className="h-4 w-4" />
              Termin buchen
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55, ease: "easeOut" }}
            className="mt-10 flex flex-wrap items-center justify-center gap-8 text-[13px] text-slate-600"
          >
            {[
              { icon: Shield, text: "DSGVO-konform" },
              { icon: TrendingUp, text: "Ø 340% mehr Leads" },
              { icon: Zap, text: "Live in 48h" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-purple-500/40" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ═══ Command Center: Dashboard + Phone ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.5 }}
          className="relative mx-auto mt-20 max-w-4xl"
        >
          {/* Ambient glow */}
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/[0.05] blur-[140px]" />

          {/* ── Background Dashboard ── */}
          <div className="relative rounded-2xl border border-white/[0.06] bg-neutral-900/50 opacity-90 shadow-[0_20px_80px_rgba(0,0,0,0.4)] backdrop-blur-sm">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-white/[0.04] px-5 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/40" />
              </div>
              <div className="ml-3 flex-1 rounded-md bg-white/[0.03] px-3 py-1">
                <span className="text-[10px] text-slate-600">app.ai-conversion.de/dashboard</span>
              </div>
              {/* Live status — synced with chat */}
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                <span className={`text-[10px] font-medium ${sc.color} transition-colors duration-300`}>{sc.text}</span>
              </div>
            </div>

            {/* Dashboard content */}
            <div className="grid gap-4 p-5 lg:grid-cols-[1fr,1.2fr]">
              {/* Left: Stats cards */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Aktive Leads", value: "47", icon: Users, change: "+12%" },
                    { label: "Heute qualifiziert", value: "8", icon: CheckCircle, change: "+3" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between">
                        <s.icon className="h-3.5 w-3.5 text-purple-400/50" />
                        <span className="text-[9px] font-medium text-emerald-400/70">{s.change}</span>
                      </div>
                      <p className="mt-2 text-xl font-bold text-white">{s.value}</p>
                      <p className="text-[9px] text-slate-600">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Mini chart placeholder */}
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[9px] font-medium text-slate-500">Conversion-Rate</span>
                    <Activity className="h-3 w-3 text-purple-400/40" />
                  </div>
                  <div className="flex items-end gap-1">
                    {[35, 42, 38, 55, 48, 62, 58, 72, 67, 75, 70, 82].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-purple-500/20"
                        style={{ height: `${h * 0.4}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Lead pipeline */}
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">Lead Pipeline</span>
                  <span className="text-[9px] text-slate-600">Live</span>
                </div>
                <div className="space-y-2">
                  {pipelineLeads.map((lead, i) => (
                    <motion.div
                      key={lead.name}
                      initial={{ opacity: 0.4 }}
                      animate={{
                        opacity: i === 0 && (dashStatus === "analyzing" || dashStatus === "replying") ? 1 : 0.5,
                        scale: i === 0 && dashStatus === "replying" ? 1.02 : 1,
                      }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-2.5 rounded-lg border border-white/[0.02] bg-white/[0.015] px-3 py-2"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/10 text-[8px] font-bold text-purple-300">
                        {lead.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-medium text-slate-300">{lead.name}</p>
                        <p className="truncate text-[8px] text-slate-600">{lead.company}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold text-emerald-400">{lead.score}</p>
                        <p className={`text-[8px] ${
                          lead.status === "qualified" ? "text-emerald-400/70" :
                          lead.status === "booked" ? "text-purple-300/70" :
                          lead.status === "nurturing" ? "text-yellow-400/70" :
                          "text-slate-500"
                        }`}>
                          {lead.status === "qualified" ? "Qualifiziert" :
                           lead.status === "booked" ? "Termin" :
                           lead.status === "nurturing" ? "Nurturing" : "Neu"}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Foreground Phone — overlapping bottom-right ── */}
          <div className="absolute -bottom-12 right-4 z-10 lg:right-12">
            <div
              className="flex w-[220px] flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.1] bg-neutral-900/90 shadow-[0_30px_80px_rgba(0,0,0,0.7)] backdrop-blur-md lg:w-[260px]"
              style={{ aspectRatio: "9/19" }}
            >
              {/* Notch */}
              <div className="absolute left-1/2 top-0 z-20 h-4 w-16 -translate-x-1/2 rounded-b-xl bg-navy-950/80" />

              {/* Header */}
              <div className="relative z-10 flex items-center gap-2 border-b border-white/[0.04] bg-navy-800/60 px-3 pb-2.5 pt-7">
                <div className="relative">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[8px] font-bold text-emerald-400">
                    KI
                  </div>
                  <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-navy-800 bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-semibold text-white">KI-Bot</p>
                  <p className="text-[7px] text-emerald-400/70">Online</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-px text-[7px] font-bold text-emerald-400">
                  LIVE
                </span>
              </div>

              {/* Chat */}
              <div className="flex flex-1 flex-col px-2.5 py-3">
                <p className="mb-2 text-center text-[7px] text-slate-700">09:43</p>
                <div className="flex flex-1 flex-col gap-1.5">
                  <AnimatePresence>
                    {script
                      .filter((m) => visible.includes(m.id))
                      .map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={spring}
                          className={`flex ${msg.sender === "lead" ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[88%] rounded-xl px-2.5 py-1.5 text-[9px] leading-[1.5] lg:text-[10px] ${
                              msg.sender === "lead"
                                ? "rounded-bl-sm bg-white/[0.05] text-slate-300"
                                : "rounded-br-sm bg-emerald-500/85 text-white"
                            }`}
                          >
                            {msg.text}
                          </div>
                        </motion.div>
                      ))}
                  </AnimatePresence>

                  <AnimatePresence>
                    {typing && (
                      <motion.div
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -3 }}
                        transition={{ duration: 0.15 }}
                        className="flex justify-end"
                      >
                        <div className="flex items-center gap-0.5 rounded-xl rounded-br-sm bg-emerald-500/20 px-2.5 py-1.5">
                          {[0, 1, 2].map((i) => (
                            <span key={i} className="h-1 w-1 rounded-full bg-emerald-400/60" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Input */}
              <div className="border-t border-white/[0.04] bg-navy-800/60 px-2.5 py-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.03] bg-navy-950/40 px-2 py-1.5">
                  <span className="flex-1 text-[8px] text-slate-600">Nachricht...</span>
                  <MessageCircle className="h-2.5 w-2.5 text-emerald-400/50" />
                </div>
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <AnimatePresence>
            {badges
              .filter((b) => shownBadges.includes(b.id))
              .map((b) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, scale: 0.88, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={spring}
                  className={`absolute ${b.pos} z-20 rounded-xl border bg-navy-900/95 px-3.5 py-2.5 shadow-lg backdrop-blur-md ${
                    b.color === "green"
                      ? "border-emerald-500/15 shadow-emerald-500/[0.06]"
                      : "border-purple-500/15 shadow-purple-500/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${b.color === "green" ? "bg-emerald-500/10" : "bg-purple-500/10"}`}>
                      <b.icon className={`h-3.5 w-3.5 ${b.color === "green" ? "text-emerald-400" : "text-purple-400"}`} />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500">{b.label}</p>
                      <p className={`text-[12px] font-semibold ${b.color === "green" ? "text-emerald-400" : "text-purple-300"}`}>{b.value}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>

          {/* Bottom fade */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-navy-950 to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}
