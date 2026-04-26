// ============================================================
// Termine-Tab Coming-Soon-Page (Phase 2e)
//
// Statische Coming-Soon-Page, die nur via Direkt-URL erreichbar
// ist (der Tab im DashboardTopNav ist gedimmt + nicht klickbar
// analog zum Clients-Tab-Pattern). Wird im Pilot-Setup mit dem
// Tenant gemeinsam konfiguriert (Calendly / Cal.com / Microsoft
// Bookings / iCal).
//
// Auth-Check: lebt im umgebenden /dashboard/layout.tsx
// (Server Component, getDashboardTenant + Redirect bei null).
// Diese Page selbst ist deshalb plain Server Component, kein
// fetch noetig.
//
// Visuelles Pattern: Hourglass-Header + Serif-Headline +
// Pilot-Hinweis — analog ConversationAnalyticsTeaser.tsx
// (Phase 2c.4) + ConvArch-Spec aus Build-Prompt 5a.
// ============================================================

import { Hourglass, Calendar } from "lucide-react";

export default function AppointmentsComingSoonPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-2xl border border-dashed border-[var(--gold-border)] bg-[var(--surface)]/40 p-8 sm:p-12">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2.5">
          <Hourglass className="h-4 w-4 text-[var(--gold)]/60" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gold)]/70">
            Bald verfuegbar
          </p>
        </div>

        <h1
          className="mb-6 flex items-center gap-3 font-serif text-3xl text-[var(--text)] sm:text-4xl"
        >
          <Calendar className="h-7 w-7 text-[var(--gold)]" aria-hidden="true" />
          Termine
        </h1>

        {/* Wert-Bullets */}
        <div className="mb-8 space-y-3 text-base text-[var(--text)]">
          <p>
            Mara bucht Termine direkt im Gespraech.
            <br />
            <span className="text-[var(--text-muted)]">
              Du siehst sie hier im Kalender.
            </span>
          </p>

          <p className="pt-3 text-sm italic text-[var(--text-muted)]">
            Im Pilot konfigurieren wir die Integration mit deinem
            Terminbuchungs-Tool.
          </p>
        </div>

        {/* Provider-Pills */}
        <div className="border-t border-[var(--gold-border)] pt-6">
          <p className="mb-3 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Geplante Integrationen
          </p>
          <div className="flex flex-wrap gap-2">
            {["Calendly", "Cal.com", "Microsoft Bookings", "iCal"].map(
              (provider) => (
                <span
                  key={provider}
                  className="rounded-full border border-[var(--gold-border)] bg-white/[0.02] px-3 py-1 text-xs text-[var(--text-muted)]"
                >
                  {provider}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
