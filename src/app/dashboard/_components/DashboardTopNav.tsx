"use client";

// ============================================================
// Dashboard-Top-Navigation (Phase 2b.2)
//
// Client-Subcomponent fuer das Server-Component-Layout
// (src/app/dashboard/layout.tsx). Active-State via usePathname.
// "exact: true" fuer /dashboard, sonst Praefix-Match damit
// Detail-Pages den entsprechenden Tab aktiv halten
// (z.B. /dashboard/clients/[id] -> Tab "Clients").
//
// Konversationen ist neu (Phase 2b.2) und ersetzt den frueheren
// "Alle anzeigen"-Footer-Link auf der Top-5-Conversations-
// Card als primaeren Einstiegspunkt.
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  MessageSquare,
  Kanban,
  Megaphone,
  Send,
  Users,
  Settings,
} from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Uebersicht", icon: Activity, exact: true },
  { href: "/dashboard/conversations", label: "Konversationen", icon: MessageSquare, exact: false },
  { href: "/dashboard/crm", label: "CRM", icon: Kanban, exact: false },
  { href: "/dashboard/campaigns", label: "Kampagnen", icon: Megaphone, exact: false },
  { href: "/dashboard/broadcasts", label: "Broadcasts", icon: Send, exact: false },
  { href: "/dashboard/clients", label: "Clients", icon: Users, exact: false },
  { href: "/dashboard/settings", label: "Einstellungen", icon: Settings, exact: false },
] as const;

export function DashboardTopNav() {
  const pathname = usePathname();

  const isActive = (tab: (typeof TABS)[number]) => {
    if (tab.exact) return pathname === tab.href;
    return pathname === tab.href || pathname.startsWith(tab.href + "/");
  };

  return (
    <nav
      className="flex gap-1 overflow-x-auto pb-3"
      aria-label="Dashboard-Navigation"
    >
      {TABS.map((tab) => {
        const active = isActive(tab);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              "inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors " +
              (active
                ? "bg-[var(--gold-border)] text-[var(--gold)]"
                : "text-[var(--text-muted)] hover:bg-[var(--gold-border)] hover:text-[var(--text)]")
            }
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
