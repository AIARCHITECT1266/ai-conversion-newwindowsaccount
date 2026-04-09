"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function BotTestPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/dashboard/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.plan) setPlan(data.plan);
        else setPlan("Starter");
      })
      .catch(() => setPlan("Starter"));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/bot-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error ?? "Fehler bei der Antwort" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Verbindungsfehler – bitte erneut versuchen" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07070d] text-[#ede8df]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Zurueck-Link */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        {/* Ueberschrift + Plan-Badge */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold">Bot Simulator – Teste dein Verkaufsgespräch</h1>
          {plan && (
            <span className="mt-1.5 inline-block rounded-full bg-[#c9a84c]/10 px-2 py-0.5 text-[10px] text-[#c9a84c]">
              {plan}
            </span>
          )}
        </div>

        {/* Hinweis-Banner */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3">
          <Bot className="h-5 w-5 shrink-0 text-purple-400" />
          <p className="text-sm text-purple-200/80">
            <span className="font-semibold text-purple-300">Test-Modus</span> – simuliert den WhatsApp Sales Bot.
            Kein DB-Zugriff, kein WhatsApp-Versand.
          </p>
        </div>

        {/* Chat-Container */}
        <div
          className="flex flex-col rounded-2xl border border-white/[0.06]"
          style={{ background: "rgba(14,14,26,0.95)", height: "calc(100vh - 320px)", minHeight: "400px" }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-5 py-3.5"
            style={{ borderBottom: "1px solid rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.04)" }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c9a84c]/10">
              <Bot className="h-4 w-4 text-[#c9a84c]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Sales Bot Preview</p>
              <p className="text-[10px] text-slate-500">Claude Sonnet · Plan-Prompt</p>
            </div>
          </div>

          {/* Nachrichten */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-slate-600">Schreibe eine Nachricht um den Bot zu testen…</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-2xl rounded-br-sm bg-[#c9a84c]/10 text-[#ede8df]"
                      : "rounded-2xl rounded-bl-sm border border-white/[0.06] bg-[#0e0e1a] text-slate-300"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-white/[0.06] bg-[#0e0e1a] px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-[#c9a84c]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Eingabe */}
          <div className="border-t border-white/[0.06] p-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 transition-colors focus-within:border-[#c9a84c]/30">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Nachricht eingeben…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[#c9a84c] to-[#d4b85c] text-black transition-opacity disabled:opacity-30"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-600">
              Powered by AI Conversion · Claude AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
