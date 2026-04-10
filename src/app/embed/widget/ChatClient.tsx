"use client";

// ============================================================
// ChatClient (Phase 4b)
//
// Client Component mit allen interaktiven Zustaenden:
// - Consent-Modal -> Session-Start mit consentGiven=true
// - Rejected-Screen
// - Aktiver Chat: optimistic Send, Polling (2s), Typing-Indicator
//
// Regel: Null hardcoded Farben. Alle visuellen Werte kommen aus
// der uebergebenen Tenant-Config oder werden per withAlpha davon
// abgeleitet.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import type { ResolvedTenantConfig } from "@/lib/widget/publicKey";
import { withAlpha } from "@/lib/widget/colors";
import { Avatar } from "./Avatar";

type MessageRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  optimistic?: boolean;
  failed?: boolean;
}

interface ChatClientProps {
  config: ResolvedTenantConfig;
  publicKey: string;
}

const POLL_INTERVAL_MS = 2000;

export function ChatClient({ config, publicKey }: ChatClientProps) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(true);
  const [showRejectedScreen, setShowRejectedScreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastPolledTimestampRef = useRef<number>(0);

  // ----- Auto-Scroll auf neue Messages -----
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ----- Polling-Loop -----
  useEffect(() => {
    if (!sessionToken) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const since = lastPolledTimestampRef.current;
        const url =
          `/api/widget/poll?token=${encodeURIComponent(sessionToken)}` +
          (since > 0 ? `&since=${since}` : "");

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || cancelled) return;

        const data = (await res.json()) as {
          messages: Array<{
            id: string;
            role: MessageRole;
            content: string;
            timestamp: number;
          }>;
          conversationStatus: string;
        };

        if (cancelled || data.messages.length === 0) return;

        setMessages((prev) => mergeMessages(prev, data.messages));

        const maxTs = data.messages.reduce(
          (m, x) => Math.max(m, x.timestamp),
          lastPolledTimestampRef.current,
        );
        lastPolledTimestampRef.current = maxTs;
      } catch {
        // Einzelne Poll-Fehler ignorieren; naechste Iteration versucht es erneut.
      }
    };

    // Sofortiger erster Poll, dann Intervall.
    void poll();
    const intervalId = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [sessionToken]);

  // ----- Handlers -----
  const handleAcceptConsent = useCallback(async () => {
    if (isStartingSession) return;
    setIsStartingSession(true);
    setSessionError(null);

    try {
      const res = await fetch("/api/widget/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey, consentGiven: true }),
      });

      if (!res.ok) {
        throw new Error(`Session start failed: HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        sessionToken: string;
        conversationId: string;
        welcomeMessage: string;
      };

      // welcomeMessage kommt aus der Tenant-Config, nicht aus der DB -
      // sie wird also client-seitig als erste Pseudo-Bot-Message eingefuegt.
      const now = Date.now();
      setMessages([
        {
          id: `welcome-${now}`,
          role: "assistant",
          content: data.welcomeMessage,
          timestamp: now,
        },
      ]);
      setSessionToken(data.sessionToken);
      setShowConsentModal(false);
    } catch {
      setSessionError(
        "Verbindung konnte nicht aufgebaut werden. Bitte erneut versuchen.",
      );
    } finally {
      setIsStartingSession(false);
    }
  }, [publicKey, isStartingSession]);

  const handleRejectConsent = useCallback(() => {
    setShowConsentModal(false);
    setShowRejectedScreen(true);
  }, []);

  const handleSendMessage = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending || !sessionToken) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
      optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      const res = await fetch("/api/widget/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, message: trimmed }),
      });

      if (res.status !== 202) {
        throw new Error(`Message send failed: HTTP ${res.status}`);
      }

      // Optimistic-Flag entfernen, die Message existiert jetzt in der DB.
      // Beim naechsten Poll wird sie durch die echte DB-Version ersetzt.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId ? { ...m, optimistic: false } : m,
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? { ...m, failed: true, optimistic: false }
            : m,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending, sessionToken]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  // Typing-Indicator: sichtbar wenn die letzte Message eine User-Message ist
  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = lastMessage?.role === "user" && !lastMessage.failed;
  const sendDisabled = !inputValue.trim() || isSending;

  // ---------- Render: Consent-Modal ----------
  if (showConsentModal) {
    return (
      <ConsentModal
        config={config}
        onAccept={handleAcceptConsent}
        onReject={handleRejectConsent}
        isLoading={isStartingSession}
        errorMessage={sessionError}
      />
    );
  }

  // ---------- Render: Rejected-Screen ----------
  if (showRejectedScreen) {
    return <RejectedScreen config={config} />;
  }

  // ---------- Render: Aktiver Chat ----------
  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden"
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
      }}
    >
      {/* Header */}
      <header
        className="flex shrink-0 items-center gap-3 px-4 py-3"
        style={{
          borderBottom: `1px solid ${withAlpha(config.primaryColor, "33")}`,
        }}
      >
        <Avatar size={40} config={config} />
        <div className="flex min-w-0 flex-col leading-tight">
          <span
            className="truncate text-base font-semibold"
            style={{ color: config.textColor }}
          >
            {config.botName}
          </span>
          {config.botSubtitle.length > 0 && (
            <span
              className="truncate text-xs"
              style={{ color: config.mutedTextColor }}
            >
              {config.botSubtitle}
            </span>
          )}
        </div>
      </header>

      {/* Messages */}
      <main
        ref={messagesContainerRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-6"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} config={config} />
        ))}
        {showTypingIndicator && <TypingIndicator config={config} />}
      </main>

      {/* Input */}
      <footer
        className="flex shrink-0 items-end gap-2 px-4 py-3"
        style={{ borderTop: `1px solid ${withAlpha(config.primaryColor, "33")}` }}
      >
        <textarea
          rows={1}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          aria-label="Nachricht schreiben"
          placeholder="Nachricht schreiben..."
          className="flex-1 resize-none rounded-xl px-4 py-3 text-sm leading-relaxed focus:outline-none"
          style={{
            backgroundColor: withAlpha(config.textColor, "14"),
            border: `1px solid ${withAlpha(config.primaryColor, "4D")}`,
            color: config.textColor,
            minHeight: "44px",
            maxHeight: "120px",
          }}
        />
        <SendButton
          config={config}
          disabled={sendDisabled}
          onClick={handleSendMessage}
        />
      </footer>
    </div>
  );
}

// ============================================================
// Merge-Logik: Pollt eingehende Messages in den lokalen State
// und dedupliziert gegen Optimistic-Messages.
// ============================================================
function mergeMessages(
  current: ChatMessage[],
  incoming: Array<{
    id: string;
    role: MessageRole;
    content: string;
    timestamp: number;
  }>,
): ChatMessage[] {
  const result = [...current];

  for (const msg of incoming) {
    // 1) Schon vorhanden (gleiche DB-ID)?
    if (result.some((m) => m.id === msg.id)) continue;

    // 2) Matcht auf eine optimistische User-Message?
    const optimisticIdx = result.findIndex(
      (m) =>
        m.optimistic &&
        m.role === msg.role &&
        m.content.trim() === msg.content.trim(),
    );
    if (optimisticIdx !== -1) {
      result[optimisticIdx] = {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      };
      continue;
    }

    // 3) Neue Message anhaengen
    result.push({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
    });
  }

  // Timestamp-Order enforcen (Welcome-Message und optimistic haben
  // clientseitige Timestamps, Server-Messages haben DB-Timestamps)
  result.sort((a, b) => a.timestamp - b.timestamp);
  return result;
}

// ============================================================
// Sub-Komponenten
// ============================================================

function MessageBubble({
  message,
  config,
}: {
  message: ChatMessage;
  config: ResolvedTenantConfig;
}) {
  if (message.role === "user") {
    const opacity = message.failed ? 0.5 : message.optimistic ? 0.7 : 1;
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            backgroundColor: config.primaryColor,
            color: config.backgroundColor,
            opacity,
          }}
        >
          {message.content}
          {message.failed && (
            <span className="ml-2 text-xs" aria-label="Fehler beim Senden">
              ✗
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <Avatar size={32} config={config} />
      <div
        className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
        style={{
          backgroundColor: withAlpha(config.primaryColor, "1A"),
          border: `1px solid ${withAlpha(config.primaryColor, "33")}`,
          color: config.textColor,
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator({ config }: { config: ResolvedTenantConfig }) {
  return (
    <div className="flex items-end gap-2">
      <Avatar size={32} config={config} />
      <div
        className="flex items-center gap-1 rounded-2xl rounded-bl-sm px-4 py-3.5"
        style={{
          backgroundColor: withAlpha(config.primaryColor, "1A"),
          border: `1px solid ${withAlpha(config.primaryColor, "33")}`,
        }}
        aria-label="Bot tippt"
        role="status"
      >
        {[0, 200, 400].map((delay) => (
          <span
            key={delay}
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
            style={{
              backgroundColor: config.primaryColor,
              animationDelay: `${delay}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SendButton({
  config,
  disabled,
  onClick,
}: {
  config: ResolvedTenantConfig;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label="Senden"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition hover:brightness-110 disabled:cursor-not-allowed"
      style={{
        backgroundColor: config.primaryColor,
        color: config.backgroundColor,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    </button>
  );
}

function ConsentModal({
  config,
  onAccept,
  onReject,
  isLoading,
  errorMessage,
}: {
  config: ResolvedTenantConfig;
  onAccept: () => void;
  onReject: () => void;
  isLoading: boolean;
  errorMessage: string | null;
}) {
  return (
    <div
      className="flex h-screen w-full items-center justify-center p-6"
      style={{ backgroundColor: config.backgroundColor }}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl p-6"
        style={{
          backgroundColor: withAlpha(config.textColor, "14"),
          border: `1px solid ${withAlpha(config.primaryColor, "4D")}`,
        }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: withAlpha(config.primaryColor, "1A") }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={config.primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: config.textColor }}
          >
            Datenschutzhinweis
          </h2>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: config.mutedTextColor }}
          >
            Mit Klick auf Akzeptieren stimmen Sie zu, dass Ihre Nachrichten
            verarbeitet werden, um Ihnen zu antworten. Es werden keine
            personenbezogenen Daten an Dritte weitergegeben.
          </p>
        </div>
        {errorMessage && (
          <p
            className="text-xs"
            style={{ color: config.primaryColor }}
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onReject}
            disabled={isLoading}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition hover:brightness-110 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "transparent",
              border: `1px solid ${withAlpha(config.primaryColor, "33")}`,
              color: config.textColor,
            }}
          >
            Ablehnen
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={isLoading}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:brightness-110 disabled:cursor-not-allowed"
            style={{
              backgroundColor: config.primaryColor,
              color: config.backgroundColor,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? "…" : "Akzeptieren"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectedScreen({ config }: { config: ResolvedTenantConfig }) {
  return (
    <div
      className="flex h-screen w-full items-center justify-center p-6"
      style={{ backgroundColor: config.backgroundColor }}
    >
      <div
        className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl p-6 text-center"
        style={{
          backgroundColor: withAlpha(config.textColor, "14"),
          border: `1px solid ${withAlpha(config.primaryColor, "33")}`,
        }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: withAlpha(config.primaryColor, "1A") }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={config.primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
            <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
        </div>
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: config.textColor }}
          >
            Schade!
          </h2>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: config.mutedTextColor }}
          >
            Ohne Ihre Zustimmung koennen wir leider nicht starten. Schliessen
            Sie dieses Fenster und oeffnen Sie das Widget jederzeit erneut.
          </p>
        </div>
      </div>
    </div>
  );
}
