import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { handleIncomingMessage } from "@/modules/bot/handler";
import { checkRateLimit, getClientIp } from "@/shared/rate-limit";
import { safeCompare } from "@/modules/auth/session";
import { db } from "@/shared/db";

// ============================================================
// WhatsApp Cloud API – Webhook Endpoint
// GET: Verifizierung für Meta
// POST: Eingehende Nachrichten → Handler → KI-Antwort
// DSGVO-konform: Keine personenbezogenen Daten im Log
// ============================================================

// Korrekte Env-Var-Namen (wie in CLAUDE.md dokumentiert)
const getVerifyToken = () => process.env.WHATSAPP_VERIFY_TOKEN;
const getAppSecret = () => process.env.WHATSAPP_APP_SECRET;

// Deduplizierung: Verarbeitete Message-IDs in DB speichern
// Löschung nach 24h via DSGVO-Cron (/api/cron/cleanup)
async function isDuplicate(messageId: string): Promise<boolean> {
  try {
    // Atomar: Erstellen schlägt fehl wenn messageId bereits existiert (unique constraint)
    await db.processedMessage.create({
      data: { messageId },
    });
    return false;
  } catch (error) {
    // Unique constraint violation = Duplikat
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return true;
    }
    // Bei DB-Fehler: Sicherheitshalber durchlassen (lieber doppelt als gar nicht)
    console.error("[WhatsApp Webhook] Deduplizierung-DB-Fehler", {
      messageId,
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return false;
  }
}

// ---------- Signatur-Validierung (Meta X-Hub-Signature-256) ----------
function verifySignature(rawBody: string, signature: string | null): boolean {
  const appSecret = getAppSecret();
  if (!appSecret || !signature) return false;

  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");

  // Timing-sicherer Vergleich gegen Timing-Attacken
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
}

// ---------- GET: Webhook-Verifizierung für Meta ----------
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = getVerifyToken();

  // Meta sendet diese drei Parameter zur Verifizierung
  if (mode === "subscribe" && verifyToken && token && safeCompare(token, verifyToken)) {
    console.log("[WhatsApp Webhook] Verifizierung erfolgreich");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[WhatsApp Webhook] Verifizierung fehlgeschlagen – ungültiger Token");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ---------- Typen für die WhatsApp Cloud API Payload ----------
interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface WhatsAppChange {
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    messages?: WhatsAppMessage[];
    statuses?: Array<{
      id: string;
      status: string;
      timestamp: string;
    }>;
  };
  field: string;
}

interface WhatsAppWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    changes: WhatsAppChange[];
  }>;
}

// ---------- POST: Eingehende Nachrichten verarbeiten ----------
export async function POST(request: NextRequest) {
  // Rate-Limiting: 100 Webhook-Calls pro Minute pro IP
  const ip = getClientIp(request);
  const limit = await checkRateLimit(`webhook:${ip}`, { max: 100, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const rawBody = await request.text();

    // Signatur-Validierung ist Pflicht – ohne APP_SECRET kein Webhook-Betrieb
    if (!getAppSecret()) {
      console.error("[WhatsApp Webhook] WHATSAPP_APP_SECRET nicht konfiguriert");
      return NextResponse.json({ error: "Webhook nicht konfiguriert" }, { status: 500 });
    }

    const signature = request.headers.get("x-hub-signature-256");
    if (!verifySignature(rawBody, signature)) {
      console.warn("[WhatsApp Webhook] Ungültige Signatur");
      return NextResponse.json({ error: "Ungültige Signatur" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as WhatsAppWebhookBody;

    // Nur WhatsApp-Business-Account Events verarbeiten
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Unbekanntes Event" }, { status: 404 });
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        // Eingehende Textnachrichten an den Handler weiterleiten
        if (change.value.messages) {
          for (const message of change.value.messages) {
            // Duplikate ignorieren (WhatsApp sendet bei Timeout erneut)
            if (await isDuplicate(message.id)) {
              console.log("[WhatsApp Webhook] Duplikat uebersprungen", { messageId: message.id });
              continue;
            }

            // Nur Textnachrichten verarbeiten (Bilder, Audio etc. später)
            if (message.type !== "text" || !message.text?.body) {
              console.log("[WhatsApp Webhook] Nicht-Text-Nachricht übersprungen", {
                messageId: message.id,
                type: message.type,
              });
              continue;
            }

            console.log("[WhatsApp Webhook] Nachricht empfangen", {
              messageId: message.id,
              type: message.type,
              phoneNumberId: change.value.metadata.phone_number_id,
              // DSGVO: Keine Telefonnummer oder Inhalt loggen
            });

            // Handler aufrufen (async, blockiert nicht die Webhook-Antwort)
            handleIncomingMessage({
              phoneNumberId: change.value.metadata.phone_number_id,
              from: message.from,
              messageId: message.id,
              text: message.text.body,
              timestamp: message.timestamp,
            }).catch((error) => {
              console.error("[WhatsApp Webhook] Handler-Fehler", {
                messageId: message.id,
                error: error instanceof Error ? error.message : "Unbekannt",
              });
            });
          }
        }

        // Status-Updates (zugestellt, gelesen, etc.)
        if (change.value.statuses) {
          for (const status of change.value.statuses) {
            console.log("[WhatsApp Webhook] Status-Update", {
              messageId: status.id,
              status: status.status,
              timestamp: status.timestamp,
            });
          }
        }
      }
    }

    // Meta erwartet immer 200 OK als Bestätigung
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook] Fehler bei der Verarbeitung", {
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
