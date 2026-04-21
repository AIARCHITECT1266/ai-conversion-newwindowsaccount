// ============================================================
// POST /api/admin/demo-seed/mod-education
//
// Seedet 8 fiktive Demo-Leads in den Tenant
// "mod-education-demo-b2c" (Mara-B2C). Admin-auth via
// Middleware, hartkodierter Tenant-Slug.
//
// Idempotent: Bestehende Demo-Leads (externalId beginnt mit
// "demo-seed-") werden zuerst geloescht, dann neu angelegt.
// Andere Leads (echte Chat-Sessions) bleiben unveraendert.
//
// Dieser Endpoint ist bewusst MOD-spezifisch, damit er keinen
// generischen Missbrauchs-Vektor fuer Mass-Seeding liefert.
// Bei neuen Demo-Tenants wird er fuer diese generalisiert.
// Ein langfristiger Refactor (TD-Pilot-XX) kann daraus eine
// generische Demo-Seed-Infrastruktur machen.
// ============================================================

import { NextResponse } from "next/server";
import { encryptText } from "@/modules/encryption/aes";
import { auditLog } from "@/modules/compliance/audit-log";
import { db } from "@/shared/db";
import { MOD_DEMO_LEADS, type DemoLead } from "./demo-leads.data";

const TARGET_SLUG = "mod-education-demo-b2c";

// Hilfsfunktion: Berechnet einen Zeitpunkt in der Vergangenheit.
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// Erstellt die Messages-Sub-Records fuer einen Demo-Lead.
// Rueckgabe: letzter Message-Timestamp (fuer conversation.updatedAt).
async function createDemoConversation(
  tenantId: string,
  lead: DemoLead,
): Promise<void> {
  const conversationStart = daysAgo(lead.createdAtDaysAgo);
  const lastMsg = lead.messages[lead.messages.length - 1];
  const lastMessageAt = new Date(
    conversationStart.getTime() + lastMsg.minutesAfterStart * 60 * 1000,
  );

  // Conversation anlegen — externalId als Idempotenz-Marker.
  // channel=WEB fuer das Widget-Szenario, consent als erteilt
  // markiert (Demo, keine echte Nutzer-Interaktion).
  const conversation = await db.conversation.create({
    data: {
      tenantId,
      externalId: `demo-seed-${lead.slug}`,
      channel: "WEB",
      consentGiven: true,
      consentAt: conversationStart,
      language: "de",
      leadSource: "demo-seed",
      status: "ACTIVE",
      widgetSessionToken: `ws_demo_${lead.slug}_${Date.now()}`,
      widgetVisitorMeta: {
        source: "demo-seed",
        displayName: lead.displayName,
        age: lead.age,
        course: lead.course,
      },
      createdAt: conversationStart,
      updatedAt: lastMessageAt,
    },
  });

  // Messages: sequentiell erstellen, damit die Reihenfolge + Timestamps
  // stimmen. Content wird verschluesselt gespeichert (gleiche Regel wie
  // fuer echte Nachrichten in processMessage.ts).
  for (const msg of lead.messages) {
    const timestamp = new Date(
      conversationStart.getTime() + msg.minutesAfterStart * 60 * 1000,
    );
    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: msg.role,
        contentEncrypted: encryptText(msg.content),
        messageType: "TEXT",
        timestamp,
      },
    });
  }

  // Lead-Record: vorgesetzter Score/Qualification/Pipeline + vorgefuelltes
  // aiSummary und predictiveScore. Kein GPT-/Claude-Call noetig.
  await db.lead.create({
    data: {
      tenantId,
      conversationId: conversation.id,
      score: lead.score,
      qualification: lead.qualification,
      status: lead.pipelineStatus === "GEWONNEN" ? "CONVERTED" : "NEW",
      pipelineStatus: lead.pipelineStatus,
      source: "demo-seed",
      aiSummary: JSON.stringify(lead.aiSummary),
      aiSummaryAt: new Date(),
      predictiveScore: JSON.stringify(lead.prediction),
      predictiveScoreAt: new Date(),
      createdAt: conversationStart,
    },
  });
}

// GET-Handler: diagnostische Read-only-Sicht auf den aktuellen
// Zustand der Demo-Leads. Gibt pro Demo-Conversation externalId +
// displayName aus widgetVisitorMeta zurueck, ohne den Raw-JSON komplett
// zu exponieren. Dient der Verifikation, dass der Seed die erwarteten
// Namen in der DB persistiert hat. Kein widgetVisitorMeta-Leak, nur
// das abgeleitete Feld.
export async function GET() {
  const tenant = await db.tenant.findUnique({
    where: { slug: TARGET_SLUG },
    select: { id: true, slug: true },
  });

  if (!tenant) {
    return NextResponse.json(
      { error: `Tenant "${TARGET_SLUG}" existiert nicht.` },
      { status: 400 },
    );
  }

  const demoConvs = await db.conversation.findMany({
    where: {
      tenantId: tenant.id,
      externalId: { startsWith: "demo-seed-" },
    },
    orderBy: { externalId: "asc" },
    select: {
      externalId: true,
      widgetVisitorMeta: true,
      lead: { select: { score: true } },
    },
  });

  const items = demoConvs.map((c) => {
    const meta =
      c.widgetVisitorMeta && typeof c.widgetVisitorMeta === "object"
        ? (c.widgetVisitorMeta as Record<string, unknown>)
        : {};
    return {
      externalId: c.externalId,
      displayName: typeof meta.displayName === "string" ? meta.displayName : null,
      displayNameLength:
        typeof meta.displayName === "string" ? meta.displayName.length : 0,
      age: typeof meta.age === "number" ? meta.age : null,
      score: c.lead?.score ?? null,
    };
  });

  return NextResponse.json({
    tenantSlug: tenant.slug,
    count: items.length,
    items,
  });
}

export async function POST() {
  // Ziel-Tenant auflösen (hartkodiert fuer MOD-Demo)
  const tenant = await db.tenant.findUnique({
    where: { slug: TARGET_SLUG },
    select: { id: true, name: true, slug: true },
  });

  if (!tenant) {
    return NextResponse.json(
      {
        error: `Tenant "${TARGET_SLUG}" existiert nicht. Bitte zuerst im Admin-Panel anlegen.`,
      },
      { status: 400 },
    );
  }

  // Idempotenz: alte Demo-Conversations loeschen (Cascade entfernt
  // messages + lead + client). Keine Auswirkung auf echte Chats,
  // weil externalId-Prefix "demo-seed-" exklusiv fuer diesen Seed.
  const deleted = await db.conversation.deleteMany({
    where: {
      tenantId: tenant.id,
      externalId: { startsWith: "demo-seed-" },
    },
  });

  // Neue Demo-Leads anlegen
  let created = 0;
  const summary: Array<{ name: string; score: number; qualification: string }> = [];
  for (const demo of MOD_DEMO_LEADS) {
    await createDemoConversation(tenant.id, demo);
    created++;
    summary.push({
      name: demo.displayName,
      score: demo.score,
      qualification: demo.qualification,
    });
  }

  auditLog("admin.demo_seed_mod_education", {
    tenantId: tenant.id,
    details: { deleted: deleted.count, created },
  });

  return NextResponse.json({
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    deleted: deleted.count,
    created,
    leads: summary,
  });
}
