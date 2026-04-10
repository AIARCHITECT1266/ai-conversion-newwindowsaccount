// ============================================================
// /embed/widget?key=pub_xxx
//
// Server Component (Phase 4b).
// - Fetched die Tenant-Config per HTTP von /api/widget/config
// - Bei Erfolg: rendert <ChatClient />, der die komplette
//   interaktive Widget-UI liefert (Consent-Modal, Chat, Polling)
// - Bei Fehler: eigenstaendige ErrorBox mit Fallback-Farben
//   aus DEFAULT_CONFIG
//
// Architektur-Regel: Null hardcoded Farbwerte. Default-Look kommt
// aus DEFAULT_CONFIG (publicKey.ts), nicht aus diesem File.
// ============================================================

import { headers } from "next/headers";
import { DEFAULT_CONFIG } from "@/lib/widget/publicKey";
import type { ResolvedTenantConfig } from "@/lib/widget/publicKey";
import { withAlpha } from "@/lib/widget/colors";
import { ChatClient } from "./ChatClient";

interface ConfigFetchResult {
  ok: true;
  config: ResolvedTenantConfig;
}

interface ConfigFetchError {
  ok: false;
  reason: "missing-key" | "invalid-key" | "not-found" | "fetch-failed";
  status?: number;
}

// Neutraler Fallback fuer Fehler-Boxen, wenn keine Tenant-Config
// geladen werden konnte. Wird aus DEFAULT_CONFIG (publicKey.ts)
// abgeleitet - so bleibt die Farbquelle an einer einzigen Stelle.
const FALLBACK_UI = {
  backgroundColor: DEFAULT_CONFIG.backgroundColor,
  textColor: DEFAULT_CONFIG.textColor,
  mutedTextColor: DEFAULT_CONFIG.mutedTextColor,
  primaryColor: DEFAULT_CONFIG.primaryColor,
};

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function fetchWidgetConfig(
  key: string | undefined,
): Promise<ConfigFetchResult | ConfigFetchError> {
  if (!key) return { ok: false, reason: "missing-key" };
  if (!/^pub_[A-Za-z0-9_-]{4,96}$/.test(key)) {
    return { ok: false, reason: "invalid-key" };
  }

  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/api/widget/config?key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) {
      return { ok: false, reason: "not-found", status: 404 };
    }
    if (!res.ok) {
      return { ok: false, reason: "fetch-failed", status: res.status };
    }
    const data = (await res.json()) as ResolvedTenantConfig;
    return { ok: true, config: data };
  } catch {
    return { ok: false, reason: "fetch-failed" };
  }
}

// ---------- Error-Box ----------

function ErrorBox({ title, message }: { title: string; message: string }) {
  return (
    <div
      className="flex h-screen w-full items-center justify-center p-6"
      style={{
        backgroundColor: FALLBACK_UI.backgroundColor,
        color: FALLBACK_UI.textColor,
      }}
    >
      <div
        className="max-w-sm rounded-2xl p-6 text-center"
        style={{
          backgroundColor: withAlpha(FALLBACK_UI.primaryColor, "1A"),
          border: `1px solid ${withAlpha(FALLBACK_UI.primaryColor, "33")}`,
        }}
      >
        <h1
          className="mb-2 text-base font-semibold"
          style={{ color: FALLBACK_UI.textColor }}
        >
          {title}
        </h1>
        <p className="text-sm" style={{ color: FALLBACK_UI.mutedTextColor }}>
          {message}
        </p>
      </div>
    </div>
  );
}

// ---------- Page ----------

export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawKey = typeof params.key === "string" ? params.key : undefined;
  const result = await fetchWidgetConfig(rawKey);

  if (!result.ok) {
    if (result.reason === "missing-key") {
      return (
        <ErrorBox
          title="Widget nicht konfiguriert"
          message="Es wurde kein Widget-Key uebergeben (?key=pub_...)."
        />
      );
    }
    if (result.reason === "invalid-key") {
      return (
        <ErrorBox
          title="Ungueltiger Key"
          message="Der uebergebene Widget-Key hat ein ungueltiges Format."
        />
      );
    }
    if (result.reason === "not-found") {
      return (
        <ErrorBox
          title="Widget nicht verfuegbar"
          message="Dieses Widget existiert nicht oder ist deaktiviert."
        />
      );
    }
    return (
      <ErrorBox
        title="Widget nicht erreichbar"
        message="Die Widget-Konfiguration konnte nicht geladen werden."
      />
    );
  }

  // rawKey ist zu diesem Zeitpunkt garantiert ein gueltiger String
  // (sonst waeren wir im missing-key- oder invalid-key-Zweig gelandet).
  return <ChatClient config={result.config} publicKey={rawKey as string} />;
}
