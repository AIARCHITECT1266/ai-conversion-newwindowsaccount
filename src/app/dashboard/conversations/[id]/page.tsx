"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  User,
  Bot,
  Shield,
  Calendar,
  TrendingUp,
  Euro,
  Clock,
  Tag,
} from "lucide-react";
import { ChannelBadge } from "../ChannelBadge";

/* ───────────────────────────── Typen ───────────────────────────── */

interface Message {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  messageType: string;
  timestamp: string;
}

interface Lead {
  id: string;
  score: number;
  qualification: string;
  status: string;
  pipelineStatus: string;
  dealValue: number | null;
  source: string | null;
  appointmentAt: string | null;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  externalId: string | null;
  // Phase 6.3: Channel-Herkunft (WHATSAPP oder WEB). optional im
  // Interface weil alte API-Versionen das Feld moeglicherweise
  // nicht zurueckgeben — defensive Rueckfall-Sicherheit.
  channel?: "WHATSAPP" | "WEB";
  status: string;
  language: string;
  consentGiven: boolean;
  consentAt: string | null;
  campaignSlug: string | null;
  leadSource: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  lead: Lead | null;
}

/* ───────────────────────────── Hilfs-Funktionen ────────────────── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days > 1 ? "en" : ""}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Externe ID maskieren (DSGVO). Fuer WEB-Channel-Conversations ist
// externalId seit Phase 3a.5 nullable - wir zeigen dann den generischen
// Masken-Platzhalter.
function maskId(externalId: string | null): string {
  if (!externalId || externalId.length <= 6) return "•••••";
  return externalId.slice(0, 4) + "••••" + externalId.slice(-3);
}

const QUALIFICATION_LABELS: Record<string, { label: string; color: string }> = {
  UNQUALIFIED: { label: "Neu", color: "bg-gray-500" },
  MARKETING_QUALIFIED: { label: "MQL", color: "bg-blue-500" },
  SALES_QUALIFIED: { label: "SQL", color: "bg-purple-500" },
  OPPORTUNITY: { label: "Opportunity", color: "bg-amber-500" },
  CUSTOMER: { label: "Customer", color: "bg-emerald-500" },
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "text-emerald-400",
  PAUSED: "text-amber-400",
  CLOSED: "text-gray-400",
  ARCHIVED: "text-red-400",
};

/* ───────────────────────────── Hauptkomponente ─────────────────── */

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/dashboard/conversations/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Konversation nicht gefunden");
        return r.json();
      })
      .then((data) => setConversation(data.conversation))
      .catch((err) => setError(err instanceof Error ? err.message : "Fehler"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (conversation) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  return (
    <div
      className="min-h-screen p-6 md:p-10"
      style={{ background: "var(--bg)", fontFamily: "var(--sans)" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700;900&family=Geist:wght@400;500;600&display=swap');
        :root {
          --bg: #07070d;
          --surface: #0e0e1a;
          --gold: #c9a84c;
          --gold-subtle: rgba(201,168,76,0.08);
          --gold-border: rgba(201,168,76,0.1);
          --gold-border-hover: rgba(201,168,76,0.35);
          --text: #ede8df;
          --text-muted: rgba(237,232,223,0.45);
          --serif: 'Cormorant Garamond', Georgia, serif;
          --sans: 'Geist', system-ui, sans-serif;
        }
      `}</style>

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-[rgba(201,168,76,0.08)]"
          style={{ border: "1px solid var(--gold-border)", color: "var(--gold)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Konversation
          </h1>
          {conversation && (
            <div className="mt-0.5 flex items-center gap-2">
              <p className="font-mono text-xs text-gray-500">
                {maskId(conversation.externalId)}
              </p>
              {conversation.channel && (
                <ChannelBadge channel={conversation.channel} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ladezustand */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--gold)" }} />
        </div>
      )}

      {/* Fehler */}
      {error && (
        <div
          className="rounded-lg p-4"
          style={{
            border: "1px solid rgba(201,168,76,0.3)",
            background: "rgba(201,168,76,0.06)",
            color: "var(--gold)",
          }}
        >
          {error}
        </div>
      )}

      {conversation && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Chat-Verlauf */}
          <div
            className="rounded-xl"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--gold-border)",
            }}
          >
            {/* Chat-Header */}
            <div
              className="flex items-center justify-between border-b px-6 py-4"
              style={{ borderColor: "var(--gold-border)" }}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5" style={{ color: "var(--gold)" }} />
                <span className="text-sm font-medium text-white">
                  Chat-Verlauf
                </span>
                <span className="text-xs text-gray-500">
                  {conversation.messages.length} Nachrichten
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${STATUS_COLORS[conversation.status] ?? "text-gray-400"}`}>
                  {conversation.status}
                </span>
                {conversation.consentGiven && (
                  <span title="DSGVO-Consent erteilt"><Shield className="h-4 w-4 text-emerald-400" /></span>
                )}
              </div>
            </div>

            {/* Nachrichten */}
            <div className="max-h-[600px] overflow-y-auto p-6">
              {conversation.messages.length === 0 ? (
                <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  Keine Nachrichten vorhanden
                </p>
              ) : (
                <div className="space-y-4">
                  {conversation.messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg} />
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Seitenleiste: Lead-Info */}
          <div className="space-y-4">
            {/* Konversations-Info */}
            <InfoCard title="Konversation">
              <InfoRow icon={Clock} label="Erstellt" value={formatDate(conversation.createdAt)} />
              <InfoRow icon={Clock} label="Aktualisiert" value={timeAgo(conversation.updatedAt)} />
              <InfoRow icon={Tag} label="Sprache" value={conversation.language.toUpperCase()} />
              {conversation.campaignSlug && (
                <InfoRow icon={Tag} label="Kampagne" value={conversation.campaignSlug} />
              )}
              {conversation.leadSource && (
                <InfoRow icon={Tag} label="Quelle" value={conversation.leadSource} />
              )}
            </InfoCard>

            {/* Lead-Daten */}
            {conversation.lead ? (
              <InfoCard title="Lead">
                <InfoRow
                  icon={TrendingUp}
                  label="Score"
                  value={
                    <span className="font-semibold" style={{ color: "var(--gold)" }}>
                      {conversation.lead.score}/100
                    </span>
                  }
                />
                <InfoRow
                  icon={Tag}
                  label="Stage"
                  value={
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          QUALIFICATION_LABELS[conversation.lead.qualification]?.color ?? "bg-gray-500"
                        }`}
                      />
                      {QUALIFICATION_LABELS[conversation.lead.qualification]?.label ?? conversation.lead.qualification}
                    </span>
                  }
                />
                <InfoRow icon={Tag} label="Pipeline" value={conversation.lead.pipelineStatus} />
                <InfoRow
                  icon={Euro}
                  label="Deal-Wert"
                  value={
                    conversation.lead.dealValue != null
                      ? `${conversation.lead.dealValue.toLocaleString("de-DE")} €`
                      : "–"
                  }
                />
                {conversation.lead.source && (
                  <InfoRow icon={Tag} label="Quelle" value={conversation.lead.source} />
                )}
                {conversation.lead.appointmentAt && (
                  <InfoRow icon={Calendar} label="Termin" value={formatDate(conversation.lead.appointmentAt)} />
                )}
                <InfoRow icon={Clock} label="Erstellt" value={formatDate(conversation.lead.createdAt)} />
              </InfoCard>
            ) : (
              <InfoCard title="Lead">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Kein Lead zugeordnet
                </p>
              </InfoCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Chat-Blase ──────────────────────── */

function ChatBubble({ message }: { message: Message }) {
  const time = new Date(message.timestamp).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // SYSTEM: zentriert, klein
  if (message.role === "SYSTEM") {
    return (
      <div className="flex justify-center">
        <div
          className="max-w-md rounded-lg px-4 py-2 text-center text-xs"
          style={{
            background: "rgba(201,168,76,0.06)",
            border: "1px solid var(--gold-border)",
            color: "var(--text-muted)",
          }}
        >
          <p>{message.content}</p>
          <p className="mt-1 text-[10px] opacity-60">{time}</p>
        </div>
      </div>
    );
  }

  const isUser = message.role === "USER";

  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
      <div className={`flex max-w-[75%] gap-2 ${isUser ? "flex-row" : "flex-row-reverse"}`}>
        {/* Avatar */}
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            isUser ? "bg-gray-700" : "bg-purple-500/20"
          }`}
        >
          {isUser ? (
            <User className="h-3.5 w-3.5 text-gray-300" />
          ) : (
            <Bot className="h-3.5 w-3.5 text-purple-400" />
          )}
        </div>

        {/* Blase */}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-tl-sm bg-gray-800 text-gray-200"
              : "rounded-tr-sm bg-purple-600/20 text-gray-200"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          <p
            className={`mt-1 text-[10px] ${
              isUser ? "text-gray-500" : "text-purple-400/50"
            }`}
          >
            {time}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Info-Karte ──────────────────────── */

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--gold-border)",
      }}
    >
      <h3
        className="mb-4 text-xs uppercase tracking-wider"
        style={{ color: "var(--gold)", opacity: 0.6 }}
      >
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/* ───────────────────────────── Info-Zeile ──────────────────────── */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-gray-500" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <span className="text-right text-sm text-white">{value}</span>
    </div>
  );
}
