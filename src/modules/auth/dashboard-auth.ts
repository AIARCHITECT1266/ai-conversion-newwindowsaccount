// ============================================================
// Dashboard Auth – Tenant aus Cookie/Header aufloesen
// Token wird als SHA-256 Hash in der DB gespeichert.
// Bei Lookup: empfangener Token wird gehasht und verglichen.
// ============================================================

import { cache } from "react";
import { createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/shared/db";

// Token-Ablaufzeiten
export const MAGIC_LINK_EXPIRY_MS = 72 * 60 * 60 * 1000; // 72 Stunden fuer Magic-Links
export const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage nach Login

/**
 * SHA-256 Hash eines Tokens fuer sichere DB-Speicherung.
 * Bei DB-Leak sind die Klartext-Tokens nicht kompromittiert.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Loest den Tenant anhand des dashboard_token Cookies auf.
 * Token wird vor DB-Lookup gehasht. Expiry wird geprueft.
 * Gibt null zurueck wenn kein gueltiger Token vorhanden.
 *
 * react.cache()-Wrap (Phase 2b.5.1): Layout und Sub-Pages koennen
 * den Tenant unabhaengig voneinander abfragen. cache() dedupliziert
 * diese Aufrufe per-Request, vermeidet redundante DB-Roundtrips.
 * Cache-Scope ist strikt request-lokal — kein Cross-Request- oder
 * Cross-Tenant-Leak moeglich.
 */
export const getDashboardTenant = cache(
  async (): Promise<{
    id: string;
    name: string;
    brandName: string;
    paddlePlan: string | null;
  } | null> => {
    // Token aus Cookie oder Middleware-Header lesen
    const cookieStore = await cookies();
    const headerStore = await headers();
    const token =
      cookieStore.get("dashboard_token")?.value ??
      headerStore.get("x-dashboard-token") ??
      null;

    if (!token) return null;

    // Token hashen bevor DB-Lookup (DB speichert nur Hashes)
    const tokenHash = hashToken(token);

    const tenant = await db.tenant.findUnique({
      where: { dashboardToken: tokenHash },
      select: {
        id: true,
        name: true,
        brandName: true,
        paddlePlan: true,
        isActive: true,
        dashboardTokenExpiresAt: true,
      },
    });

    if (!tenant || !tenant.isActive) return null;

    // Token-Ablauf pruefen
    if (tenant.dashboardTokenExpiresAt && tenant.dashboardTokenExpiresAt < new Date()) {
      return null;
    }

    return {
      id: tenant.id,
      name: tenant.name,
      brandName: tenant.brandName,
      paddlePlan: tenant.paddlePlan,
    };
  }
);
