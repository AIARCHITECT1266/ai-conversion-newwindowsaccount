// ============================================================
// Stripe Webhook Handler
// POST /api/stripe/webhook
// Verarbeitet: checkout.session.completed, subscription.*
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error("[Stripe Webhook] Keys nicht konfiguriert");
    return NextResponse.json({ error: "Webhook nicht konfiguriert" }, { status: 500 });
  }

  const stripeClient = new Stripe(secretKey);
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Keine Signatur" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signatur ungueltig:", {
      error: err instanceof Error ? err.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Ungueltige Signatur" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Fehler:", {
      eventType: event.type,
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Verarbeitung fehlgeschlagen" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const plan = session.metadata?.plan || "starter";
  const companyName = session.metadata?.companyName || "Neuer Kunde";
  const email = session.customer_email || session.customer_details?.email || "";

  const existing = await db.tenant.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (existing) {
    await db.tenant.update({
      where: { id: existing.id },
      data: {
        stripeSubscriptionId: subscriptionId,
        stripePlan: plan,
        stripeStatus: "active",
        isActive: true,
      },
    });
    console.log("[Stripe] Tenant aktualisiert:", { tenantId: existing.id, plan });
    return;
  }

  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || `tenant-${Date.now()}`;

  const dashboardToken = randomBytes(32).toString("hex");

  const tenant = await db.tenant.create({
    data: {
      name: companyName,
      slug: await ensureUniqueSlug(slug),
      whatsappPhoneId: `pending-${Date.now()}`,
      brandName: companyName,
      systemPrompt: "",
      dashboardToken,
      isActive: true,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePlan: plan,
      stripeStatus: "active",
      billingEmail: email,
    },
  });

  console.log("[Stripe] Neuer Tenant erstellt:", {
    tenantId: tenant.id,
    plan,
    slug: tenant.slug,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  const plan = subscription.metadata?.plan;

  const tenant = await db.tenant.findUnique({
    where: { stripeCustomerId: customerId },
  });
  if (!tenant) return;

  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      stripeStatus: status,
      ...(plan && { stripePlan: plan }),
      isActive: status === "active" || status === "trialing",
    },
  });
  console.log("[Stripe] Subscription aktualisiert:", { tenantId: tenant.id, status });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const tenant = await db.tenant.findUnique({
    where: { stripeCustomerId: customerId },
  });
  if (!tenant) return;

  await db.tenant.update({
    where: { id: tenant.id },
    data: { stripeStatus: "canceled", isActive: false },
  });
  console.log("[Stripe] Subscription gekuendigt:", { tenantId: tenant.id });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const tenant = await db.tenant.findUnique({
    where: { stripeCustomerId: customerId },
  });
  if (!tenant) return;

  await db.tenant.update({
    where: { id: tenant.id },
    data: { stripeStatus: "past_due" },
  });
  console.log("[Stripe] Zahlung fehlgeschlagen:", { tenantId: tenant.id });
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let counter = 0;
  while (true) {
    const exists = await db.tenant.findUnique({ where: { slug } });
    if (!exists) return slug;
    counter++;
    slug = `${base}-${counter}`;
  }
}
