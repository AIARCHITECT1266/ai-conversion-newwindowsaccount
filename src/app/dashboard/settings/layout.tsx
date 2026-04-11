// ============================================================
// Settings-Layout (Sub-Phase 6.5)
//
// Server Component, wrappt alle /dashboard/settings/**-Pages
// in einen flex-Container mit linker Sidebar und Haupt-Inhalt.
//
// Die bestehenden Page-Files (settings/widget/page.tsx,
// settings/prompt/page.tsx) bleiben unveraendert — ihre internen
// Full-Page-Wrapper (min-h-screen bg-[#07070d]) sind zwar durch
// diesen Layout redundant, aber visuell harmlos (gleiche Farbe,
// gleiche min-height-Semantik). Ein groesseres Refactoring der
// existierenden Pages liegt ausserhalb des 6.5-Scopes.
//
// Pattern-Referenz: Notion/Linear/Stripe — permanente linke
// Navigation, dedizierte Settings-Uebersicht. Mobile-Hamburger
// wird von der SettingsSidebar-Client-Component gehandhabt.
// ============================================================

import { SettingsSidebar } from "./SettingsSidebar";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#07070d] text-[#ede8df]">
      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8 sm:py-10">
        <SettingsSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
