// ============================================================
// /embed/widget?key=pub_xxx
//
// Statisches Widget-iframe-Skelett (Phase 4a-Erweiterung).
// React Server Component, laedt die Tenant-Config (10 Felder)
// per HTTP von /api/widget/config und rendert ein vollstaendig
// dynamisch gebrandetes Chat-Skelett.
//
// Architektur-Regel: NICHTS in dieser Datei darf visuelle
// Farb- oder Textwerte hardcoden. Ausnahme: SVG-Pfade (Icon).
// Jeder Farbwert kommt aus config.*, jeder Text kommt aus
// config.* oder ist ein Phase-spezifischer UI-Platzhalter.
// ============================================================

import { headers } from "next/headers";
import { DEFAULT_CONFIG } from "@/lib/widget/publicKey";

interface WidgetConfig {
  backgroundColor: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  mutedTextColor: string;
  logoUrl: string | null;
  botName: string;
  botSubtitle: string;
  welcomeMessage: string;
  avatarInitials: string;
}

interface ConfigFetchResult {
  ok: true;
  config: WidgetConfig;
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

// Baut die Absolute-URL fuer Self-Fetches aus den Request-Headers.
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
    const data = (await res.json()) as WidgetConfig;
    return { ok: true, config: data };
  } catch {
    return { ok: false, reason: "fetch-failed" };
  }
}

// Haengt einen 2-stelligen Hex-Alpha-Suffix an eine Hex-Farbe.
// 14 ≈ 8%, 1A ≈ 10%, 33 ≈ 20%, 4D ≈ 30% Opacity.
function withAlpha(hex: string, alphaHex: "14" | "1A" | "33" | "4D"): string {
  return `${hex}${alphaHex}`;
}

// ---------- Avatar-Komponente ----------

function Avatar({
  size,
  config,
}: {
  size: 32 | 40;
  config: WidgetConfig;
}) {
  const dimensionClass = size === 40 ? "w-10 h-10" : "w-8 h-8";
  const textSize = size === 40 ? "text-sm" : "text-[11px]";

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
      className={`${dimensionClass} shrink-0 rounded-full flex items-center justify-center font-semibold ${textSize}`}
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
        <h1 className="mb-2 text-base font-semibold" style={{ color: FALLBACK_UI.textColor }}>
          {title}
        </h1>
        <p className="text-sm" style={{ color: FALLBACK_UI.mutedTextColor }}>
          {message}
        </p>
      </div>
    </div>
  );
}

// ---------- Widget-Page ----------

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

  const config = result.config;

  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden"
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
      }}
    >
      {/* Header (~64px) */}
      <header
        className="flex shrink-0 items-center gap-3 px-4 py-3"
        style={{ borderBottom: `1px solid ${withAlpha(config.primaryColor, "33")}` }}
      >
        <Avatar size={40} config={config} />
        <div className="flex min-w-0 flex-col leading-tight">
          <span
            className="truncate text-base font-semibold"
            style={{ color: config.textColor }}
          >
            {config.botName}
          </span>
          {config.botSubtitle.length > 0 && (
            <span
              className="truncate text-xs"
              style={{ color: config.mutedTextColor }}
            >
              {config.botSubtitle}
            </span>
          )}
        </div>
      </header>

      {/* Nachrichten-Area */}
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        <div className="flex items-end gap-2">
          <Avatar size={32} config={config} />
          <div
            className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed"
            style={{
              backgroundColor: withAlpha(config.primaryColor, "1A"),
              border: `1px solid ${withAlpha(config.primaryColor, "33")}`,
              color: config.textColor,
            }}
          >
            {config.welcomeMessage}
          </div>
        </div>
      </main>

      {/* Input-Bereich */}
      <footer
        className="flex shrink-0 items-center gap-2 px-4 py-3"
        style={{ borderTop: `1px solid ${withAlpha(config.primaryColor, "33")}` }}
      >
        <input
          type="text"
          disabled
          aria-label="Nachricht eingeben"
          placeholder="Chat startet in Phase 4b..."
          className="flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none"
          style={{
            // Subtiler Surface-Overlay aus textColor @ 8% Opacity -
            // passt automatisch zu dunklen und hellen Themes.
            backgroundColor: withAlpha(config.textColor, "14"),
            border: `1px solid ${withAlpha(config.primaryColor, "4D")}`,
            // Da das Feld disabled ist und nur einen Placeholder zeigt,
            // reicht color=mutedTextColor - der Browser leitet die
            // Placeholder-Farbe davon ab. So bleibt alles dynamisch
            // aus config.*, ohne inline-<style>-Hack.
            color: config.mutedTextColor,
          }}
        />
        <button
          type="button"
          disabled
          aria-label="Senden"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl opacity-60"
          style={{
            backgroundColor: config.primaryColor,
            color: config.backgroundColor,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </footer>
    </div>
  );
}
