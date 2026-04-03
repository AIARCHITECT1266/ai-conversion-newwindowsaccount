// ============================================================
// Tenant-Auflösung – Mandant anhand der WhatsApp Phone ID ermitteln
// Wird im Webhook genutzt, um eingehende Nachrichten dem
// richtigen Mandanten zuzuordnen.
// ============================================================

import { db } from "./db";

/**
 * Ermittelt den Mandanten anhand der WhatsApp Phone Number ID.
 * Gibt null zurück wenn kein aktiver Mandant gefunden wird.
 *
 * @param phoneNumberId - Die Phone Number ID aus der WhatsApp Cloud API
 */
export async function getTenantByPhoneId(phoneNumberId: string) {
  const tenant = await db.tenant.findUnique({
    where: {
      whatsappPhoneId: phoneNumberId,
      isActive: true,
    },
  });

  if (!tenant) {
    console.warn("[Tenant] Kein aktiver Mandant für Phone ID gefunden", {
      phoneNumberId,
    });
  }

  return tenant;
}
