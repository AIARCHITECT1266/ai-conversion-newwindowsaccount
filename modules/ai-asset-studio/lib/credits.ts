// ============================================================
// AI Asset Studio – Credit-Verwaltung
// Jeder Tenant hat 50 Generierungen/Monat inklusive.
// Bearbeitungen (edit) sind credits-neutral.
// ============================================================

import { db } from "@/lib/db";
import type { CreditCheck } from "./types";

/**
 * Prüft ob ein Tenant genügend Credits für eine Generierung hat.
 * Erstellt den Credit-Datensatz automatisch falls noch nicht vorhanden.
 */
export async function checkCredits(tenantId: string, count: number = 1): Promise<CreditCheck> {
  const credit = await getOrCreateCredit(tenantId);

  // Monatlichen Reset prüfen
  if (new Date() >= credit.resetAt) {
    await resetMonthlyCredits(tenantId);
    credit.used = 0;
    credit.resetAt = getNextResetDate();
  }

  const totalAvailable = credit.monthlyIncluded + credit.bonusCredits - credit.used;

  return {
    allowed: totalAvailable >= count,
    remaining: Math.max(0, totalAvailable),
    used: credit.used,
    monthlyIncluded: credit.monthlyIncluded,
    bonusCredits: credit.bonusCredits,
  };
}

/**
 * Zieht Credits für eine Generierung ab.
 * Gibt false zurück wenn nicht genügend Credits vorhanden.
 */
export async function deductCredits(tenantId: string, count: number = 1): Promise<boolean> {
  const check = await checkCredits(tenantId, count);
  if (!check.allowed) return false;

  await db.assetCredit.update({
    where: { tenantId },
    data: { used: { increment: count } },
  });

  return true;
}

/**
 * Holt oder erstellt den Credit-Datensatz für einen Tenant.
 */
async function getOrCreateCredit(tenantId: string) {
  const existing = await db.assetCredit.findUnique({
    where: { tenantId },
  });

  if (existing) return existing;

  // Neuen Credit-Datensatz anlegen
  return db.assetCredit.create({
    data: {
      tenantId,
      monthlyIncluded: 50,
      used: 0,
      bonusCredits: 0,
      resetAt: getNextResetDate(),
    },
  });
}

/**
 * Setzt die monatlichen Credits zurück.
 */
async function resetMonthlyCredits(tenantId: string): Promise<void> {
  await db.assetCredit.update({
    where: { tenantId },
    data: {
      used: 0,
      resetAt: getNextResetDate(),
    },
  });
}

/**
 * Berechnet das nächste Reset-Datum (1. des Folgemonats, 00:00 UTC).
 */
function getNextResetDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}
