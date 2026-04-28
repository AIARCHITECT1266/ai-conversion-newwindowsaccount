// ============================================================
// Tenant-Auflösung – Mandant anhand der WhatsApp Phone ID ermitteln
// Wird im Webhook genutzt, um eingehende Nachrichten dem
// richtigen Mandanten zuzuordnen.
// In-Memory-Cache mit 60s TTL reduziert DB-Last.
//
// Hardening (28.04.2026, Phase 2-Pilot):
// - Defensive Input-Validation: liefert null bei undefined/null/
//   non-string/empty/oversized Input statt einen Prisma-500 zu
//   provozieren. Schuetzt vor Brute-Force-Probing.
// - Strukturiertes Audit-Log fuer Failed-Lookups
//   (action: "tenant.lookup_failed"). Phone-ID wird NIE im
//   Klartext geloggt — nur SHA-256-Hash (16 chars).
// ============================================================

import { createHash } from "crypto";
import { db } from "@/shared/db";
import { auditLog } from "@/modules/compliance/audit-log";
import type { Tenant } from "@/generated/prisma/client";

// ---------- Cache ----------

const CACHE_TTL_MS = 60_000; // 60 Sekunden

// Maximale Laenge einer WhatsApp-Phone-ID. Echte Phone-IDs sind
// 12-16 stellig; alles >64 ist mit Sicherheit Brute-Force-Probing
// oder ein versuchter Buffer-/DoS-Angriff.
const MAX_PHONE_ID_LENGTH = 64;

interface CacheEntry {
  tenant: Tenant | null;
  expiresAt: number;
}

const tenantCache = new Map<string, CacheEntry>();

/**
 * Hasht eine Phone-ID fuer Audit-Logs.
 * SHA-256 + erste 16 Hex-Chars — gleiches Pattern wie
 * hashTokenForRateLimit in src/lib/widget/sessionToken.ts.
 * DSGVO: Phone-ID darf NIE im Klartext im Audit-Log landen.
 */
function hashPhoneId(phoneNumberId: string): string {
  return createHash("sha256").update(phoneNumberId).digest("hex").slice(0, 16);
}

/**
 * Ermittelt den Mandanten anhand der WhatsApp Phone Number ID.
 * Ergebnis wird fuer 60 Sekunden gecacht.
 * Gibt null zurück wenn kein aktiver Mandant gefunden wird.
 *
 * @param phoneNumberId - Die Phone Number ID aus der WhatsApp Cloud API
 */
export async function getTenantByPhoneId(
  phoneNumberId: string
): Promise<Tenant | null> {
  // Defensive Input-Validation. Verhindert Prisma-500 bei
  // unsauberen Aufrufern und schuetzt vor Probing-Angriffen.
  if (phoneNumberId === undefined || phoneNumberId === null) {
    return null;
  }
  if (typeof phoneNumberId !== "string") {
    return null;
  }
  if (phoneNumberId.length === 0) {
    return null;
  }
  if (phoneNumberId.length > MAX_PHONE_ID_LENGTH) {
    // Oversized Input: Brute-Force-Indikator. Audit-Log mit Hash,
    // damit Security-Team Patterns erkennen kann ohne Klartext-PII.
    auditLog("tenant.lookup_failed", {
      details: {
        phoneIdHash: hashPhoneId(phoneNumberId),
        reason: "oversized",
        length: phoneNumberId.length,
      },
    });
    console.warn(
      "[Tenant] Phone-ID-Lookup mit oversized Input abgelehnt"
    );
    return null;
  }

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
    auditLog("tenant.lookup_failed", {
      details: {
        phoneIdHash: hashPhoneId(phoneNumberId),
        reason: "not_found",
      },
    });
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
