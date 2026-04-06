// ============================================================
// Paddle Checkout Session erstellen
// POST /api/paddle/checkout
// Paddle ist Merchant of Record – VAT/Steuern automatisch
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getPlan } from "@/lib/paddle";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ai-conversion.ai";
const WA_FALLBACK = "mailto:hello@ai-conversion.ai";

interface CheckoutBody {
  plan: string;
  billing: string;
  email?: string;
  companyName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Paddle ist noch nicht konfiguriert.", fallback: WA_FALLBACK },
        { status: 503 }
      );
    }

    const body = (await req.json()) as CheckoutBody;

    const plan = getPlan(body.plan);
    if (!plan) {
      return NextResponse.json(
        { error: "Ungueltiger Plan. Erlaubt: starter, growth, professional" },
        { status: 400 }
      );
    }

    const isYearly = body.billing === "yearly";
    const recurringPriceId = isYearly ? plan.yearlyPriceId : plan.monthlyPriceId;

    if (!recurringPriceId) {
      return NextResponse.json(
        { error: "Paddle-Preise sind noch nicht konfiguriert.", fallback: WA_FALLBACK },
        { status: 503 }
      );
    }

    // Paddle API: Transaction erstellen fuer Checkout
    const isSandbox = process.env.PADDLE_ENVIRONMENT === "sandbox";
    const baseUrl = isSandbox
      ? "https://sandbox-api.paddle.com"
      : "https://api.paddle.com";

    const items = [
      { price_id: recurringPriceId, quantity: 1 },
    ];

    // Setup-Fee als separaten Preis hinzufuegen falls konfiguriert
    if (plan.setupPriceId) {
      items.push({ price_id: plan.setupPriceId, quantity: 1 });
    }

    const transactionBody: Record<string, unknown> = {
      items,
      checkout: {
        url: `${APP_URL}/onboarding?plan=${plan.slug}`,
      },
      custom_data: {
        plan: plan.slug,
        billing: isYearly ? "yearly" : "monthly",
        companyName: body.companyName || "",
      },
    };

    // E-Mail vorausfuellen falls angegeben
    if (body.email) {
      transactionBody.customer = { email: body.email };
    }

    const paddleRes = await fetch(`${baseUrl}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionBody),
    });

    const paddleData = await paddleRes.json();

    if (!paddleRes.ok) {
      console.error("[Paddle] Checkout-Fehler:", {
        status: paddleRes.status,
        error: paddleData.error?.detail || paddleData.error?.type || "Unbekannt",
      });
      return NextResponse.json(
        { error: "Fehler beim Erstellen der Checkout-Session", fallback: WA_FALLBACK },
        { status: 500 }
      );
    }

    const checkoutUrl = paddleData.data?.checkout?.url;
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "Keine Checkout-URL erhalten", fallback: WA_FALLBACK },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error("[Paddle] Checkout-Fehler:", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json(
      { error: "Interner Fehler", fallback: WA_FALLBACK },
      { status: 500 }
    );
  }
}
