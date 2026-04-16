// ============================================================
// Paddle Checkout Session erstellen
// POST /api/paddle/checkout
//
// DEAKTIVIERT 2026-04-16: Paddle-Application abgelehnt am
// 07.04.2026 (Kategorien "AI Chatbots" + "Marketing Software"
// ausserhalb Paddle Acceptable Use Policy). Founding-Phase
// laeuft ueber SEPA-Rechnung nach Demo-Call.
// Backend-Code bleibt fuer eventuelle spaetere Wiedernutzung.
// ============================================================

import { NextResponse } from "next/server";

const BOOKING_URL = "https://calendly.com/philipp-ai-conversion/30min";

export async function POST() {
  // DEAKTIVIERT 2026-04-16: Paddle-Application abgelehnt, Founding-Phase laeuft ueber SEPA
  return NextResponse.json(
    {
      error: "Checkout deaktiviert waehrend Pilotphase. Bitte Demo-Call buchen.",
      bookingUrl: BOOKING_URL,
    },
    { status: 503 }
  );
}
