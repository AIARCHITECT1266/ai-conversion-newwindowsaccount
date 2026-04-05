// ============================================================
// Tenant-Auflösung – Mandant anhand der WhatsApp Phone ID ermitteln
// Wird im Webhook genutzt, um eingehende Nachrichten dem
// richtigen Mandanten zuzuordnen.
// In-Memory-Cache mit 60s TTL reduziert DB-Last.
// ============================================================

import { db } from "./db";
import type { Tenant } from "@/generated/prisma/client";

// ---------- Cache ----------

const CACHE_TTL_MS = 60_000; // 60 Sekunden

interface CacheEntry {
  tenant: Tenant | null;
  expiresAt: number;
}

const tenantCache = new Map<string, CacheEntry>();

/**
 * Ermittelt den Mandanten anhand der WhatsApp Phone Number ID.
 * Ergebnis wird fuer 60 Sekunden gecacht.
 * Gibt null zurück wenn kein aktiver Mandant gefunden wird.
 *
 * @param phoneNumberId - Die Phone Number ID aus der WhatsApp Cloud API
 */
export async function getTenantByPhoneId(phoneNumberId: string): Promise<Tenant | null> {
  const now = Date.now();

  // Cache prüfen
  const cached = tenantCache.get(phoneNumberId);
  if (cached && cached.expiresAt > now) {
    return cached.tenant;
  }

  // DB-Abfrage
  const tenant = await db.tenant.findUnique({
    where: {
      whatsappPhoneId: phoneNumberId,
      isActive: true,
    },
  });

  // Ergebnis cachen (auch null, um wiederholte DB-Abfragen für unbekannte IDs zu vermeiden)
  tenantCache.set(phoneNumberId, {
    tenant,
    expiresAt: now + CACHE_TTL_MS,
  });

  if (!tenant) {
    console.warn("[Tenant] Kein aktiver Mandant für Phone ID gefunden");
  }

  return tenant;
}

/**
 * Cache invalidieren (z.B. nach Tenant-Aktualisierung).
 */
export function invalidateTenantCache(phoneNumberId?: string): void {
  if (phoneNumberId) {
    tenantCache.delete(phoneNumberId);
  } else {
    tenantCache.clear();
  }
}
