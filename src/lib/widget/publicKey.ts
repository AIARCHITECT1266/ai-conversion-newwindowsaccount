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

// Oeffentliche, fuer das Widget freigegebene Tenant-Config
export interface ResolvedTenantConfig {
  primaryColor: string;
  logoUrl: string | null;
  welcomeMessage: string;
}

// Ergebnis einer erfolgreichen Aufloesung.
// tenantId wird NUR intern benoetigt (z.B. fuer auditLog),
// sie darf NIEMALS im HTTP-Response erscheinen.
export interface ResolvedTenant {
  tenantId: string;
  config: ResolvedTenantConfig;
}

// ---------- Defaults ----------

const DEFAULT_CONFIG: ResolvedTenantConfig = {
  primaryColor: "#000000",
  logoUrl: null,
  welcomeMessage: "Hallo! Wie kann ich helfen?",
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

/**
 * Parst den in der DB gespeicherten webWidgetConfig (Prisma Json-Feld)
 * defensiv und fuellt Defaults auf. Niemals throw - immer ein
 * vollstaendiges ResolvedTenantConfig-Objekt zurueckgeben.
 */
function parseConfig(raw: unknown): ResolvedTenantConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_CONFIG;

  const obj = raw as Record<string, unknown>;

  const primaryColor =
    typeof obj.primaryColor === "string" && obj.primaryColor.length > 0
      ? obj.primaryColor
      : DEFAULT_CONFIG.primaryColor;

  const logoUrl =
    typeof obj.logoUrl === "string" && obj.logoUrl.length > 0
      ? obj.logoUrl
      : null;

  const welcomeMessage =
    typeof obj.welcomeMessage === "string" && obj.welcomeMessage.length > 0
      ? obj.welcomeMessage
      : DEFAULT_CONFIG.welcomeMessage;

  return { primaryColor, logoUrl, welcomeMessage };
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
