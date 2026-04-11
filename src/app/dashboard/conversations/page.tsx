// ============================================================
// Conversations-List-View (Server Component, Phase 6.3 / Ansatz Y)
//
// Neue dedizierte Listen-Seite mit Channel-Filter, deeplink-
// faehigen URL-Query-Parametern und Paginierung. Ersetzt NICHT
// die bestehende Detail-View unter /dashboard/conversations/[id],
// sondern ergaenzt sie um einen expliziten Einstiegspunkt statt
// des "Top-5"-Blocks auf dem Haupt-Dashboard.
//
// Architektur-Entscheidung:
// - Server Component mit direktem Prisma-Load, analog zu
//   dashboard/page.tsx und crm/page.tsx (die beide ebenfalls ueber
//   eigene Pipelines laden). Die parallele API-Route
//   /api/dashboard/conversations existiert weiter fuer kuenftige
//   SPA-/External-Konsumenten (z.B. eine Mobile-App).
// - Filter via URL-Query-Parameter (?channel=WHATSAPP|WEB, ?page=N),
//   weil jede Filter-Kombination als Link teilbar und per
//   Browser-Back natuerlich navigierbar sein muss.
// - Keine auditLog-Aufrufe: Read-only-Listen-Abfrage ist analog
//   zur Poll-Endpoint-Ausnahme aus
//   docs/decisions/phase-3b-spec-reconciliation.md semantisch
//   keine "Aktion" im Audit-Sinn.
//
// Pattern-Referenz fuer Layout/Styling:
// src/app/dashboard/settings/widget/page.tsx (Phase 6.2) —
// identische Color-Palette, Icon-Stil, Back-Link-Muster.
// ============================================================

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";
import { decryptText } from "@/modules/encryption/aes";
import ConversationsFilter from "./ConversationsFilter";
import { ChannelBadge } from "./ChannelBadge";

// 20 Eintraege pro Seite — bewusst klein fuer schnelle
// DB-Queries und einfache Scroll-Orientierung.
const PAGE_SIZE = 20;

type ChannelFilter = "WHATSAPP" | "WEB" | undefined;

// ---------- Hilfsfunktionen ----------

function parseChannel(raw: string | string[] | undefined): ChannelFilter {
  if (raw === "WHATSAPP" || raw === "WEB") return raw;
  return undefined;
}

