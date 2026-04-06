// ============================================================
// Paddle Webhook Handler
// POST /api/paddle/webhook
// Verarbeitet: transaction.completed, subscription.*
// Paddle ist Merchant of Record – kuemmert sich um VAT
// HMAC-SHA256 Signaturverifizierung mit PADDLE_WEBHOOK_SECRET
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes, createHmac, timingSafeEqual } from "crypto";
import { Resend } from "resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ai-conversion.ai";

// Paddle Webhook-Signatur verifizieren (HMAC-SHA256)
// Paddle sendet Header: paddle-signature mit Format: ts=TIMESTAMP;h1=HASH
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const parts = signature.split(";");
  const tsStr = parts.find(p => p.startsWith("ts="))?.slice(3);
  const h1 = parts.find(p => p.startsWith("h1="))?.slice(3);

  if (!tsStr || !h1) return false;

  const signedPayload = `${tsStr}:${rawBody}`;
  const expectedHmac = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(h1), Buffer.from(expectedHmac));
  } catch {
    return false;
  }
}

// Typen fuer Paddle Events
interface PaddleCustomData {
  plan?: string;
  billing?: string;
  companyName?: string;
}

interface PaddleEvent {
  event_type: string;
  data: {
    id: string;
    customer_id?: string;
    subscription_id?: string;
    status?: string;
    custom_data?: PaddleCustomData;
    customer?: {
      id: string;
      email: string;
    };
    billing_details?: {
      email?: string;
    };
  };
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Paddle Webhook] PADDLE_WEBHOOK_SECRET nicht konfiguriert");
    return NextResponse.json({ error: "Webhook nicht konfiguriert" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature") || "";

  if (!verifySignature(rawBody, signature, webhookSecret)) {
    console.error("[Paddle Webhook] Signatur ungueltig");
    return NextResponse.json({ error: "Ungueltige Signatur" }, { status: 400 });
  }

  let event: PaddleEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Ungueltiger JSON-Body" }, { status: 400 });
  }

  try {
    switch (event.event_type) {
      case "transaction.completed":
        await handleTransactionCompleted(event);
        break;
      case "subscription.activated":
        await handleSubscriptionActivated(event);
        break;
      case "subscription.canceled":
        await handleSubscriptionCanceled(event);
        break;
      case "subscription.past_due":
        await handleSubscriptionPastDue(event);
        break;
      default:
        console.log("[Paddle Webhook] Unbehandeltes Event:", { type: event.event_type });
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Paddle Webhook] Fehler:", {
      eventType: event.event_type,
      error: error instanceof Error ? error.message : "Unbekannt",
    });
    return NextResponse.json({ error: "Verarbeitung fehlgeschlagen" }, { status: 500 });
  }
}

// ---------- transaction.completed: Tenant anlegen ----------
async function handleTransactionCompleted(event: PaddleEvent) {
  const customerId = event.data.customer?.id || event.data.customer_id || "";
  const subscriptionId = event.data.subscription_id || "";
  const plan = event.data.custom_data?.plan || "starter";
  const companyName = event.data.custom_data?.companyName || "Neuer Kunde";
  const email = event.data.customer?.email || event.data.billing_details?.email || "";

  if (!customerId) {
    console.warn("[Paddle] Keine Customer-ID in transaction.completed");
    return;
  }

  // Pruefen ob Tenant schon existiert
  const existing = await db.tenant.findUnique({
    where: { paddleCustomerId: customerId },
  });

  if (existing) {
    await db.tenant.update({
      where: { id: existing.id },
      data: {
        paddleSubscriptionId: subscriptionId,
        paddlePlan: plan,
        paddleStatus: "active",
        isActive: true,
      },
    });
    console.log("[Paddle] Tenant aktualisiert:", { tenantId: existing.id, plan });
    return;
  }

  // Neuen Tenant anlegen
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
      paddleCustomerId: customerId,
      paddleSubscriptionId: subscriptionId,
      paddlePlan: plan,
      paddleStatus: "active",
      billingEmail: email,
    },
  });

  console.log("[Paddle] Neuer Tenant erstellt:", {
    tenantId: tenant.id,
    plan,
    slug: tenant.slug,
  });

  // Magic-Link per Resend E-Mail senden
  if (email) {
    await sendWelcomeEmail(email, companyName, dashboardToken, plan);
  }
}

// ---------- subscription.activated: Tenant aktivieren ----------
async function handleSubscriptionActivated(event: PaddleEvent) {
  const customerId = event.data.customer?.id || event.data.customer_id || "";
  const tenant = await db.tenant.findUnique({
    where: { paddleCustomerId: customerId },
  });
  if (!tenant) return;

  await db.tenant.update({
    where: { id: tenant.id },
    data: { paddleStatus: "active", isActive: true },
  });
  console.log("[Paddle] Subscription aktiviert:", { tenantId: tenant.id });
}

// ---------- subscription.canceled: Tenant deaktivieren ----------
async function handleSubscriptionCanceled(event: PaddleEvent) {
  const customerId = event.data.customer?.id || event.data.customer_id || "";
  const tenant = await db.tenant.findUnique({
    where: { paddleCustomerId: customerId },
  });
  if (!tenant) return;

  await db.tenant.update({
    where: { id: tenant.id },
    data: { paddleStatus: "canceled", isActive: false },
  });
  console.log("[Paddle] Subscription gekuendigt:", { tenantId: tenant.id });
}

// ---------- subscription.past_due: Warnung ----------
async function handleSubscriptionPastDue(event: PaddleEvent) {
  const customerId = event.data.customer?.id || event.data.customer_id || "";
  const tenant = await db.tenant.findUnique({
    where: { paddleCustomerId: customerId },
  });
  if (!tenant) return;

  await db.tenant.update({
    where: { id: tenant.id },
    data: { paddleStatus: "past_due" },
  });
  console.log("[Paddle] Zahlung ueberfaellig:", { tenantId: tenant.id });
}

// ---------- Willkommens-E-Mail mit Magic-Link ----------
async function sendWelcomeEmail(
  email: string,
  companyName: string,
  dashboardToken: string,
  plan: string,
) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log("[Paddle] RESEND_API_KEY nicht konfiguriert, ueberspringe E-Mail");
    return;
  }

  const resend = new Resend(resendKey);
  const dashboardUrl = `${APP_URL}/dashboard/login?token=${dashboardToken}`;
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);

  try {
    await resend.emails.send({
      from: "AI Conversion <noreply@ai-conversion.ai>",
      to: email,
      subject: `Willkommen bei AI Conversion – ${planName} Plan`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a1a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
          <h1 style="color: #C9A84C; font-size: 24px;">Willkommen bei AI Conversion!</h1>
          <p style="margin-top: 16px; line-height: 1.6;">
            Hallo ${companyName},<br><br>
            Ihr <strong>${planName} Plan</strong> ist jetzt aktiv.
            Klicken Sie auf den Button um Ihr Dashboard zu oeffnen und den Onboarding-Wizard zu starten.
          </p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #C9A84C, #a8893a); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Dashboard oeffnen
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 32px;">
            Dieser Link ist Ihr persoenlicher Zugang. Teilen Sie ihn nicht mit anderen.<br>
            Bei Fragen: hello@ai-conversion.ai
          </p>
        </div>
      `,
    });
    console.log("[Paddle] Willkommens-E-Mail gesendet");
  } catch (error) {
    console.error("[Paddle] E-Mail-Versand fehlgeschlagen:", {
      error: error instanceof Error ? error.message : "Unbekannt",
    });
  }
}

// Eindeutigen Slug sicherstellen
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
