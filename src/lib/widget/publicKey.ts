// ============================================================
// Web-Widget Public-Key-Aufloesung
// Loest einen oeffentlichen Widget-Key (pub_xxx) zu einer
// minimalen, NICHT-sensitiven Tenant-Sicht auf.
//
// Sicherheitsregeln (siehe WEB_WIDGET_INTEGRATION.md):
// - Gibt niemals interne Felder zurueck (tenantId existiert
//   nur innerhalb des Caller-Scopes, nicht im HTTP-Response)
// - Gibt niemals billingEmail, dashboardToken, paddlePlan
//   oder whatsappPhoneId zurueck
// - Pruefte zusaetzlich isActive UND webWidgetEnabled
// ============================================================

import { db } from "@/shared/db";

// Oeffentliche, fuer das Widget freigegebene Tenant-Config.
// 11 Felder: 5 Farben, 3 Branding, 2 Verhalten, 1 Embed-Loader.
// Alles was das Widget visuell darstellt MUSS aus dieser Config
// kommen - kein Hardcoding im Rendering.
export interface ResolvedTenantConfig {
  // Visuelle Farben (5)
  backgroundColor: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  mutedTextColor: string;
  // Branding (3)
  logoUrl: string | null;
  botName: string;
  botSubtitle: string;
  // Verhalten (2)
  welcomeMessage: string;
  avatarInitials: string;
  // Embed-Loader (1, Phase 5)
  // Optionaler Tenant-Override fuer das Floating-Bubble-Icon.
  // null = Standard-Icon aus public/widget.js verwenden.
  bubbleIconUrl: string | null;
}

// Ergebnis einer erfolgreichen Aufloesung.
// tenantId wird NUR intern benoetigt (z.B. fuer auditLog),
// sie darf NIEMALS im HTTP-Response erscheinen.
export interface ResolvedTenant {
  tenantId: string;
  config: ResolvedTenantConfig;
}

// ---------- Defaults ----------

// Neutraler, edler Default-Look fuer unbekannte bzw. unkonfigurierte
// Tenants. Bewusst NICHT brand-spezifisch. Wird auch vom
// /embed/widget-Page als Fallback-UI-Farbquelle importiert.
export const DEFAULT_CONFIG: ResolvedTenantConfig = {
  backgroundColor: "#18181B",
  primaryColor: "#6366F1",
  accentColor: "#22D3EE",
  textColor: "#F4F4F5",
  mutedTextColor: "#A1A1AA",
  logoUrl: null,
  botName: "Chat",
  botSubtitle: "Antwortet sofort",
  welcomeMessage: "Hallo! Wie kann ich helfen?",
  avatarInitials: "AI",
  bubbleIconUrl: null,
};

// ---------- In-Memory-Cache ----------

interface CacheEntry {
  data: ResolvedTenant | null;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 60 Sekunden
const cache = new Map<string, CacheEntry>();

// TODO: Cache-Invalidierung bei Dashboard-Update des webWidgetConfig.
// Aktuell sind bis zu 60 Sekunden stale Daten moeglich.
// Loesung in Phase 6 (Dashboard): Nach PATCH des Tenant-Configs
// den betroffenen Key aus dem Cache entfernen (cache.delete(publicKey)).

// ---------- Sichere Config-Parser ----------

// ---------- Feld-Validatoren ----------

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function parseHexColor(raw: unknown, fallback: string): string {
  return typeof raw === "string" && HEX_COLOR_RE.test(raw) ? raw : fallback;
}

function parseBoundedString(
  raw: unknown,
  minLen: number,
  maxLen: number,
  fallback: string,
): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (trimmed.length < minLen || trimmed.length > maxLen) return fallback;
  return trimmed;
}

function parseLogoUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  // Absolute HTTP(S) oder same-origin-Pfad erlauben, sonst null.
  if (raw.startsWith("https://") || raw.startsWith("http://") || raw.startsWith("/")) {
    return raw;
  }
  return null;
}

/**
 * Parst den in der DB gespeicherten webWidgetConfig (Prisma Json-Feld)
 * defensiv und fuellt Defaults auf. Niemals throw - immer ein
 * vollstaendiges ResolvedTenantConfig-Objekt zurueckgeben.
 *
 * Backward-kompatibel: alte Configs mit nur primaryColor/welcomeMessage/
 * logoUrl werden korrekt gelesen, fehlende Felder aus DEFAULT_CONFIG
 * gefuellt.
 */
function parseConfig(raw: unknown): ResolvedTenantConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_CONFIG;

  const obj = raw as Record<string, unknown>;

  return {
    backgroundColor: parseHexColor(obj.backgroundColor, DEFAULT_CONFIG.backgroundColor),
    primaryColor: parseHexColor(obj.primaryColor, DEFAULT_CONFIG.primaryColor),
    accentColor: parseHexColor(obj.accentColor, DEFAULT_CONFIG.accentColor),
    textColor: parseHexColor(obj.textColor, DEFAULT_CONFIG.textColor),
    mutedTextColor: parseHexColor(obj.mutedTextColor, DEFAULT_CONFIG.mutedTextColor),
    logoUrl: parseLogoUrl(obj.logoUrl),
    botName: parseBoundedString(obj.botName, 1, 50, DEFAULT_CONFIG.botName),
    botSubtitle: parseBoundedString(obj.botSubtitle, 0, 100, DEFAULT_CONFIG.botSubtitle),
    welcomeMessage: parseBoundedString(
      obj.welcomeMessage,
      1,
      500,
      DEFAULT_CONFIG.welcomeMessage,
    ),
    avatarInitials: parseBoundedString(
      obj.avatarInitials,
      1,
      3,
      DEFAULT_CONFIG.avatarInitials,
    ),
    // Phase 5: Embed-Loader Tenant-Override fuer das Bubble-Icon.
    // Gleiche URL-Validierung wie logoUrl (parseLogoUrl):
    // nur https://, http:// oder same-origin-Pfade werden akzeptiert,
    // alles andere faellt auf null zurueck (-> Standard-Icon).
    bubbleIconUrl: parseLogoUrl(obj.bubbleIconUrl),
  };
}

// ---------- Oeffentliche API ----------

/**
 * Loest einen Widget-Public-Key zu einem aktiven Tenant auf.
 *
 * Rueckgabe:
 * - ResolvedTenant, wenn Tenant existiert, isActive=true UND webWidgetEnabled=true
 * - null, wenn Key unbekannt, Tenant inaktiv oder Widget deaktiviert
 *
 * Das Ergebnis wird fuer 60 Sekunden in-memory gecacht (inkl. Null-Ergebnisse,
 * damit Bruteforce-Versuche nicht jede Anfrage in die DB treiben).
 */
export async function resolvePublicKey(
  publicKey: string,
): Promise<ResolvedTenant | null> {
  const now = Date.now();

  // Cache-Hit?
  const cached = cache.get(publicKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  // DB-Lookup - NICHT nur by key, sondern auch isActive + webWidgetEnabled pruefen
  const tenant = await db.tenant.findUnique({
    where: { webWidgetPublicKey: publicKey },
    select: {
      id: true,
      isActive: true,
      webWidgetEnabled: true,
      webWidgetConfig: true,
    },
  });

  let result: ResolvedTenant | null = null;
  if (tenant && tenant.isActive && tenant.webWidgetEnabled) {
    result = {
      tenantId: tenant.id,
      config: parseConfig(tenant.webWidgetConfig),
    };
  }

  cache.set(publicKey, { data: result, expiresAt: now + CACHE_TTL_MS });
  return result;
}
