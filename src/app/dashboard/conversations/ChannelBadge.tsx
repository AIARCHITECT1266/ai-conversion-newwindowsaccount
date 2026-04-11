// ============================================================
// ChannelBadge — wiederverwendbares Channel-Indikator-Badge
//
// Kleines visuelles Badge, das anzeigt, ob eine Conversation
// ueber den WhatsApp- oder den Web-Widget-Kanal gefuehrt wurde.
// Ein einziger Ort fuer die Badge-Markup, damit die drei
// Konsumenten — Conversations-List-View, Conversations-Detail-
// View, CRM-Kanban-LeadCard — nicht auseinanderdriften koennen.
//
// Farbwahl:
// - WhatsApp: emerald (an WhatsApp-Brand-Gruen angelehnt)
// - Web:      sky     (Web-Browser-Semantik)
//
// Bewusste Abweichung von der Phase-6.3-Briefing-Formulierung
// "primary-Color fuer WhatsApp, accent-Color fuer Web":
//
// Die Dashboard-Palette hat bereits vergeben:
// - Gold (#c9a84c) = Status PAUSED
// - Purple (#8b5cf6) = Status ACTIVE
//
// Eine wortlaut-treue Umsetzung der Briefing-Farben haette
// direkte visuelle Kollision mit den Status-Pills erzeugt, die
// unmittelbar neben dem ChannelBadge im selben Zeilen-Flow
// stehen. Emerald + Sky ist die kollisionsfreie Lesart und
// fuegt gleichzeitig semantisch vertraute Brand-/Medium-Cues
// hinzu.
//
// Spec-Bezug (CLAUDE.md Regel 5): siehe
// docs/decisions/phase-6-dashboard-widget.md Abschnitt
// "Sub-Phase 6.3 — ChannelBadge-Farbwahl".
// ============================================================

import { Phone, Globe } from "lucide-react";

interface Props {
  channel: "WHATSAPP" | "WEB";
}

export function ChannelBadge({ channel }: Props) {
  if (channel === "WHATSAPP") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
        <Phone className="h-2.5 w-2.5" />
        WhatsApp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
      <Globe className="h-2.5 w-2.5" />
      Web
    </span>
  );
}
