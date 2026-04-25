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

import { randomBytes } from "crypto";
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
  // Nur HTTPS oder same-origin-Pfad erlauben. HTTP abgelehnt wegen
  // MITM-Risiko (Logo-Bild koennte manipuliert werden) und
  // Mixed-Content-Problemen (Widget-iframe laeuft ueber HTTPS).
  if (raw.startsWith("https://") || raw.startsWith("/")) {
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
 *
 * Ab Phase 6 auch vom Dashboard-Widget-Config-API genutzt (GET-Handler
 * liefert dem Settings-Editor die aufgefuellte Config, damit der
 * Editor bei leeren Feldern nicht "null" oder "undefined" zeigt).
 */
export function parseConfig(raw: unknown): ResolvedTenantConfig {
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
    // nur https:// oder same-origin-Pfade, kein http:// (MITM-Schutz).
    bubbleIconUrl: parseLogoUrl(obj.bubbleIconUrl),
  };
}

// ---------- widgetVisitorMeta Helpers (Dashboard-only) ----------

// Extrahiert einen anzeigbaren Namen aus Conversation.widgetVisitorMeta.
// Das Feld ist ein freies JSON und liegt unverschluesselt vor — wird aber
// NICHT ueber die oeffentliche Widget-API ausgeliefert, nur im Dashboard.
//
// Hintergrund: Web-Channel-Conversations haben keine dedizierten
// name/firstName-Felder im Schema. Bei Widget-Embed-Integrationen kann
// das einbettende System einen displayName beim Session-Start mitgeben,
// z.B. aus bereits bekannten Kunden-Daten (Logged-In-User) oder als
// Demo-Seed-Marker. Dashboard-UI faellt auf maskExternalId() zurueck
// wenn kein displayName vorhanden.
export function parseVisitorDisplayName(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>).displayName;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  // Bound: 1 bis 120 Zeichen. Obergrenze schuetzt vor absichtlicher
  // UI-Ueberflutung (lange Strings koennten Kanban-Karten sprengen).
  if (trimmed.length < 1 || trimmed.length > 120) return null;
  return trimmed;
}

// Maskiert eine externalId fuer DSGVO-konforme Dashboard-Anzeige.
// Format: "abc •••• xy" (3 Zeichen Prefix, 2 Zeichen Suffix). Bei zu
// kurzen oder fehlenden IDs nur Platzhalter. Seit Phase 3a.5 ist
// Conversation.externalId nullable (Web-Channel hat keine WhatsApp-ID).
//
// Single Source of Truth fuer Dashboard-Maskierung. Lokale Duplikate
// in dashboard/page.tsx, crm/page.tsx und conversations/[id]/page.tsx
// existieren historisch und werden Post-Demo zentralisiert.
export function maskExternalId(externalId: string | null): string {
  if (!externalId || externalId.length <= 6) return "•••••";
  return externalId.slice(0, 3) + " •••• " + externalId.slice(-2);
}

// Liefert einen anzeigbaren Identifier fuer einen Lead in Dashboard-UI.
// Reihenfolge:
//   1. widgetVisitorMeta.displayName (wenn parseVisitorDisplayName-konform)
//   2. maskExternalId(externalId) (WhatsApp-Channel)
//   3. "•••••" (Web ohne Meta)
// Garantiert non-empty String — Caller braucht keinen Fallback.
//
// Genutzt vom Action-Board (Phase 2c.3) und kuenftigen Dashboard-
// Widgets, die Lead-Identifiers anzeigen, ohne ein separates
// displayName-Feld auf Lead zu erfordern (siehe ADR/Phase 2c.3-Audit).
export function resolveLeadDisplayIdentifier(args: {
  widgetVisitorMeta: unknown;
  externalId: string | null;
}): string {
  const fromMeta = parseVisitorDisplayName(args.widgetVisitorMeta);
  if (fromMeta) return fromMeta;
  return maskExternalId(args.externalId);
}

// ---------- leadType (Tenant-Klassifikation, Dashboard-only) ----------

// leadType lebt im Tenant.webWidgetConfig-JSON, wird aber BEWUSST NICHT
// ueber parseConfig() in die oeffentliche Widget-Config aufgenommen.
// Grund: /api/widget/config liefert das ResolvedTenantConfig-Objekt an
// anonyme Widget-Besucher aus — B2C/B2B-Klassifikation ist zwar nicht
// direkt sensitiv, gehoert aber ins Dashboard-Kontext, nicht in die
// oeffentliche Produkt-Oberflaeche. Dashboard-API liest leadType ueber
// diesen separaten Helper, parseConfig() bleibt Widget-public.
export function parseLeadType(raw: unknown): "B2C" | "B2B" | null {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>).leadType;
  return value === "B2C" || value === "B2B" ? value : null;
}

// ---------- Public-Key-Generierung ----------

/**
 * Generiert einen neuen Widget-Public-Key im Format pub_<base64url(12)>.
 *
 * Spec-Konformitaet: Format identisch zu src/scripts/generate-widget-keys.ts
 * (Entscheidung 1 aus docs/decisions/phase-0-decisions.md - crypto.randomBytes
 * statt nanoid, 96 Bit Entropie). Wird ab Phase 6 vom Dashboard-API
 * genutzt, damit ein Tenant sich selbst einen Key generieren kann, ohne
 * das CLI-Skript manuell auszufuehren.
 */
export function generatePublicKey(): string {
  return `pub_${randomBytes(12).toString("base64url")}`;
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
