// ============================================================
// Avatar-Komponente fuer /embed/widget.
//
// Ohne "use client", damit sie von beiden Seiten (Server Component
// page.tsx und Client Component ChatClient.tsx) importierbar ist.
// Enthaelt keine server-only-Abhaengigkeiten, der Type-Import ist
// compile-time-only.
// ============================================================

import type { ResolvedTenantConfig } from "@/lib/widget/publicKey";
import { withAlpha } from "@/lib/widget/colors";

interface AvatarProps {
  size: 32 | 40;
  config: ResolvedTenantConfig;
}

export function Avatar({ size, config }: AvatarProps) {
  const dimensionClass = size === 40 ? "w-10 h-10" : "w-8 h-8";
  const textSizeClass = size === 40 ? "text-sm" : "text-[11px]";

  if (config.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={config.logoUrl}
        alt=""
        className={`${dimensionClass} shrink-0 rounded-full object-cover`}
        style={{ backgroundColor: withAlpha(config.primaryColor, "1A") }}
      />
    );
  }

  return (
    <div
      className={`${dimensionClass} ${textSizeClass} shrink-0 rounded-full flex items-center justify-center font-semibold`}
      style={{
        backgroundColor: config.primaryColor,
        color: config.backgroundColor,
      }}
      aria-hidden="true"
    >
      {config.avatarInitials}
    </div>
  );
}