function parsePage(raw: string | string[] | undefined): number {
  if (typeof raw !== "string") return 1;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

// Externe ID maskieren (DSGVO). WEB-Channel hat seit Phase 3a.5
// externalId=null — wir zeigen dann einen generischen Session-
// Platzhalter statt "•••••", damit der User auf einen Blick sieht,
// dass es kein WhatsApp-Kontakt ist.
function maskExternalId(
  externalId: string | null,
  channel: "WHATSAPP" | "WEB",
): string {
  if (channel === "WEB") return "Web-Session";
  if (!externalId || externalId.length <= 6) return "•••••";
  return externalId.slice(0, 4) + " •••• " + externalId.slice(-3);
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days > 1 ? "en" : ""}`;
}

// Lokale URL-Query-Builder-Variable bewusst "qp" statt "params"
// genannt, um Verwechslung mit dem async Next.js-Route-Prop
// "params" / "searchParams" zu vermeiden. Der Component-Prop
// ist oben in ConversationsListPage.
function buildPageUrl(channel: ChannelFilter, page: number): string {
  const qp = new URLSearchParams();
  if (channel) qp.set("channel", channel);
  if (page > 1) qp.set("page", String(page));
  const query = qp.toString();
  return query
    ? `/dashboard/conversations?${query}`
    : "/dashboard/conversations";
}

// ---------- Status-Styles ----------

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-purple-500/15 text-purple-400",
  PAUSED: "bg-[#c9a84c]/15 text-[#c9a84c]",
  CLOSED: "bg-slate-500/15 text-slate-400",
  ARCHIVED: "bg-slate-500/15 text-slate-500",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  CLOSED: "Beendet",
  ARCHIVED: "Archiviert",
};

// ---------- Lead-Score-Pill ----------

function LeadScore({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 80
      ? "text-emerald-400 bg-emerald-500/10"
      : score >= 50
        ? "text-[#c9a84c] bg-[#c9a84c]/10"
        : "text-slate-400 bg-slate-500/10";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}
    >
      Score {score}
    </span>
  );
}

// ---------- Page ----------

export default async function ConversationsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    redirect("/dashboard/login");
  }

  const params = await searchParams;
  const channel = parseChannel(params.channel);
  const page = parsePage(params.page);

  // WHERE-Clause mit Tenant-Isolation (Pflicht aus CLAUDE.md:
  // niemals ID-only, immer tenantId mit dranhaengen) plus
  // optionalem Channel-Filter.
  const where = {
    tenantId: tenant.id,
    ...(channel ? { channel } : {}),
  };

  // Parallele DB-Queries: Count fuer Paginierung und die
  // Seiten-Liste selbst. Promise.all spart eine Round-Trip-Zeit.
  const [total, conversations] = await Promise.all([
    db.conversation.count({ where }),
    db.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
          select: { contentEncrypted: true, timestamp: true },
        },
        lead: {
          select: { score: true },
        },
      },
    }),
  ]);

  // Letzte Nachrichten serverseitig entschluesseln. decryptText()
  // ist synchron, wirft bei korrupten Inhalten — wir faengen das
  // per try/catch ab und zeigen einen Platzhalter.
  const items = conversations.map((c) => {
    let lastMessage: string | null = null;
    if (c.messages[0]) {
      try {
        lastMessage = decryptText(c.messages[0].contentEncrypted);
      } catch {
        lastMessage = "[Nachricht nicht lesbar]";
      }
    }
    return {
      id: c.id,
      externalId: c.externalId,
      channel: c.channel,
      status: c.status,
      updatedAt: c.updatedAt,
      lastMessage,
      lastMessageAt: c.messages[0]?.timestamp ?? null,
      leadScore: c.lead?.score ?? null,
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="min-h-screen bg-[#07070d] text-[#ede8df]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Zurueck-Link */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        {/* Ueberschrift */}
        <div className="mb-6">
          <h1 className="text-lg font-semibold">Konversationen</h1>
          <p className="mt-1 text-xs text-[#ede8df]/50">
            Alle Gespraeche deines Tenants ueber alle Kanaele. Klicke
            auf einen Eintrag fuer Details und Transkript.
          </p>
        </div>

        {/* Channel-Filter-Tabs */}
        <ConversationsFilter currentChannel={channel} />

        {/* Liste oder Empty-State */}
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-10 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-600" />
            <p className="text-sm text-[#ede8df]/60">
              {channel
                ? `Keine ${channel === "WHATSAPP" ? "WhatsApp" : "Web"}-Gespraeche gefunden.`
                : "Noch keine Gespraeche vorhanden."}
            </p>
            {channel && (
              <Link
                href="/dashboard/conversations"
                className="mt-3 inline-block text-xs text-[#c9a84c] underline underline-offset-4 hover:text-[#d4b85c]"
              >
                Filter zuruecksetzen
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/conversations/${item.id}`}
                className="block rounded-xl border border-white/[0.06] bg-[#0e0e1a] px-4 py-3 transition-colors hover:border-[#c9a84c]/25 hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {maskExternalId(item.externalId, item.channel)}
                      </span>
                      <ChannelBadge channel={item.channel} />
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[item.status] ?? "bg-slate-500/15 text-slate-400"}`}
                      >
                        {statusLabels[item.status] ?? item.status}
                      </span>
                      <LeadScore score={item.leadScore} />
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {item.lastMessage ?? "Keine Nachricht"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-600">
                    {item.lastMessageAt
                      ? timeAgo(item.lastMessageAt)
                      : timeAgo(item.updatedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Paginierung (nur sichtbar wenn Daten da sind) */}
        {total > 0 && (
          <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-slate-500">
            <span>
              {from}–{to} von {total}
            </span>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={buildPageUrl(channel, page - 1)}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Zurueck
                </Link>
              ) : (
                <span className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-slate-700">
                  <ChevronLeft className="h-3 w-3" />
                  Zurueck
                </span>
              )}
              <span className="tabular-nums">
                Seite {page} / {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={buildPageUrl(channel, page + 1)}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  Weiter
                  <ChevronRight className="h-3 w-3" />
                </Link>
              ) : (
                <span className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-slate-700">
                  Weiter
                  <ChevronRight className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
