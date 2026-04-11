// ============================================================
// Settings-Uebersichts-Page (Sub-Phase 6.5)
//
// Dedizierte Landing-Page fuer /dashboard/settings. Zeigt dem
// User eine Card-Grid aller aktiven Einstellungs-Bereiche plus
// eine "Bald verfuegbar"-Sektion als Signal fuer kuenftige
// Features.
//
// Keine eigene min-h-screen-Huelle, kein eigenes bg — das
// kommt aus dem umgebenden settings/layout.tsx.
//
// Auth-Check nicht noetig: die Dashboard-Middleware
// (src/middleware.ts) leitet unauthentifizierte Requests zu
// /dashboard/* bereits vor dem Server-Component-Render auf
// /dashboard/login um.
// ============================================================

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  MessageSquare,
  User,
  CreditCard,
  Link2,
  Users,
  Lock,
} from "lucide-react";
import type { ComponentType } from "react";

// ---------- Typen ----------

type IconComponent = ComponentType<{ className?: string }>;

interface ActiveSetting {
  href: string;
  title: string;
  description: string;
  Icon: IconComponent;
}

interface ComingSoonSetting {
  title: string;
  description: string;
  Icon: IconComponent;
}

// ---------- Daten ----------

const ACTIVE_SETTINGS: ActiveSetting[] = [
  {
    href: "/dashboard/settings/widget",
    title: "Web-Widget",
    description:
      "Einbettbarer Chat fuer deine Website. Farben, Public-Key, Embed-Code und Live-Preview.",
    Icon: Globe,
  },
  {
    href: "/dashboard/settings/prompt",
    title: "Bot-Prompt",
    description:
      "Passe den System-Prompt an, mit dem dein Sales-Bot mit Leads spricht.",
    Icon: MessageSquare,
  },
];

const COMING_SOON_SETTINGS: ComingSoonSetting[] = [
  {
    title: "Profil & Account",
    description: "Tenant-Name, E-Mail, Brand-Farbe, DSGVO-Retention-Dauer.",
    Icon: User,
  },
  {
    title: "Plan & Billing",
    description:
      "Paddle-Plan verwalten, Rechnungen einsehen, auf hoeheren Plan upgraden.",
    Icon: CreditCard,
  },
  {
    title: "HubSpot Integration",
    description:
      "Hot-Leads mit Score > 70 automatisch als HubSpot-Kontakte synchronisieren.",
    Icon: Link2,
  },
  {
    title: "Team & Mitglieder",
    description:
      "Weitere Dashboard-Zugaenge fuer dein Vertriebsteam anlegen und verwalten.",
    Icon: Users,
  },
];

// ---------- Page ----------

export default function SettingsOverviewPage() {
  return (
    <div>
      {/* Zurueck-Link zum Haupt-Dashboard. Die Sidebar zeigt nur
          Geschwister-Pages, nicht den Weg zum Parent. */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Dashboard
      </Link>

      {/* Ueberschrift + Intro */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        <p className="mt-2 text-sm text-[#ede8df]/60">
          Konfiguriere dein AI Conversion Dashboard — vom Web-Widget bis zum
          Bot-System-Prompt.
        </p>
      </div>

      {/* Aktive Settings als Premium-Cards */}
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#c9a84c]/70">
        Aktive Bereiche
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {ACTIVE_SETTINGS.map((setting) => (
          <ActiveCard key={setting.href} setting={setting} />
        ))}
      </div>

      {/* "Bald verfuegbar"-Sektion */}
      <h2 className="mb-3 mt-10 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        Bald verfuegbar
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {COMING_SOON_SETTINGS.map((setting) => (
          <ComingSoonCard key={setting.title} setting={setting} />
        ))}
      </div>
    </div>
  );
}

// ---------- Sub-Komponenten ----------

function ActiveCard({ setting }: { setting: ActiveSetting }) {
  const { Icon } = setting;
  return (
    <Link
      href={setting.href}
      className="group flex flex-col rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-5 transition-colors hover:border-[#c9a84c]/25 hover:bg-white/[0.02]"
    >
      <div className="mb-3 flex items-center justify-between">
        <Icon className="h-5 w-5 text-[#c9a84c]" />
        <ArrowRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-[#c9a84c]" />
      </div>
      <h3 className="mb-1 text-sm font-semibold">{setting.title}</h3>
      <p className="text-xs leading-relaxed text-[#ede8df]/60">
        {setting.description}
      </p>
    </Link>
  );
}

function ComingSoonCard({ setting }: { setting: ComingSoonSetting }) {
  const { Icon } = setting;
  return (
    <div
      className="flex cursor-not-allowed flex-col rounded-2xl border border-white/[0.04] bg-[#0e0e1a]/60 p-5"
      aria-disabled="true"
      title="Bald verfuegbar"
    >
      <div className="mb-3 flex items-center justify-between">
        <Icon className="h-5 w-5 text-slate-600" />
        <Lock className="h-3 w-3 text-slate-700" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-slate-400">
        {setting.title}
      </h3>
      <p className="text-xs leading-relaxed text-slate-600">
        {setting.description}
      </p>
    </div>
  );
}
