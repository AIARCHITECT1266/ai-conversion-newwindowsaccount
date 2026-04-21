// ============================================================
// GET /api/dashboard/export – DSGVO Art. 20 Datenportabilitaet
// Exportiert alle tenant-spezifischen Daten als JSON-Download.
// Rate-Limit: 1 Export pro Stunde pro Tenant via Upstash Redis.
// ============================================================

import { NextResponse } from "next/server";
import { getDashboardTenant } from "@/modules/auth/dashboard-auth";
import { db } from "@/shared/db";
import { decryptText } from "@/modules/encryption/aes";
import { checkRateLimit } from "@/shared/rate-limit";
import { auditLog } from "@/modules/compliance/audit-log";

function safeDecrypt(encrypted: string): string {
  try {
    return decryptText(encrypted);
  } catch {
    return "[verschlüsselt]";
  }
}

export async function GET() {
  const tenant = await getDashboardTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Rate-Limit: max 1 Export pro Stunde
  const rl = await checkRateLimit(`export:ratelimit:${tenant.id}`, {
    max: 1,
    windowMs: 3600 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Export nur einmal pro Stunde möglich", retryAfter: 3600 },
      { status: 429 }
    );
  }

  // Alle tenant-spezifischen Daten parallel laden
  const [tenantData, leads, conversations, clients] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenant.id },
      select: { id: true, name: true, brandName: true, createdAt: true },
    }),
    db.lead.findMany({
      where: { tenantId: tenant.id },
      select: {
        score: true,
        qualification: true,
        status: true,
        pipelineStatus: true,
        dealValue: true,
        notes: true,
        appointmentAt: true,
        followUpCount: true,
        lastFollowUpAt: true,
        aiSummary: true,
        aiSummaryAt: true,
        predictiveScore: true,
        predictiveScoreAt: true,
        source: true,
        abTestVariant: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    db.conversation.findMany({
      where: { tenantId: tenant.id },
      select: {
        externalId: true,
        status: true,
        consentGiven: true,
        consentAt: true,
        createdAt: true,
        messages: {
          select: {
            role: true,
            contentEncrypted: true,
            messageType: true,
            timestamp: true,
          },
          orderBy: { timestamp: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    db.client.findMany({
      where: { tenantId: tenant.id },
      select: {
        companyName: true,
        contactName: true,
        status: true,
        notes: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);

  // Nachrichten entschluesseln
  const conversationsExport = conversations.map((c) => ({
    externalId: c.externalId,
    status: c.status,
    consentGiven: c.consentGiven,
    consentAt: c.consentAt,
    createdAt: c.createdAt,
    messages: c.messages.map((m) => ({
      role: m.role,
      content: safeDecrypt(m.contentEncrypted),
      messageType: m.messageType,
      timestamp: m.timestamp,
    })),
  }));

  const today = new Date().toISOString().slice(0, 10);

  const exportData = {
    exportDate: new Date().toISOString(),
    tenant: tenantData,
    leads,
    conversations: conversationsExport,
    clients,
  };

  auditLog("gdpr.data_export", {
    tenantId: tenant.id,
    details: {
      leadCount: leads.length,
      conversationCount: conversations.length,
      clientCount: clients.length,
    },
  });

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="ai-conversion-export-${today}.json"`,
    },
  });
}
