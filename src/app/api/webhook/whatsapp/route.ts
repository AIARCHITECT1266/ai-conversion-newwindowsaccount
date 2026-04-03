import { NextRequest, NextResponse } from "next/server";

// ============================================================
// WhatsApp Cloud API – Webhook Endpoint
// Schritt 1: Verifizierung & strukturiertes Logging
// DSGVO-konform: Keine personenbezogenen Daten (Telefonnummern,
// Nachrichteninhalte) werden geloggt – nur Message-IDs und Timestamps.
// ============================================================

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

// ---------- GET: Webhook-Verifizierung für Meta ----------
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Meta sendet diese drei Parameter zur Verifizierung
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verifizierung erfolgreich");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[WhatsApp Webhook] Verifizierung fehlgeschlagen – ungültiger Token");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ---------- Typen für die WhatsApp Cloud API Payload ----------
interface WhatsAppMessage {
  id: string;
  timestamp: string;
  type: string;
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

// ---------- POST: Eingehende Nachrichten empfangen ----------
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WhatsAppWebhookBody;

    // Nur WhatsApp-Business-Account Events verarbeiten
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Unbekanntes Event" }, { status: 404 });
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        // Eingehende Nachrichten verarbeiten (DSGVO-konform: nur IDs + Timestamps)
        if (change.value.messages) {
          for (const message of change.value.messages) {
            console.log("[WhatsApp Webhook] Nachricht empfangen", {
              messageId: message.id,
              timestamp: message.timestamp,
              type: message.type,
              phoneNumberId: change.value.metadata.phone_number_id,
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
