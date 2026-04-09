"use client";

// ============================================================
// Web-Test Chat-UI – Client-Component
// Minimalistisch, mobile-first, kein WhatsApp noetig
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface WebTestClientProps {
  tenantId: string;
  tenantName: string;
}

export default function WebTestClient({ tenantId, tenantName }: WebTestClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll bei neuen Nachrichten
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Erstnachricht beim Laden
  useEffect(() => {
    async function loadGreeting() {
      try {
        const res = await fetch("/api/bot-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId, message: "Hallo" }),
        });
        const data: { reply?: string; error?: string } = await res.json();
        if (data.reply) {
          setMessages([{ role: "assistant", content: data.reply }]);
        } else {
          setMessages([{
            role: "assistant",
            content: `Willkommen bei ${tenantName}! Wie kann ich Ihnen helfen?`,
          }]);
        }
      } catch {
        setMessages([{
          role: "assistant",
          content: `Willkommen bei ${tenantName}! Wie kann ich Ihnen helfen?`,
        }]);
      } finally {
        setInitialLoading(false);
      }
    }
    loadGreeting();
  }, [tenantId, tenantName]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);

    try {
      const res = await fetch("/api/bot-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, message: trimmed }),
      });

      const data: { reply?: string; error?: string } = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Verbindungsfehler. Bitte erneut versuchen.");
        return;
      }

      if (data.reply) {
        const reply = data.reply;
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      }
    } catch {
      setError("Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, tenantId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{tenantName}</h1>
            <p className="text-xs text-emerald-600 font-medium">LIVE DEMO &bull; ohne WhatsApp</p>
          </div>
        </div>
      </header>

      {/* Disclaimer */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
        <p className="mx-auto max-w-2xl text-center text-xs text-amber-700">
          Dies ist eine Demo. Keine echten Daten werden gespeichert.
        </p>
      </div>

      {/* Chat-Bereich */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {initialLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-gray-400 shadow-sm">
                Wird geladen...
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "rounded-tr-sm bg-gray-900 text-white"
                    : "rounded-tl-sm bg-white text-gray-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fehler-Anzeige */}
      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2">
          <p className="mx-auto max-w-2xl text-center text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nachricht eingeben..."
            disabled={loading || initialLoading}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || initialLoading || !input.trim()}
            className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-40"
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  );
}
