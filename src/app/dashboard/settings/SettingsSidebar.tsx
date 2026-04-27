"use client";

// ============================================================
// SettingsSidebar (Sub-Phase 6.5)
//
// Linke Sidebar fuer die Einstellungs-Bereiche. Auf Desktop
// (>=640px, Tailwind sm:) inline als flex-Child, auf Mobile
// (<640px) als fixed Overlay mit Hamburger-Menue.
//
// Architektur-Pattern: Notion/Linear/Stripe — permanente linke
// Navigation mit aktivem State pro Seite. Disabled Items
// signalisieren Pilot-Kunden "da kommt mehr" ohne die Navigation
// aufzublaehen, sobald die Features wirklich da sind.
//
// Aktive Settings werden ueber usePathname() hervorgehoben,
// Coming-Soon-Items sind cursor-not-allowed + ausgegraut mit
// "Bald verfuegbar"-Tooltip.
//
// Pattern-Referenz fuer Color-Palette und Icon-Stil:
// src/app/dashboard/settings/widget/page.tsx (Phase 6.2).
// ============================================================

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Globe,
  MessageSquare,
  Target,
  User,
  CreditCard,
  Link2,
  Users as UsersIcon,
} from "lucide-react";

// ---------- Nav-Items ----------

interface ActiveItem {
  href: string;
  label: string;
  Icon: typeof Globe;
}

interface ComingSoonItem {
  label: string;
  Icon: typeof Globe;
}

const ACTIVE_ITEMS: ActiveItem[] = [
  { href: "/dashboard/settings/widget", label: "Web-Widget", Icon: Globe },
  { href: "/dashboard/settings/prompt", label: "Bot-Prompt", Icon: MessageSquare },
  { href: "/dashboard/settings/scoring", label: "Scoring", Icon: Target },
];

const COMING_SOON_ITEMS: ComingSoonItem[] = [
  { label: "Profil & Account", Icon: User },
  { label: "Plan & Billing", Icon: CreditCard },
  { label: "HubSpot Integration", Icon: Link2 },
  { label: "Team & Mitglieder", Icon: UsersIcon },
];

// ---------- Komponente ----------

export function SettingsSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile-Hamburger-Button — nur auf < 640px sichtbar */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-white/[0.08] bg-[#0e0e1a] p-2 text-[#ede8df] shadow-lg sm:hidden"
        aria-label="Einstellungs-Menue oeffnen"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile-Backdrop — nur wenn offen */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/*
        Sidebar selbst.
        - Mobile (default):       fixed Overlay, -translate-x-full (versteckt)
        - Mobile offen:            translate-x-0 (sichtbar)
        - Desktop (sm:):           static im flex-Flow, translate-x-0
      */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto border-r border-white/[0.06] bg-[#0e0e1a] transition-transform duration-300 ease-out sm:static sm:z-auto sm:h-auto sm:w-56 sm:shrink-0 sm:border-0 sm:bg-transparent sm:transition-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        {/* Header-Zeile: Titel + Mobile-Close */}
        <div className="flex items-center justify-between p-4 sm:px-0 sm:pb-4 sm:pt-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#c9a84c]/70">
            Einstellungen
          </h2>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-[#ede8df] sm:hidden"
            aria-label="Menue schliessen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Aktive Settings */}
        <nav className="flex flex-col gap-1 px-4 sm:px-0">
          {ACTIVE_ITEMS.map((item) => {
            const { Icon } = item;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 rounded-r-lg border-l-2 px-3 py-2 text-sm transition-colors ${
                  active
                    ? "border-[#c9a84c] bg-[#c9a84c]/10 text-[#c9a84c]"
                    : "border-transparent text-[#ede8df]/70 hover:bg-white/[0.04] hover:text-[#ede8df]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* "Bald verfuegbar" */}
        <div className="mt-6 px-4 sm:px-0">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-600">
            Bald verfügbar
          </p>
          <div className="flex flex-col gap-1">
            {COMING_SOON_ITEMS.map((item) => {
              const { Icon } = item;
              return (
                <div
                  key={item.label}
                  className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600"
                  aria-disabled="true"
                  title="Bald verfügbar"
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-40" />
                  <span className="opacity-60">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
