// ============================================================
// Stripe Checkout Session erstellen
// POST /api/stripe/checkout
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getPlan } from "@/lib/stripe";
import Stripe from "stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ai-conversion.ai";

interface CheckoutBody {
  plan: string;
  billing: string;
  email?: string;
  companyName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: "Stripe ist noch nicht konfiguriert. Bitte kontaktieren Sie uns per E-Mail." },
        { status: 503 }
      );
    }

    const stripeClient = new Stripe(secretKey);
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

    if (!recurringPriceId || !plan.setupPriceId) {
      return NextResponse.json(
        { error: "Stripe-Preise sind noch nicht konfiguriert. Bitte kontaktieren Sie uns per E-Mail." },
        { status: 503 }
      );
    }

    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card", "sepa_debit"],
      ...(body.email && { customer_email: body.email }),
      line_items: [
        { price: recurringPriceId, quantity: 1 },
        { price: plan.setupPriceId, quantity: 1 },
      ],
      metadata: {
        plan: plan.slug,
        billing: isYearly ? "yearly" : "monthly",
        companyName: body.companyName || "",
      },
      subscription_data: {
        metadata: {
          plan: plan.slug,
          billing: isYearly ? "yearly" : "monthly",
        },
      },
      success_url: `${APP_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}&plan=${plan.slug}`,
      cancel_url: `${APP_URL}/pricing?canceled=true`,
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      locale: "de",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Stripe] Checkout-Fehler:", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Checkout-Session" },
      { status: 500 }
    );
  }
}
