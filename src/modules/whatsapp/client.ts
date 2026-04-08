// ============================================================
// WhatsApp Cloud API – Nachrichten-Client
// Textnachrichten senden über die offizielle Meta API
// DSGVO-konform: Telefonnummern werden nur für den API-Aufruf
// verwendet und nicht geloggt oder gespeichert.
// ============================================================

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";
const MAX_MESSAGE_LENGTH = 4096; // WhatsApp-Limit für Textnachrichten
const SEND_TIMEOUT_MS = 15_000; // 15 Sekunden Timeout

// ---------- Typen ----------

interface WhatsAppTextMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "text";
  text: {
    preview_url: boolean;
    body: string;
  };
}

interface WhatsAppApiResponse {
  messaging_product: string;
  contacts: Array<{ wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ---------- Konfiguration laden ----------

function getConfig() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    throw new Error(
      "[WhatsApp] Fehlende Umgebungsvariablen: WHATSAPP_TOKEN und WHATSAPP_PHONE_ID müssen gesetzt sein"
    );
  }

  return { token, phoneId };
}

// ---------- Textnachricht senden ----------

/**
 * Sendet eine Textnachricht über die WhatsApp Cloud API.
 *
 * @param to - Empfänger-Telefonnummer im internationalen Format (z.B. "4915123456789")
 * @param body - Nachrichtentext (max. 4096 Zeichen)
 * @param phoneNumberId - Tenant-spezifische Phone Number ID (Multi-Tenant)
 * @returns Ergebnis mit Message-ID bei Erfolg oder Fehlermeldung
 */
export async function sendMessage(
  to: string,
  body: string,
  phoneNumberId?: string
): Promise<SendMessageResult> {
  const { token, phoneId: defaultPhoneId } = getConfig();
  const phoneId = phoneNumberId || defaultPhoneId;

  // Nachrichtenlänge validieren
  if (body.length > MAX_MESSAGE_LENGTH) {
    console.warn("[WhatsApp] Nachricht zu lang, wird abgeschnitten", {
      originalLength: body.length,
      maxLength: MAX_MESSAGE_LENGTH,
    });
    body = body.slice(0, MAX_MESSAGE_LENGTH);
  }

  const payload: WhatsAppTextMessage = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body,
    },
  };

  // Timeout: 15 Sekunden
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      // Sichere Fehler-Extraktion mit Optional-Chaining
      let errorMessage = `API-Fehler ${response.status}`;
      try {
        const errorData = await response.json();
        const apiError = errorData?.error;
        if (apiError?.message) {
          errorMessage = `API-Fehler ${response.status}: ${apiError.message}`;
        }
        console.error("[WhatsApp] API-Fehler", {
          statusCode: response.status,
          errorCode: apiError?.code,
          errorType: apiError?.type,
          // DSGVO: Keine Telefonnummer im Log
        });
      } catch {
        console.error("[WhatsApp] API-Fehler (kein JSON)", {
          statusCode: response.status,
        });
      }

      return { success: false, error: errorMessage };
    }

    const data = (await response.json()) as WhatsAppApiResponse;
    const messageId = data.messages[0]?.id;

    console.log("[WhatsApp] Nachricht gesendet", {
      messageId,
      // DSGVO: Nur Message-ID loggen, keine Empfängerdaten
    });

    return { success: true, messageId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unbekannter Fehler";

    console.error("[WhatsApp] Sendefehler", { error: errorMessage });

    return { success: false, error: errorMessage };
  } finally {
    clearTimeout(timeout);
  }
}
