"use client";

// ============================================================
// ChatClient (Phase 4c)
//
// Client Component mit allen interaktiven Zustaenden:
// - Consent-Modal mit Fade-in/Slide-up Animation
// - Rejected-Screen
// - Aktiver Chat: optimistic Send, Polling (2s), Typing-Indicator,
//   Offline-Banner bei >= 5 consecutive poll-fails, Fokus-Management
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
const MODAL_FADE_MS = 200;
const OFFLINE_THRESHOLD = 5;

// Widget laeuft in iframe auf Kunden-Domains — Consent-Modal-Links zur
// Datenschutzerklaerung und zum AVV muessen absolut sein, sonst wuerden
// sie gegen die Kunden-Domain aufgeloest. NEXT_PUBLIC_APP_URL ist an den
// Browser exponiert, Fallback auf die Produktiv-URL.
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://ai-conversion.ai";
const PRIVACY_URL = `${APP_URL}/datenschutz`;
const DPA_URL = `${APP_URL}/dpa.md`;

export function ChatClient({ config, publicKey }: ChatClientProps) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [showRejectedScreen, setShowRejectedScreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [consecutiveFailedPolls, setConsecutiveFailedPolls] = useState(0);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  const lastPolledTimestampRef = useRef<number>(0);

  // ----- Modal Fade-in beim ersten Render -----
  useEffect(() => {
    if (!showConsentModal) return;
    const timer = setTimeout(() => setModalVisible(true), 50);
    return () => clearTimeout(timer);
  }, [showConsentModal]);

  // ----- Initial-Fokus im Modal (Accept-Button) -----
  useEffect(() => {
    if (showConsentModal && modalVisible) {
      acceptButtonRef.current?.focus();
    }
  }, [showConsentModal, modalVisible]);

  // ----- Fokus ins Input-Feld nach Modal-Close -----
  useEffect(() => {
    if (!sessionToken || showConsentModal) return;
    // Auf Mobile keinen Auto-Fokus — die virtuelle Tastatur
    // wuerde sofort den halben Viewport verdecken und die
    // Welcome-Message aus dem sichtbaren Bereich draengen.
    // Desktop bleibt unveraendert (Keyboard ist physisch).
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) return;
    inputRef.current?.focus();
  }, [sessionToken, showConsentModal]);

  // ----- Auto-Scroll auf neue Messages -----
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    // Smart-Scroll: nur triggern wenn Container wirklich
    // scrollbar ist. Bei kurzen Message-Listen (z.B. nur
    // Welcome-Message) wuerde scrollTop=scrollHeight auf
    // Mobile die Message oberhalb des sichtbaren Bereichs
    // verschwinden lassen, besonders wenn die Tastatur den
    // Viewport schrumpft. Schwellwert: mindestens 100px
    // Differenz, sonst passt Content ohnehin in den Viewport.
    const overflow = el.scrollHeight - el.clientHeight;
    if (overflow <= 100) return;
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
        if (cancelled) return;

        if (!res.ok) {
          // HTTP-Fehler zaehlt auch als fehlgeschlagener Poll.
          setConsecutiveFailedPolls((n) => n + 1);
          return;
        }

        const data = (await res.json()) as {
          messages: Array<{
            id: string;
            role: MessageRole;
            content: string;
            timestamp: number;
          }>;
          conversationStatus: string;
        };

        if (cancelled) return;

        // Erfolgreicher Poll - Fail-Counter zuruecksetzen.
        setConsecutiveFailedPolls(0);

        if (data.messages.length === 0) return;

        setMessages((prev) => mergeMessages(prev, data.messages));

        const maxTs = data.messages.reduce(
          (m, x) => Math.max(m, x.timestamp),
          lastPolledTimestampRef.current,
        );
        lastPolledTimestampRef.current = maxTs;
      } catch {
        // Network-Error oder JSON-Parse-Fail zaehlt auch.
        if (!cancelled) {
          setConsecutiveFailedPolls((n) => n + 1);
        }
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

      // Fade-Out starten, dann erst den State-Change durchfuehren,
      // damit das Modal sauber ausfadet bevor der Chat erscheint.
      setModalVisible(false);
      const now = Date.now();
      setTimeout(() => {
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
      }, MODAL_FADE_MS);
    } catch {
      setSessionError(
        "Verbindung konnte nicht aufgebaut werden. Bitte erneut versuchen.",
      );
    } finally {
      setIsStartingSession(false);
    }
  }, [publicKey, isStartingSession]);

  const handleRejectConsent = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => {
      setShowConsentModal(false);
      setShowRejectedScreen(true);
    }, MODAL_FADE_MS);
  }, []);

  // ----- Fokus nach Bot-Antwort -----
  // Nach jedem neuen Message-Set pruefen ob die letzte Message eine Assistant-
  // Antwort ist und der aktuelle Fokus entweder auf Body oder auf der Textarea
  // liegt (User hat sich nicht aktiv woandershin geklickt).
  // Kein matchMedia-Check: Widget laeuft in iframe mit Handy-aehnlicher Breite
  // (380-420px), was (max-width: 767px) immer als true liefert — Desktop-User
  // wuerden dadurch nie refokussiert. requestAnimationFrame stellt sicher,
  // dass der focus()-Call NACH dem Re-Render passiert.
  const lastMessageForFocus = messages[messages.length - 1];
  useEffect(() => {
    if (!lastMessageForFocus || lastMessageForFocus.role !== "assistant") return;
    if (typeof window === "undefined") return;
    const active = document.activeElement;
    const onInputOrBody =
      !active || active === document.body || active === inputRef.current;
    if (!onInputOrBody) return;
    const raf = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [lastMessageForFocus]);

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

    // Fokus sofort wieder ins Input-Feld — User hat gerade getippt/gesendet,
    // das ist eine klare Interaktion. Via requestAnimationFrame, damit der
    // focus()-Call NACH dem Re-Render durch setIsSending/setMessages passiert.
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

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
  const showOfflineBanner = consecutiveFailedPolls >= OFFLINE_THRESHOLD;

  // ---------- Render: Consent-Modal ----------
  if (showConsentModal) {
    return (
      <ConsentModal
        config={config}
        visible={modalVisible}
        onAccept={handleAcceptConsent}
        onReject={handleRejectConsent}
        isLoading={isStartingSession}
        errorMessage={sessionError}
        acceptButtonRef={acceptButtonRef}
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

      {/* Messages — role="log" fuer chronologische Chat-Ausgabe,
          aria-live="polite" fuer Screen-Reader-Ankuendigung neuer Messages */}
      <main
        ref={messagesContainerRef}
        role="log"
        aria-live="polite"
        aria-label="Konversationsverlauf"
        className="flex-1 space-y-4 overflow-y-auto px-4 py-6"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} config={config} />
        ))}
        {showTypingIndicator && <TypingIndicator config={config} />}
      </main>

      {/* Offline-Banner (erscheint nach >= 5 fehlgeschlagenen Polls) */}
      {showOfflineBanner && (
        <div
          className="shrink-0 px-4 py-2 text-center text-xs transition-opacity duration-300"
          style={{
            backgroundColor: withAlpha(config.mutedTextColor, "33"),
            color: config.mutedTextColor,
            borderTop: `1px solid ${withAlpha(config.primaryColor, "33")}`,
          }}
          role="status"
          aria-live="polite"
        >
          Verbindung wird wiederhergestellt...
        </div>
      )}

      {/* Input */}
      <footer
        className="flex shrink-0 items-end gap-2 px-4 py-3"
        style={{ borderTop: `1px solid ${withAlpha(config.primaryColor, "33")}` }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Nachricht eingeben"
          placeholder="Nachricht schreiben..."
          className="flex-1 resize-none rounded-xl px-4 py-3 text-base leading-relaxed focus:outline-none"
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
          className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words transition-opacity duration-200"
          style={{
            backgroundColor: config.primaryColor,
            color: config.backgroundColor,
            opacity,
            boxShadow: `0 2px 8px ${withAlpha(config.primaryColor, "33")}`,
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
        className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
        style={{
          backgroundColor: withAlpha(config.primaryColor, "1A"),
          border: `1px solid ${withAlpha(config.primaryColor, "33")}`,
          color: config.textColor,
          boxShadow: `0 1px 3px ${withAlpha(config.primaryColor, "14")}, 0 1px 2px ${withAlpha("#000000", "1A")}`,
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
        aria-label="Bot antwortet"
        role="status"
        aria-live="polite"
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

// SendButton mit React-State-basiertem Hover/Press/Disabled.
// Begruendung: Tailwind 4 enabled:hover:* Variants haben sich in
// Phase 4c als nicht zuverlaessig erwiesen (zwei Korrektur-Versuche
// schlugen visuell fehl). Inline-styles via React-State sind hier
// 100% kontrolliert, garantiert funktional und nicht mehr Code als
// die fehlgeschlagene Tailwind-Variante. Siehe docs/tech-debt.md
// "Phase 4c - Tailwind 4 enabled: Variant".
function SendButton({
  config,
  disabled,
  onClick,
}: {
  config: ResolvedTenantConfig;
  disabled: boolean;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Skalierung berechnen - nur wenn nicht disabled
  let scale = 1;
  if (!disabled) {
    if (isPressed) scale = 0.95;
    else if (isHovered) scale = 1.1;
  }

  // Brightness nur bei Hover und nicht disabled
  const brightness = !disabled && isHovered ? 1.15 : 1;

  // Icon-Translation nur bei Hover und nicht disabled
  const iconTranslateX = !disabled && isHovered ? 2 : 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onBlur={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      aria-label="Nachricht senden"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed"
      style={{
        backgroundColor: config.primaryColor,
        color: config.backgroundColor,
        opacity: disabled ? 0.5 : 1,
        outlineColor: config.primaryColor,
        transform: `scale(${scale})`,
        filter: `brightness(${brightness})`,
        transition:
          "transform 200ms ease-out, filter 200ms ease-out, opacity 200ms ease-out",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{
          transform: `translateX(${iconTranslateX}px)`,
          transition: "transform 200ms ease-out",
        }}
      >
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    </button>
  );
}

function ConsentModal({
  config,
  visible,
  onAccept,
  onReject,
  isLoading,
  errorMessage,
  acceptButtonRef,
}: {
  config: ResolvedTenantConfig;
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  acceptButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const cardTransition = visible
    ? "opacity-100 translate-y-0 scale-100"
    : "opacity-0 translate-y-4 scale-95";
  const backdropTransition = visible ? "opacity-100" : "opacity-0";

  return (
    <div
      className="relative flex h-screen w-full items-center justify-center p-6"
      style={{ backgroundColor: config.backgroundColor }}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${backdropTransition}`}
        style={{ backgroundColor: withAlpha("#000000", "66"), backdropFilter: "blur(4px)" }}
        aria-hidden="true"
      />
      {/* Modal-Karte — max-h-[90vh] + overflow-y-auto damit auf kleinen
          Screens (<400px Breite, flache Tastatur) der erweiterte Consent-
          Text inkl. Provider-Liste scrollbar bleibt und Buttons sichtbar. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="widget-consent-title"
        className={`relative flex max-h-[90vh] w-full max-w-sm flex-col gap-5 overflow-y-auto rounded-2xl p-6 transition-all duration-300 ease-out ${cardTransition}`}
        style={{
          backgroundColor: withAlpha(config.textColor, "14"),
          border: `1px solid ${withAlpha(config.primaryColor, "4D")}`,
          boxShadow: `0 20px 40px ${withAlpha("#000000", "66")}`,
        }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: withAlpha(config.primaryColor, "1A") }}
          aria-hidden="true"
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
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h2
            id="widget-consent-title"
            className="text-lg font-semibold"
            style={{ color: config.textColor }}
          >
            Datenschutzhinweis
          </h2>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: config.mutedTextColor }}
          >
            Ihre Chat-Nachrichten werden zur Lead-Qualifizierung
            verarbeitet. Wir nutzen externe KI-Anbieter und speichern
            Konversationen 90 Tage.
          </p>
          <p
            className="mt-3 text-sm leading-relaxed"
            style={{ color: config.mutedTextColor }}
          >
            Details:{" "}
            <a
              href={PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:brightness-125"
              style={{ color: config.primaryColor }}
            >
              Datenschutzerkl&auml;rung
            </a>
            {" · "}
            <a
              href={DPA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:brightness-125"
              style={{ color: config.primaryColor }}
            >
              AVV
            </a>
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
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 hover:brightness-110 active:scale-95 focus:outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "transparent",
              border: `1px solid ${withAlpha(config.primaryColor, "33")}`,
              color: config.textColor,
              outlineColor: config.primaryColor,
            }}
          >
            Ablehnen
          </button>
          <button
            ref={acceptButtonRef}
            type="button"
            onClick={onAccept}
            disabled={isLoading}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 hover:brightness-110 active:scale-95 focus:outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed"
            style={{
              backgroundColor: config.primaryColor,
              color: config.backgroundColor,
              opacity: isLoading ? 0.7 : 1,
              outlineColor: config.primaryColor,
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
  const headlineRef = useRef<HTMLHeadingElement>(null);

  // Beim Mount Fokus auf die Headline legen, damit Screenreader
  // den Kontext nicht verlieren (sie wuerden sonst auf body landen).
  useEffect(() => {
    headlineRef.current?.focus();
  }, []);

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
            ref={headlineRef}
            tabIndex={-1}
            className="text-lg font-semibold focus:outline-none"
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
