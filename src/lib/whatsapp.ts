// ============================================================
// WhatsApp Cloud API – Nachrichten-Client
// Schritt 2: Textnachrichten senden über die offizielle API
// DSGVO-konform: Telefonnummern werden nur für den API-Aufruf
// verwendet und nicht geloggt oder gespeichert.
// ============================================================

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";

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

interface WhatsAppApiError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
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
      }
    );

    if (!response.ok) {
      const errorData = (await response.json()) as WhatsAppApiError;
      console.error("[WhatsApp] API-Fehler", {
        statusCode: response.status,
        errorCode: errorData.error.code,
        errorType: errorData.error.type,
        // DSGVO: Keine Telefonnummer im Log
      });

      return {
        success: false,
        error: `API-Fehler ${response.status}: ${errorData.error.message}`,
      };
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
  }
}
